import { config } from '../config.js'

// HTTP client for the CTIS (EU Clinical Trials Information System) public API.
// Lives in the backend only — the frontend never talks to CTIS directly. The
// fetch implementation and base URL are injectable so the importer tests run
// against fixtures with no network.

/** Flat record from `POST /search` (only the fields the mapper uses). */
export interface CtisSearchRecord {
  ctNumber: string
  ctStatus?: number | string
  ctTitle?: string
  shortTitle?: string
  conditions?: string
  trialCountries?: string[]
  therapeuticAreas?: string[]
  sponsor?: string
  trialPhase?: string
  primaryEndPoint?: string
  product?: string
  ageGroup?: string
  gender?: string
  totalNumberEnrolled?: string
  lastUpdated?: string
}

export interface CtisSearchResponse {
  pagination?: {
    totalRecords?: number
    currentPage?: number
    totalPages?: number
    nextPage?: boolean
  }
  data?: CtisSearchRecord[]
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

export interface CtisClient {
  /** Full-text search; returns one page of results. */
  search(term: string, page: number, size: number): Promise<CtisSearchResponse>
  /** Full structured detail for one trial (eligibility, sites, contacts). */
  retrieve(ctNumber: string): Promise<unknown>
}

export function createCtisClient(opts?: {
  baseUrl?: string
  fetchImpl?: FetchLike
  timeoutMs?: number
  retryCount?: number
  /** Backoff between retries in ms (overridable so tests don't sleep). */
  retryDelayMs?: number
}): CtisClient {
  const baseUrl = (opts?.baseUrl ?? config.CTIS_API_URL).replace(/\/+$/, '')
  const doFetch: FetchLike = opts?.fetchImpl ?? ((u, i) => fetch(u, i))
  const timeoutMs = opts?.timeoutMs ?? config.CTIS_TIMEOUT_MS
  const retryCount = opts?.retryCount ?? config.IMPORT_RETRY_COUNT
  const retryDelayMs = opts?.retryDelayMs ?? 500

  async function once(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await doFetch(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Fetch with bounded retries. Retries transient failures only — network
   * errors / timeouts (thrown) and 5xx / 429 responses — with linear backoff.
   * 4xx and a final failure propagate to the caller.
   */
  async function call(path: string, init: RequestInit): Promise<Response> {
    let lastErr: unknown
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, retryDelayMs * attempt))
      }
      try {
        const res = await once(path, init)
        // 403 is CTIS's rate-limit/WAF response under bursty load — treat as
        // transient (retry with backoff) alongside 5xx/429.
        if (res.status >= 500 || res.status === 429 || res.status === 403) {
          lastErr = new Error(`transient HTTP ${res.status}`)
          continue
        }
        return res
      } catch (e) {
        lastErr = e // network error / timeout → retry
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new Error(`CTIS request failed: ${String(lastErr)}`)
  }

  return {
    async search(term, page, size) {
      const res = await call('/search', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          pagination: { page, size },
          sort: { property: 'decisionDate', direction: 'DESC' },
          searchCriteria: { containAny: term },
        }),
      })
      if (!res.ok) {
        throw new Error(`CTIS search "${term}" failed with HTTP ${res.status}`)
      }
      return (await res.json()) as CtisSearchResponse
    },

    async retrieve(ctNumber) {
      const res = await call(`/retrieve/${encodeURIComponent(ctNumber)}`, {
        method: 'GET',
        headers: { accept: 'application/json' },
      })
      if (!res.ok) {
        throw new Error(
          `CTIS retrieve ${ctNumber} failed with HTTP ${res.status}`
        )
      }
      return await res.json()
    },
  }
}
