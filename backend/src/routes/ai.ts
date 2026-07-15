import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { getTrialById } from '../db/trials.js'
import { validateBody } from '../lib/validation.js'
import { sendAiError } from '../lib/aiResponse.js'
import { requireUser } from '../middleware/identity.js'
import { llm } from '../ai/llm.js'
import type { EligibilityResult, PostEnhancement, Trial } from '../types.js'

// AI smart features (seminar 6). Every route goes through the shared LLM
// abstraction (`llm`) — never the OpenAI SDK directly — validates its JSON
// output, and degrades gracefully (calm 502) when AI is down. Every response
// is informational only; final eligibility is the investigators' call.

export const aiRouter = Router()

// ---- POST /ai/eligibility-check --------------------------------------------
// Informational Likely / Possibly / Unlikely estimate comparing the user's
// self-reported details against a trial's criteria. Advisory and NOT stored.

const eligibilityInputSchema = z.object({
  trial_id: z.string().min(1),
  age: z.number().int().min(1).max(129),
  gender: z.enum(['female', 'male', 'other', 'prefer not to say']),
  condition: z.string().trim().min(1),
  treatment: z.string().optional(),
})

// The shape the LLM must return — mirrors the `EligibilityResult` type so the
// API and frontend stay in lockstep (the `satisfies` check enforces it).
const eligibilityResultSchema = z.object({
  verdict: z.enum(['likely', 'possibly', 'unlikely']),
  headline: z.string(),
  matches: z.array(z.string()),
  gaps: z.array(z.string()),
  note: z.string(),
}) satisfies z.ZodType<EligibilityResult>

const ELIGIBILITY_SYSTEM_PROMPT =
  "You are ClinicalMatch's eligibility assistant. You compare a patient's " +
  "self-reported details against a clinical trial's inclusion and exclusion " +
  'criteria and return an INFORMATIONAL estimate only — never medical advice, ' +
  'never a decision; final eligibility is decided by the trial investigators. ' +
  'Reply with JSON only, matching the schema. Rules: base the verdict ONLY on ' +
  'the provided criteria and answers; if key information is missing or ' +
  'ambiguous, default to `possibly` — never guess `likely` or `unlikely` ' +
  'without support. `matches` = criteria the person appears to meet; `gaps` = ' +
  'things still to confirm with the study team. Keep language plain, calm, and ' +
  'non-alarming. Always set `note` to the informational-only disclaimer.'

function criteriaBlock(label: string, items: string[]): string {
  if (items.length === 0) return `${label}:\n- (none provided)`
  return `${label}:\n${items.map((c) => `- ${c}`).join('\n')}`
}

function buildEligibilityPrompt(
  trial: Trial,
  input: z.infer<typeof eligibilityInputSchema>
): string {
  return [
    `Trial: ${trial.title}`,
    `Disease area: ${trial.disease}`,
    `Recruitment status: ${trial.status}`,
    '',
    criteriaBlock('Inclusion criteria', trial.inclusion_criteria),
    '',
    criteriaBlock('Exclusion criteria', trial.exclusion_criteria),
    '',
    "Patient's self-reported details:",
    `- Age: ${input.age}`,
    `- Gender: ${input.gender}`,
    `- Diagnosed condition: ${input.condition}`,
    `- Current treatment: ${input.treatment ?? 'not provided'}`,
  ].join('\n')
}

aiRouter.post(
  '/eligibility-check',
  validateBody(eligibilityInputSchema),
  async (req: Request, res: Response) => {
    const input = req.body as z.infer<typeof eligibilityInputSchema>
    const trial = getTrialById(input.trial_id)
    if (!trial) {
      res.status(404).json({ error: 'Trial not found' })
      return
    }
    try {
      const result = await llm.completeJSON<EligibilityResult>({
        system: ELIGIBILITY_SYSTEM_PROMPT,
        user: buildEligibilityPrompt(trial, input),
        schema: eligibilityResultSchema,
        schemaName: 'eligibility_result',
        temperature: 0.2,
        maxTokens: 700,
      })
      res.json(result)
    } catch (err) {
      sendAiError(res, err)
    }
  }
)

// ---- POST /ai/enhance-post -------------------------------------------------
// Optional AI polish for a community post: improves grammar/readability without
// changing meaning, suggests a title, a one-line summary and up to four tags.
// Suggestion only — the client can always publish as-is; it is never stored.

// The eight community tags the model may choose from.
const COMMUNITY_TAGS = [
  'Treatment',
  'Clinical Trials',
  'Side Effects',
  'Nutrition',
  'Mental Health',
  'Caregivers',
  'Success Stories',
  'Questions',
] as const

const enhancePostInputSchema = z.object({
  message: z.string().trim().min(1),
  title: z.string().optional(),
  groupName: z.string().trim().min(1),
})

// Mirrors the frontend `PostEnhancement`. No array-length keyword here: OpenAI
// strict Structured Outputs rejects maxItems, so we cap `tags` in code instead.
const postEnhancementSchema = z.object({
  title: z.string(),
  improvedContent: z.string(),
  tags: z.array(z.string()),
  summary: z.string(),
}) satisfies z.ZodType<PostEnhancement>

const ENHANCE_SYSTEM_PROMPT =
  'You help a patient polish a post for a peer-support health community. ' +
  'Improve grammar, clarity and readability WITHOUT changing the meaning, the ' +
  'facts or the first-person voice, and without adding claims or medical ' +
  'advice. Keep it warm and supportive. Produce: a concise `title` (use the ' +
  "user's title if given), an `improvedContent` draft, a one-sentence " +
  '`summary`, and up to 4 short `tags` chosen ONLY from this list: ' +
  COMMUNITY_TAGS.join(', ') +
  '. Reply with JSON only, matching the schema.'

aiRouter.post(
  '/enhance-post',
  requireUser,
  validateBody(enhancePostInputSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof enhancePostInputSchema>
    const user = [
      `Community: ${body.groupName}`,
      body.title ? `Draft title: ${body.title}` : 'Draft title: (none)',
      '',
      'Message:',
      body.message,
    ].join('\n')
    try {
      const result = await llm.completeJSON<PostEnhancement>({
        system: ENHANCE_SYSTEM_PROMPT,
        user,
        schema: postEnhancementSchema,
        schemaName: 'post_enhancement',
        temperature: 0.5,
        maxTokens: 500,
      })
      // Keep only known tags, capped at four (defensive — see schema note).
      const allowed = new Set<string>(COMMUNITY_TAGS)
      res.json({
        ...result,
        tags: result.tags.filter((t) => allowed.has(t)).slice(0, 4),
      })
    } catch (err) {
      sendAiError(res, err)
    }
  }
)
