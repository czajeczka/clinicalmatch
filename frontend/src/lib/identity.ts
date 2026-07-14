import type { Disease, User } from '@/types'

// Device-based anonymous identity (brief: no login, no account recovery).
// Persisted to localStorage; sent later to the API as an `x-user-id` header.
// The id is sent to the backend as the `x-user-id` header (see lib/apiClient).

const KEY = 'clinicalmatch.user'

function generateId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  return 'u-' + Math.abs(hashString(String(performance.now()))).toString(36)
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i)
  return h
}

export function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function saveUser(user: User): void {
  localStorage.setItem(KEY, JSON.stringify(user))
}

export function createUser(input: {
  display_name: string
  age?: number
  city?: string
  interests: Disease[]
}): User {
  const user: User = {
    id: generateId(),
    display_name: input.display_name.trim() || 'Guest',
    age: input.age,
    city: input.city?.trim(),
    interests: input.interests,
    created_at: new Date().toISOString(),
  }
  saveUser(user)
  return user
}

export function clearUser(): void {
  localStorage.removeItem(KEY)
}
