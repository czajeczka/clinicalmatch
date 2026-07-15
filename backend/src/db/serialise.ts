import type {
  AppNotification,
  Discussion,
  Reply,
  SupportGroup,
  Trial,
  User,
} from '../types.js'

// Row mappers: SQLite stores JSON-heavy fields as TEXT. These helpers parse the
// stored rows into the typed objects the API returns, so endpoint chunks don't
// repeat JSON.parse logic. `reply_count` on discussions is derived by the query
// (COUNT of replies), so it is passed in rather than read from a column.

function parseArray(value: unknown): string[] {
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Raw trials row as read from SQLite. JSON columns are strings; joined queries
// may add `sponsor_name`; `countries` is attached from the junction table.
interface TrialRow {
  id: string
  title: string
  disease: string
  phase: string
  city: string
  country: string
  status: string
  short_description: string
  full_description: string
  inclusion_criteria: string
  exclusion_criteria: string
  centers: string
  contact_name: string
  contact_email: string
  contact_phone: string
  therapeutic_area?: string | null
  medical_condition?: string | null
  intervention?: string | null
  age_range?: string | null
  gender?: string | null
  source_id?: string | null
  source_url?: string | null
  sponsor_name?: string | null
}

const undef = (v: string | null | undefined): string | undefined =>
  v ? v : undefined

/** Map a trials row (explicit — internal columns like sponsor_id/age_min are
 *  never leaked). `countries` is attached by the caller from trial_countries. */
export function rowToTrial(row: TrialRow, countries?: string[]): Trial {
  return {
    id: row.id,
    title: row.title,
    disease: row.disease,
    phase: row.phase,
    city: row.city,
    country: row.country,
    status: row.status as Trial['status'],
    short_description: row.short_description,
    full_description: row.full_description,
    inclusion_criteria: parseArray(row.inclusion_criteria),
    exclusion_criteria: parseArray(row.exclusion_criteria),
    centers: JSON.parse(row.centers),
    contact_name: row.contact_name,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone,
    sponsor: undef(row.sponsor_name),
    therapeutic_area: undef(row.therapeutic_area),
    medical_condition: undef(row.medical_condition),
    intervention: undef(row.intervention),
    age_range: undef(row.age_range),
    gender: undef(row.gender),
    countries: countries && countries.length ? countries : undefined,
    source_id: undef(row.source_id),
    source_url: undef(row.source_url),
  }
}

export function rowToGroup(row: SupportGroup): SupportGroup {
  return { ...row, member_count: Number(row.member_count) }
}

type UserRow = Omit<User, 'interests' | 'age' | 'email' | 'role'> & {
  interests: string
  age: number | null
  email: string | null
  role: string | null
}

export function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    display_name: row.display_name,
    age: row.age ?? undefined,
    city: row.city ?? undefined,
    interests: parseArray(row.interests) as User['interests'],
    created_at: row.created_at,
    email: row.email ?? undefined,
    role: row.role === 'admin' ? 'admin' : 'user',
  }
}

type DiscussionRow = Omit<Discussion, 'tags' | 'reply_count'> & {
  tags: string
}

export function rowToDiscussion(
  row: DiscussionRow,
  replyCount: number
): Discussion {
  return {
    id: row.id,
    group_id: row.group_id,
    author_id: row.author_id,
    author_name: row.author_name,
    title: row.title ?? undefined,
    content: row.content,
    tags: parseArray(row.tags),
    summary: row.summary ?? undefined,
    created_at: row.created_at,
    reply_count: replyCount,
  }
}

export function rowToReply(row: Reply): Reply {
  return { ...row }
}

type NotificationRow = Omit<AppNotification, 'read' | 'trial_id'> & {
  read: number
  trial_id: string | null
}

export function rowToNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    trial_id: row.trial_id ?? undefined,
    created_at: row.created_at,
    read: row.read === 1,
  }
}
