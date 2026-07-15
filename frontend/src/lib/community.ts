import type { SupportGroup } from '@/types'
import { colorForDisease } from './diseases'

// ---------------------------------------------------------------------------
// Community-extras layer.
//
// The backend models communities, memberships, discussions and replies. The
// richer social layer of the peer-support experience — reactions, moderators,
// online counts, covers, guidelines, buddies, meetups and member profiles — is
// not persisted server-side yet, so it lives here as a DETERMINISTIC, local
// layer (seeded mock data + localStorage for the current device's choices).
//
// Everything is derived from stable inputs (ids), so the UI is consistent
// across renders and reloads. No backend calls, no schema changes.
// TODO: promote reactions / reports / buddies / meetups to real endpoints in a
// future backend seminar.
// ---------------------------------------------------------------------------

// ---- deterministic helpers -------------------------------------------------

function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

/** Small seeded PRNG (mulberry32) so mock data is stable for a given seed. */
function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(arr: readonly T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)]
}

// ---- safe localStorage -----------------------------------------------------

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore (private mode / quota) */
  }
}

// ---- reactions -------------------------------------------------------------

export type ReactionKind = 'support' | 'hug' | 'thinking' | 'helpful'
export interface ReactionDef {
  kind: ReactionKind
  emoji: string
  label: string
}
export const REACTIONS: ReactionDef[] = [
  { kind: 'support', emoji: '❤️', label: 'Support' },
  { kind: 'hug', emoji: '🤗', label: 'Hug' },
  { kind: 'thinking', emoji: '🙏', label: 'Thinking of you' },
  { kind: 'helpful', emoji: '💙', label: 'Helpful' },
]

/** The community post tags (shared by the composer, AI suggestions and search). */
export const COMMUNITY_TAGS = [
  'Treatment',
  'Clinical Trials',
  'Side Effects',
  'Nutrition',
  'Mental Health',
  'Caregivers',
  'Success Stories',
  'Questions',
] as const
export type CommunityTag = (typeof COMMUNITY_TAGS)[number]

export type ReactionCounts = Record<ReactionKind, number>
export interface ReactionState {
  counts: ReactionCounts
  mine: ReactionKind | null
}

const REACTIONS_KEY = 'clinicalmatch.reactions'

/** Deterministic base counts so posts feel lived-in (excludes the user's own). */
function baseReactionCounts(postId: string): ReactionCounts {
  const rnd = seeded(hash(postId))
  return {
    support: Math.floor(rnd() * 24),
    hug: Math.floor(rnd() * 12),
    thinking: Math.floor(rnd() * 9),
    helpful: Math.floor(rnd() * 14),
  }
}

export function getReactionState(postId: string): ReactionState {
  const store = read<Record<string, ReactionKind>>(REACTIONS_KEY, {})
  const mine = store[postId] ?? null
  const counts = baseReactionCounts(postId)
  if (mine) counts[mine] += 1
  return { counts, mine }
}

/** Toggle the current device's reaction (one per post, switch/off). */
export function setReaction(postId: string, kind: ReactionKind): ReactionState {
  const store = read<Record<string, ReactionKind>>(REACTIONS_KEY, {})
  if (store[postId] === kind) delete store[postId]
  else store[postId] = kind
  write(REACTIONS_KEY, store)
  return getReactionState(postId)
}

// ---- reporting -------------------------------------------------------------

export type ReportTarget = 'post' | 'comment'
export interface Report {
  targetType: ReportTarget
  targetId: string
  reason: string
  at: string
}
const REPORTS_KEY = 'clinicalmatch.reports'
export const REPORT_REASONS = [
  'Harmful or dangerous advice',
  'Harassment or bullying',
  'Spam or promotion',
  'Misinformation',
  'Private information shared',
  'Something else',
]

export function reportContent(
  targetType: ReportTarget,
  targetId: string,
  reason: string
): void {
  const reports = read<Report[]>(REPORTS_KEY, [])
  reports.push({ targetType, targetId, reason, at: new Date().toISOString() })
  write(REPORTS_KEY, reports)
}
export function isReported(targetId: string): boolean {
  return read<Report[]>(REPORTS_KEY, []).some((r) => r.targetId === targetId)
}

// ---- community meta (cover, online, moderators, guidelines) ----------------

export interface Moderator {
  name: string
  initials: string
}
export interface CommunityMeta {
  onlineCount: number
  moderators: Moderator[]
  guidelines: string[]
  coverFrom: string
  coverTo: string
}

const MOD_NAMES = [
  'Dr Anna Kowalczyk',
  'Maria S.',
  'James O.',
  'Sofia R.',
  'Dr Markus Vogel',
  'Camille L.',
  'Erik L.',
  'Aoife M.',
]

