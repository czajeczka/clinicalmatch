import type {
  AppNotification,
  Disease,
  Discussion,
  EligibilityResult,
  PlainCriteria,
  PostEnhancement,
  Reply,
  SelfCheckInput,
  SupportGroup,
  SyncStatus,
  Trial,
  TrialAnswer,
  TrialFacets,
  TrialPage,
  TrialSummary,
  User,
} from '@/types'

export interface TrialQuery {
  query?: string
  disease?: string
  country?: string
  city?: string
  sponsor?: string
  phase?: string
  status?: string
  age?: string
  sex?: string
  limit?: number
  offset?: number
}
import { apiClient } from '@/lib/apiClient'
import { MOCK_TRIALS } from './data'

// ---------------------------------------------------------------------------
// API layer. Non-AI reads/mutations call the real backend via apiClient.
// The four AI features stay MOCKED here — they belong to later seminars
// (TODO: LLM API (seminar 6); the grounded Q&A is also TODO: RAG (later
// seminar)). The mock still validates JSON shapes and exercises the UI's
// loading / error / offline states.
// ---------------------------------------------------------------------------

function delay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/** Escape hatch to demo AI error states without randomness: any AI input that
 *  contains this token forces the request to fail (retry-once then fallback). */
export const FAIL_TOKEN = 'FAILTEST'

function maybeFail(input: string): void {
  if (input.toUpperCase().includes(FAIL_TOKEN)) {
    throw new Error('Simulated AI failure')
  }
}

/** Pure catalogue filter — kept for unit tests and any client-side reuse. */
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

function mockTrial(trialId: string): Trial {
  const trial = MOCK_TRIALS.find((t) => t.id === trialId)
  if (!trial) throw new Error(`Unknown trial: ${trialId}`)
  return trial
}

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v && v.length > 0)
  if (entries.length === 0) return ''
  return (
    '?' +
    entries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
      .join('&')
  )
}

