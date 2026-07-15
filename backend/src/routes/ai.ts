import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { getTrialById } from '../db/trials.js'
import { validateBody } from '../lib/validation.js'
import { sendAiError } from '../lib/aiResponse.js'
import { llm } from '../ai/llm.js'
import type { EligibilityResult, Trial } from '../types.js'

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
