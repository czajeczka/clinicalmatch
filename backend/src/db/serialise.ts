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

// Raw row shapes as read from SQLite (JSON columns are strings).
type TrialRow = Omit<
  Trial,
  'inclusion_criteria' | 'exclusion_criteria' | 'centers'
> & {
  inclusion_criteria: string
  exclusion_criteria: string
  centers: string
}

export function rowToTrial(row: TrialRow): Trial {
  return {
    ...row,
    inclusion_criteria: parseArray(row.inclusion_criteria),
    exclusion_criteria: parseArray(row.exclusion_criteria),
    centers: JSON.parse(row.centers),
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