export const api = {
  // ---- Trials (real) ----
  // Back-compat: returns just the items array (Home/Profile/Assistant use this).
  getTrials(params?: { query?: string; disease?: Disease | 'all' }) {
    const disease =
      params?.disease && params.disease !== 'all' ? params.disease : undefined
    return apiClient
      .get<TrialPage>(`/trials${qs({ query: params?.query, disease })}`)
      .then((page) => page.items)
  },
  // Full filtered + paginated search (Trials page).
  getTrialsPage(q: TrialQuery) {
    const params: Record<string, string | undefined> = {
      query: q.query,
      disease: q.disease,
      country: q.country,
      city: q.city,
      sponsor: q.sponsor,
      phase: q.phase,
      status: q.status,
      age: q.age,
      sex: q.sex,
      limit: q.limit != null ? String(q.limit) : undefined,
      offset: q.offset != null ? String(q.offset) : undefined,
    }
    return apiClient.get<TrialPage>(`/trials${qs(params)}`)
  },
  getFacets() {
    return apiClient.get<TrialFacets>('/trials/facets')
  },
  getTrial(id: string) {
    return apiClient
      .get<Trial>(`/trials/${encodeURIComponent(id)}`)
      .catch((err) => {
        if (err?.status === 404) return null
        throw err
      })
  },

  // ---- Communities (real) ----
  getGroups() {
    return apiClient.get<SupportGroup[]>('/groups')
  },
  getGroupDiscussions(groupId: string) {
    return apiClient.get<Discussion[]>(
      `/groups/${encodeURIComponent(groupId)}/discussions`
    )
  },
  getDiscussion(id: string) {
    return apiClient
      .get<Discussion>(`/discussions/${encodeURIComponent(id)}`)
      .catch((err) => {
        if (err?.status === 404) return null
        throw err
      })
  },
  getReplies(discussionId: string) {
    return apiClient.get<Reply[]>(
      `/discussions/${encodeURIComponent(discussionId)}/replies`
    )
  },
  createDiscussion(input: {
    group_id: string
    title?: string
    content: string
    tags?: string[]
    summary?: string
  }) {
    return apiClient.post<Discussion>('/discussions', input)
  },
  updateDiscussion(
    id: string,
    patch: { title?: string; content?: string; tags?: string[] }
  ) {
    return apiClient.patch<Discussion>(
      `/discussions/${encodeURIComponent(id)}`,
      patch
    )
  },
  deleteDiscussion(id: string) {
    return apiClient.delete<void>(`/discussions/${encodeURIComponent(id)}`)
  },
  createReply(discussionId: string, content: string) {
    return apiClient.post<Reply>(
      `/discussions/${encodeURIComponent(discussionId)}/replies`,
      { content }
    )
  },
  deleteReply(id: string) {
    return apiClient.delete<void>(`/replies/${encodeURIComponent(id)}`)
  },

  // ---- Saved trials (real) ----
  getSavedTrials() {
    return apiClient.get<Trial[]>('/saved-trials')
  },
  saveTrial(trialId: string) {
    return apiClient.post<{ id: string }>('/saved-trials', {
      trial_id: trialId,
    })
  },
  unsaveTrial(trialId: string) {
    return apiClient.delete<void>(
      `/saved-trials/${encodeURIComponent(trialId)}`
    )
  },

  // ---- Memberships (real) ----
  getMemberships() {
    return apiClient.get<SupportGroup[]>('/memberships')
  },
  joinGroup(groupId: string) {
    return apiClient.post<{ id: string }>('/memberships', {
      group_id: groupId,
    })
  },
  leaveGroup(groupId: string) {
    return apiClient.delete<void>(`/memberships/${encodeURIComponent(groupId)}`)
  },

  // ---- Users (real) ----
  upsertUser(user: {
    id: string
    display_name: string
    age?: number
    city?: string
    interests: string[]
  }) {
    return apiClient.post<User>('/users', user)
  },
  patchUser(
    id: string,
    patch: {
      display_name?: string
      age?: number | null
      city?: string | null
      interests?: string[]
    }
  ) {
    return apiClient.patch<User>(`/users/${encodeURIComponent(id)}`, patch)
  },
  getUser(id: string) {
    return apiClient
      .get<User>(`/users/${encodeURIComponent(id)}`)
      .catch((err) => {
        if (err?.status === 404) return null
        throw err
      })
  },

  // ---- Notifications (real) ----
  getNotifications() {
    return apiClient.get<AppNotification[]>('/notifications')
  },
  markNotificationRead(id: string) {
    return apiClient.patch<AppNotification>(
      `/notifications/${encodeURIComponent(id)}`,
      { read: true }
    )
  },

  // ---- Admin (real; backend enforces role='admin' → 403 otherwise) ----
  createTrial(body: Omit<Trial, 'id'>) {
    return apiClient.post<Trial>('/trials', body)
  },
  updateTrial(id: string, patch: Partial<Omit<Trial, 'id'>>) {
    return apiClient.patch<Trial>(`/trials/${encodeURIComponent(id)}`, patch)
  },
  deleteTrial(id: string) {
    return apiClient.delete<void>(`/trials/${encodeURIComponent(id)}`)
  },
  createGroup(body: {
    name: string
    disease: Disease
    description: string
    color: string
  }) {
    return apiClient.post<SupportGroup>('/groups', body)
  },
  updateGroup(
    id: string,
    patch: Partial<{
      name: string
      disease: Disease
      description: string
      color: string
    }>
  ) {
    return apiClient.patch<SupportGroup>(
      `/groups/${encodeURIComponent(id)}`,
      patch
    )
  },
  deleteGroup(id: string) {
    return apiClient.delete<void>(`/groups/${encodeURIComponent(id)}`)
  },
  createNotification(body: { title: string; body: string; trial_id?: string }) {
    return apiClient.post<AppNotification>('/notifications', body)
  },
  deleteNotification(id: string) {
    return apiClient.delete<void>(`/notifications/${encodeURIComponent(id)}`)
  },
  getSyncStatus() {
    return apiClient.get<SyncStatus>('/admin/sync')
  },
  runSync(body: {
    mode: 'full' | 'incremental'
    diseases?: string[]
    countries?: string[]
  }) {
    return apiClient.post<{ started: boolean }>('/admin/sync/run', body)
  },
  pauseSync() {
    return apiClient.post('/admin/sync/pause')
  },
  resumeSync() {
    return apiClient.post('/admin/sync/resume')
  },
  updateReply(id: string, content: string) {
    return apiClient.patch<Reply>(`/replies/${encodeURIComponent(id)}`, {
      content,
    })
  },

  // ---- AI features (MOCKED — deferred) --------------------------------------
  // TODO: LLM API (seminar 6) — replace the bodies below with real backend
  // calls once the AI/LLM abstraction layer exists.

  async summariseTrial(trialId: string): Promise<TrialSummary> {
    const trial = mockTrial(trialId)
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
    const trial = mockTrial(trialId)
    await delay(null, 650)
    maybeFail(trial.inclusion_criteria.join(' '))
    return {
      canJoin: trial.inclusion_criteria.map(plainify),
      cannotJoin: trial.exclusion_criteria.map(plainify),
    }
  },

  // Eligibility self-check — REAL (seminar 6). Goes through the backend's LLM
  // abstraction layer (POST /ai/eligibility-check); validated JSON, retry +
  // calm fallback handled by the backend and useAiAction. Informational only.
  selfCheck(input: SelfCheckInput): Promise<EligibilityResult> {
    return apiClient.post<EligibilityResult>('/ai/eligibility-check', input)
  },

  async askTrial(trialId: string, question: string): Promise<TrialAnswer> {
    // TODO: RAG (later seminar) + TODO: LLM API (seminar 6)
    const trial = mockTrial(trialId)
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

// ---- internal helpers (AI mocks) ----

function plainify(criterion: string): string {
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
