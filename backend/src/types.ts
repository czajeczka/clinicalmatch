// Domain types for the API. Mirror the frontend shapes (frontend/src/types.ts)
// so responses drop in without UI changes. AI-only types are intentionally
// omitted — those features are deferred (seminar 6).

export const DISEASES = [
  'Breast Cancer',
  'Type 2 Diabetes',
  'Rheumatoid Arthritis',
  "Crohn's Disease",
  'Multiple Sclerosis',
] as const

export type Disease = (typeof DISEASES)[number]

export type TrialStatus =
  'recruiting' | 'not yet recruiting' | 'closed' | 'completed'

export interface Center {
  name: string
  city: string
  country: string
}

export interface Trial {
  id: string
  title: string
  // Free-form disease-area label (no longer limited to the five canonical
  // diseases) so the platform can cover all CTIS therapeutic areas.
  disease: string
  phase: string
  city: string
  country: string
  status: TrialStatus
  short_description: string
  full_description: string
  inclusion_criteria: string[]
  exclusion_criteria: string[]
  centers: Center[]
  contact_name: string
  contact_email: string
  contact_phone: string
  // Extended CTIS fields (present on imported trials).
  sponsor?: string
  therapeutic_area?: string
  medical_condition?: string
  intervention?: string
  age_range?: string
  gender?: string
  countries?: string[]
  source_id?: string
  source_url?: string
}

export interface SupportGroup {
  id: string
  name: string
  disease: Disease
  description: string
  color: string
  member_count: number
}

export interface Discussion {
  id: string
  group_id: string
  author_id: string
  author_name: string
  title?: string
  content: string
  tags: string[]
  summary?: string
  created_at: string
  reply_count: number
}

export interface Reply {
  id: string
  discussion_id: string
  author_id: string
  author_name: string
  content: string
  created_at: string
}

export type Role = 'user' | 'admin'

export interface User {
  id: string
  display_name: string
  age?: number
  city?: string
  // Free-form disease-area interests (chosen from the dynamic disease list).
  interests: string[]
  created_at: string
  email?: string
  role: Role
}

export interface AppNotification {
  id: string
  title: string
  body: string
  trial_id?: string
  created_at: string
  read: boolean
}

// ---- AI feature outputs (validated JSON produced by the LLM layer) ----
// Mirrors the frontend `EligibilityResult` so the API and UI stay in lockstep.

export type Verdict = 'likely' | 'possibly' | 'unlikely'

export interface EligibilityResult {
  verdict: Verdict
  headline: string
  matches: string[]
  gaps: string[]
  note: string
}

/** AI-assisted community post enhancement. Mirrors the frontend
 *  `PostEnhancement` type so the API and UI stay in lockstep. */
export interface PostEnhancement {
  title: string
  improvedContent: string
  tags: string[]
  summary: string
}
