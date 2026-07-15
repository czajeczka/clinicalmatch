import { loadUser } from './identity'

// Typed fetch wrapper for the ClinicalMatch API. Attaches the device identity
// (`x-user-id`) on every request and throws on non-2xx, so the existing
// useAsync / useAiAction error states light up on real failures.

// `||` (not `??`) so a present-but-empty VITE_API_URL (e.g. a blank .env entry
// baked in at build time) falls back to the dev default instead of an empty
// base that would produce broken same-origin requests.
const BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {}
  const user = loadUser()
  if (user) headers['x-user-id'] = user.id
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (data && typeof data.error === 'string') message = data.error
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
