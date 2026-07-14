import type {
  Disease,
  EligibilityResult,
  PlainCriteria,
  PostEnhancement,
  SelfCheckInput,
  Trial,
  TrialAnswer,
  TrialSummary,
} from '@/types'
import { MOCK_GROUPS, MOCK_NOTIFICATIONS, MOCK_TRIALS } from './data'

// ---------------------------------------------------------------------------
// Mock API. This is the ONLY place the UI "talks to a server" in this phase.
// Every function below is a `TODO: connect to API` seam: swap the body for a
// real fetch() and the shapes stay identical (see assignment/frontend.md).
// ---------------------------------------------------------------------------

const LATENCY_MS = 450

function delay<T>(value: T, ms = LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/** Escape hatch to demo error states without randomness: any AI input that
 *  contains this token forces the request to fail (retry-once then fallback). */
export const FAIL_TOKEN = 'FAILTEST'

function maybeFail(input: string): void {
  if (input.toUpperCase().includes(FAIL_TOKEN)) {
    throw new Error('Simulated AI failure')
  }
}

// ---- Pure, testable helpers ------------------------------------------------

/** Filter the catalogue by free-text query and disease. Exported for tests. */
export function filterTrials(
  trials: Trial[],
  query: string,
  disease: Disease | 'all'
): Trial[] {
  const q = query.trim().toLowerCase()
  return trials.filter((t) => {
    const matchesDisease = disease === 'all' || t.disease === disease
    if (!matchesDisease) return false
    if (!q) return true
    return (
      t.title.toLowerCase().includes(q) ||
      t.short_description.toLowerCase().includes(q) ||
      t.city.toLowerCase().includes(q) ||
      t.disease.toLowerCase().includes(q)
    )
  })
}

/**
 * Informational eligibility estimate. Mirrors the real prompt's rule: when a
 * key piece of information is missing or ambiguous, default to "possibly" and
 * never guess. Deterministic so the demo and tests are stable.
 * Exported for tests.
 */
export function computeVerdict(
  trial: Trial,
  input: SelfCheckInput
): EligibilityResult {
  const matches: string[] = []
  const gaps: string[] = []

  // Age vs any "aged X–Y" inclusion criterion.
  const ageRule = trial.inclusion_criteria.find((c) => /aged/i.test(c))
  const range = ageRule?.match(/(\d{2})\s*[–-]\s*(\d{2})/)
  let ageOk: boolean | null = null
  if (range) {
    const min = Number(range[1])
    const max = Number(range[2])
    ageOk = input.age >= min && input.age <= max
    if (ageOk) matches.push(`Your age (${input.age}) is within ${min}–${max}.`)
    else
      gaps.push(
        `This study asks for ages ${min}–${max}; you entered ${input.age}.`
      )
  } else if (ageRule) {
    matches.push('The study is open to adults, which appears to include you.')
  } else {
    gaps.push('No clear age range was found to compare against.')
  }

  // Condition match against the trial's disease.
  const condition = input.condition.trim().toLowerCase()
  const diseaseWords = trial.disease.toLowerCase().split(/\s+/)
  const conditionMatches =
    condition.length > 0 &&
    diseaseWords.some((w) => w.length > 3 && condition.includes(w))
  if (conditionMatches) {
    matches.push(`Your condition seems related to ${trial.disease}.`)
  } else if (condition.length > 0) {
    gaps.push(
      `We couldn't clearly match "${input.condition}" to this ${trial.disease} study.`
    )
  }

  const closed = trial.status === 'closed' || trial.status === 'completed'
  if (closed) {
    gaps.push('This study is not currently recruiting.')
  }

  let verdict: EligibilityResult['verdict']
  if (
    ageOk === false ||
    (condition.length > 0 && !conditionMatches) ||
    closed
  ) {
    // A clear mismatch → unlikely (shown in neutral grey, never red).
    verdict = 'unlikely'
  } else if (ageOk === true && conditionMatches && gaps.length === 0) {
    verdict = 'likely'
  } else {
    // Missing/ambiguous information → default to possibly, never guess.
    verdict = 'possibly'
  }

  const headline =
    verdict === 'likely'
      ? 'You appear to meet the main criteria we could check.'
      : verdict === 'unlikely'
        ? 'Based on what you shared, this study may not be a match.'
        : 'You may be a match — some details need confirming.'

  return {
    verdict,
    headline,
    matches,
    gaps,
    note: 'Informational only — not medical advice. Final eligibility is decided by the trial investigators.',
  }
}

// ---- Reads -----------------------------------------------------------------

export const api = {
  async getTrials(params?: {
    query?: string
    disease?: Disease | 'all'
  }): Promise<Trial[]> {
    // TODO: connect to API — GET /trials?query=&disease=
    const result = filterTrials(
      MOCK_TRIALS,
      params?.query ?? '',
      params?.disease ?? 'all'
    )
    return delay(result)
  },

  async getTrial(id: string): Promise<Trial | null> {
    // TODO: connect to API — GET /trials/:id
    return delay(MOCK_TRIALS.find((t) => t.id === id) ?? null)
  },

  async getGroups() {
    // TODO: connect to API — GET /groups
    return delay(MOCK_GROUPS)
  },

  async getNotifications() {
    // TODO: connect to API — GET /notifications
    return delay(MOCK_NOTIFICATIONS)
  },

  // ---- AI features (validated JSON in the real backend) --------------------

  async summariseTrial(trialId: string): Promise<TrialSummary> {
    // TODO: connect to API — POST /ai/summary { trial_id }
    const trial = mustTrial(trialId)
    await delay(null, 700)
    maybeFail(trial.full_description)
    return {
      purpose: `This study looks at ${trial.title.replace(/\s*\(.*\)\s*$/, '')} to learn whether it helps people with ${trial.disease}.`,
      targetPatients: `Adults with ${trial.disease}${
        /aged/i.test(trial.inclusion_criteria[0] ?? '')
          ? `, ${trial.inclusion_criteria[0].toLowerCase()}`
          : ''
      }.`,
      benefits:
        'Taking part may give access to close monitoring and contributes to research. Benefits are not guaranteed.',
      requirements: `Attending the study centre in ${trial.city} for visits and check-ups over the study period.`,
    }
  },

  async explainCriteria(trialId: string): Promise<PlainCriteria> {
    // TODO: connect to API — POST /ai/criteria { trial_id }
    const trial = mustTrial(trialId)
    await delay(null, 650)
    maybeFail(trial.inclusion_criteria.join(' '))
    return {
      canJoin: trial.inclusion_criteria.map(plainify),
      cannotJoin: trial.exclusion_criteria.map(plainify),
    }
  },

  async selfCheck(input: SelfCheckInput): Promise<EligibilityResult> {
    // TODO: connect to API — POST /ai/self-check { trial_id, age, gender, ... }
    const trial = mustTrial(input.trial_id)
    await delay(null, 800)
    maybeFail(input.condition + ' ' + (input.treatment ?? ''))
    return computeVerdict(trial, input)
  },

  async askTrial(trialId: string, question: string): Promise<TrialAnswer> {
    // TODO: connect to API — POST /ai/ask { trial_id, question }  (RAG)
    const trial = mustTrial(trialId)
    await delay(null, 750)
    maybeFail(question)
    const q = question.toLowerCase()
    const hit = [...trial.inclusion_criteria, ...trial.exclusion_criteria].find(
      (c) =>
        q.split(/\W+/).some((w) => w.length > 3 && c.toLowerCase().includes(w))
    )
    if (!hit) {
      return {
        answer:
          'The protocol doesn’t appear to cover this specific point. It’s a good question to raise with the study team.',
        citedSection: 'Not found in this trial’s text',
        note: 'Informational only — not medical advice. Based only on this trial’s published text.',
      }
    }
    const isExclusion = trial.exclusion_criteria.includes(hit)
    return {
      answer: isExclusion
        ? `This study lists "${hit}" as something that may rule a person out. Please confirm your situation with the study team.`
        : `This study lists "${hit}" among the criteria to take part. The study team can confirm whether you qualify.`,
      citedSection: isExclusion ? 'Exclusion criteria' : 'Inclusion criteria',
      note: 'Informational only — not medical advice. Based only on this trial’s published text.',
    }
  },

  async enhancePost(draft: {
    title?: string
    message: string
    groupName: string
  }): Promise<PostEnhancement> {
    // TODO: connect to API — POST /ai/enhance-post { title, message, group }
    await delay(null, 700)
    maybeFail(draft.message + ' ' + (draft.title ?? ''))
    const firstLine = draft.message.split('\n')[0].slice(0, 60)
    return {
      title:
        draft.title?.trim() || capitalise(firstLine) || 'A note to the group',
      improvedContent: draft.message.trim(),
      tags: suggestTags(draft.message, draft.groupName),
      summary: `A member of ${draft.groupName} shares: ${firstLine}${
        draft.message.length > 60 ? '…' : ''
      }`,
    }
  },
}

// ---- internal helpers ------------------------------------------------------

function mustTrial(id: string): Trial {
  const trial = MOCK_TRIALS.find((t) => t.id === id)
  if (!trial) throw new Error(`Unknown trial: ${id}`)
  return trial
}

function plainify(criterion: string): string {
  // A light touch — the real feature rewrites via the model.
  return criterion.replace(/\bBMI\b/g, 'body mass index')
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function suggestTags(message: string, groupName: string): string[] {
  const tags = new Set<string>()
  const m = message.toLowerCase()
  if (/new|diagnos/.test(m)) tags.add('newly diagnosed')
  if (/trial|study/.test(m)) tags.add('clinical trials')
  if (/tired|fatigue|energy/.test(m)) tags.add('fatigue')
  if (/thank|grateful|win|progress/.test(m)) tags.add('wins')
  if (tags.size === 0) tags.add('support')
  tags.add(groupName.split(' ')[0].toLowerCase())
  return [...tags].slice(0, 4)
}
