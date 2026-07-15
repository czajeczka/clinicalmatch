// Domain types for ClinicalMatch. These mirror the shapes the real API will
// return (see assignment/frontend.md § Backend touchpoints) so the mock layer
// can be swapped for real endpoints without UI changes.

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
  disease: Disease
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
  created_at: string // ISO
  reply_count: number
}

export interface Reply {
  id: string
  discussion_id: string
  author_id: string
  author_name: string
  content: string
  created_at: string // ISO
}

export type Role = 'user' | 'admin'

export interface User {
  id: string
  display_name: string
  age?: number
  city?: string
  interests: Disease[]
  created_at: string // ISO
  email?: string
  role?: Role // present on records fetched from the backend; 'user' by default
}

export interface AppNotification {
  id: string
  title: string
  body: string
  trial_id?: string
  created_at: string // ISO
  read: boolean
}

// ---- AI feature outputs (validated JSON in the real backend) ----

export type Verdict = 'likely' | 'possibly' | 'unlikely'

export interface EligibilityResult {
  verdict: Verdict
  headline: string
  matches: string[]
  gaps: string[]
  note: string
}

export interface TrialSummary {
  purpose: string
  targetPatients: string
  benefits: string
  requirements: string
}

export interface PlainCriteria {
  canJoin: string[]
  cannotJoin: string[]
}

export interface TrialAnswer {
  answer: string
  citedSection: string
  note: string
}

export interface PostEnhancement {
  title: string
  improvedContent: string
  tags: string[]
  summary: string
}

// ---- Self-check input ----

export type Gender = 'female' | 'male' | 'other' | 'prefer not to say'

export interface SelfCheckInput {
  trial_id: string
  age: number
  gender: Gender
  condition: string
  treatment?: string
}