export const COMMUNITY_GUIDELINES = [
  'Be kind and respectful — everyone here is on their own journey.',
  'Share experiences, not medical advice. This community never replaces professional care.',
  'No promotion, selling or fundraising.',
  'Protect privacy — yours and others’. Don’t share identifying details.',
  'Report anything harmful; moderators are here to help.',
]

function initialsOf(name: string): string {
  const parts = name
    .replace(/^Dr\s+/i, '')
    .trim()
    .split(/\s+/)
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

export function communityMeta(group: SupportGroup): CommunityMeta {
  const rnd = seeded(hash(group.id))
  const online = Math.max(
    3,
    Math.round(group.member_count * (0.04 + rnd() * 0.05))
  )
  const modCount = 2 + Math.floor(rnd() * 2)
  const names = new Set<string>()
  let guard = 0
  while (names.size < modCount && guard++ < 20) names.add(pick(MOD_NAMES, rnd))
  const moderators = [...names].map((name) => ({
    name,
    initials: initialsOf(name),
  }))
  const base = group.color || colorForDisease(group.disease)
  return {
    onlineCount: online,
    moderators,
    guidelines: COMMUNITY_GUIDELINES,
    coverFrom: base,
    coverTo: `color-mix(in oklab, ${base} 55%, #6e74c9)`,
  }
}

/** CSS gradient for a community cover, derived from its accent colour. */
export function coverGradient(group: SupportGroup): string {
  const { coverFrom, coverTo } = communityMeta(group)
  return `linear-gradient(120deg, ${coverFrom}, ${coverTo})`
}

// ---- members / profiles ----------------------------------------------------

export type TreatmentStage =
  | 'Newly diagnosed'
  | 'In treatment'
  | 'Post-treatment'
  | 'Long-term management'
  | 'Caregiver'
export const TREATMENT_STAGES: TreatmentStage[] = [
  'Newly diagnosed',
  'In treatment',
  'Post-treatment',
  'Long-term management',
  'Caregiver',
]

export const LANGUAGES = [
  'English',
  'German',
  'French',
  'Polish',
  'Italian',
  'Spanish',
  'Dutch',
]
const COUNTRIES = [
  'Poland',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Netherlands',
  'Ireland',
  'Sweden',
  'Austria',
  'Denmark',
]
const NICK_ADJ = [
  'Hopeful',
  'Brave',
  'Calm',
  'Sunny',
  'Steady',
  'Gentle',
  'Bright',
  'Kind',
  'Quiet',
  'Warm',
]
const NICK_NOUN = [
  'Willow',
  'River',
  'Robin',
  'Maple',
  'Sparrow',
  'Aspen',
  'Wren',
  'Fern',
  'Skye',
  'Juno',
]
const BADGES = [
  'Verified patient',
  'Top contributor',
  'Mentor',
  'Early member',
  'Encourager',
  'Great listener',
]
const BIOS = [
  'Here to share what I’ve learned and to listen. One day at a time.',
  'Diagnosed last year — grateful for this community and happy to help newcomers.',
  'Long-term patient, love talking treatment options and nutrition.',
  'Caregiver for my partner. Always up for a chat.',
  'Trying to stay positive and connect with people who get it.',
  'Nurse by training, patient by experience. Ask me anything (not medical advice!).',
]

export interface Member {
  id: string
  nickname: string
  initials: string
  color: string
  disease: string
  country: string
  language: string
  age: number
  stage: TreatmentStage
  bio: string
  badges: string[]
  joinedCommunities: string[]
  recentPosts: { title: string; at: string }[]
}

const RECENT_POST_TITLES = [
  'How do you manage fatigue?',
  'Sharing a small win today 🎉',
  'Questions before my next appointment',
  'What helped you with side effects?',
  'Looking for others in my area',
  'Nutrition tips that actually worked',
]

function makeMember(disease: string, index: number): Member {
  const id = `m-${hash(disease + index).toString(36)}`
  const rnd = seeded(hash(id))
  const nickname = `${pick(NICK_ADJ, rnd)}${pick(NICK_NOUN, rnd)}${Math.floor(rnd() * 90) + 10}`
  const color = colorForDisease(disease)
  const badgeCount = 1 + Math.floor(rnd() * 3)
  const badges: string[] = []
  let guard = 0
  while (badges.length < badgeCount && guard++ < 20) {
    const b = pick(BADGES, rnd)
    if (!badges.includes(b)) badges.push(b)
  }
  const postCount = 1 + Math.floor(rnd() * 3)
  const recentPosts = Array.from({ length: postCount }, () => ({
    title: pick(RECENT_POST_TITLES, rnd),
    at: `${1 + Math.floor(rnd() * 20)} days ago`,
  }))
  return {
    id,
    nickname,
    initials: nickname.slice(0, 2).toUpperCase(),
    color,
    disease,
    country: pick(COUNTRIES, rnd),
    language: pick(LANGUAGES, rnd),
    age: 24 + Math.floor(rnd() * 55),
    stage: pick(TREATMENT_STAGES, rnd),
    bio: pick(BIOS, rnd),
    badges,
    joinedCommunities: [disease],
    recentPosts,
  }
}

/** Deterministic member directory for a disease community. */
export function membersForDisease(disease: string, count = 12): Member[] {
  return Array.from({ length: count }, (_, i) => makeMember(disease, i))
}

export interface BuddyFilters {
  disease?: string
  country?: string
  language?: string
  stage?: string
  age?: number
  ageTolerance?: number
}

/** Filter the directory to buddy candidates. All filters combine (AND). */
export function findBuddies(
  diseases: string[],
  filters: BuddyFilters
): Member[] {
  const pool = (diseases.length ? diseases : ['Breast Cancer']).flatMap((d) =>
    membersForDisease(d)
  )
  const tol = filters.ageTolerance ?? 6
  return pool.filter((m) => {
    if (filters.disease && m.disease !== filters.disease) return false
    if (filters.country && m.country !== filters.country) return false
    if (filters.language && m.language !== filters.language) return false
    if (filters.stage && m.stage !== filters.stage) return false
    if (
      filters.age != null &&
      Number.isFinite(filters.age) &&
      Math.abs(m.age - filters.age) > tol
    )
      return false
    return true
  })
}

const BUDDY_KEY = 'clinicalmatch.buddyRequests'
export function sendBuddyRequest(memberId: string): void {
  const ids = read<string[]>(BUDDY_KEY, [])
  if (!ids.includes(memberId)) write(BUDDY_KEY, [...ids, memberId])
}
export function isBuddyRequested(memberId: string): boolean {
  return read<string[]>(BUDDY_KEY, []).includes(memberId)
}

// ---- meetups ---------------------------------------------------------------

export interface Meetup {
  id: string
  title: string
  disease: string
  whenISO: string
  description: string
  host: string
  participants: number
}

const MEETUP_TEMPLATES = [
  {
    title: 'Newly diagnosed — welcome circle',
    desc: 'A gentle intro call for anyone recently diagnosed.',
  },
  {
    title: 'Living well: nutrition & energy',
    desc: 'Swap practical tips for eating well and managing fatigue.',
  },
  {
    title: 'Treatment Q&A with peers',
    desc: 'Share experiences and questions about treatment journeys.',
  },
  {
    title: 'Evening support hangout',
    desc: 'Casual video chat — no agenda, just company.',
  },
]

/** Deterministic upcoming meetups for a community (mock data, future dates). */
export function meetupsForDisease(disease: string, count = 3): Meetup[] {
  const rnd = seeded(hash('meetup' + disease))
  const now = Date.now()
  return Array.from({ length: count }, (_, i) => {
    const tpl = MEETUP_TEMPLATES[i % MEETUP_TEMPLATES.length]
    const days = 2 + i * 3 + Math.floor(rnd() * 3)
    return {
      id: `mu-${hash(disease + i).toString(36)}`,
      title: tpl.title,
      disease,
      whenISO: new Date(now + days * 86400000).toISOString(),
      description: tpl.desc,
      host: pick(MOD_NAMES, rnd),
      participants: 4 + Math.floor(rnd() * 22),
    }
  })
}

const MEETUP_KEY = 'clinicalmatch.meetups'
export function toggleMeetup(id: string): boolean {
  const ids = read<string[]>(MEETUP_KEY, [])
  const joined = ids.includes(id)
  write(MEETUP_KEY, joined ? ids.filter((x) => x !== id) : [...ids, id])
  return !joined
}
export function isMeetupJoined(id: string): boolean {
  return read<string[]>(MEETUP_KEY, []).includes(id)
}

// ---- anonymous posting (device-local convention) ---------------------------
// The backend derives author_name from the user, so true cross-device anonymity
// needs backend support. As a device-local privacy convention we remember which
// posts this device created anonymously and render them as "Anonymous member".
// TODO: real anonymous authoring belongs in a future backend change.

const ANON_KEY = 'clinicalmatch.anonPosts'
export function markAnonymous(postId: string): void {
  const ids = read<string[]>(ANON_KEY, [])
  if (!ids.includes(postId)) write(ANON_KEY, [...ids, postId])
}
export function isAnonymous(postId: string): boolean {
  return read<string[]>(ANON_KEY, []).includes(postId)
}
