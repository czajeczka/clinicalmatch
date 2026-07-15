import type { Center, Disease, Trial, TrialStatus } from '../types.js'
import type { CtisSearchRecord } from './ctisClient.js'

// Pure mapping from CTIS payloads into the existing `Trial` model. No network,
// no DB — unit-tested in isolation. External JSON is untyped, so navigation
// goes through the small safe helpers below (no `any`).

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}
function str(v: unknown): string {
  return v == null ? '' : String(v).trim()
}
/** Walk a nested path safely, returning the value or undefined. */
function dig(v: unknown, ...keys: string[]): unknown {
  let cur: unknown = v
  for (const k of keys) cur = rec(cur)[k]
  return cur
}

const DISEASE_MATCHERS: { disease: Disease; test: RegExp }[] = [
  { disease: 'Breast Cancer', test: /breast/i },
  {
    disease: 'Type 2 Diabetes',
    test: /type\s*2\s*diabet|type\s*ii\s*diabet|t2dm/i,
  },
  { disease: 'Rheumatoid Arthritis', test: /rheumatoid arthritis/i },
  { disease: "Crohn's Disease", test: /crohn/i },
  { disease: 'Multiple Sclerosis', test: /multiple sclerosis/i },
]

/** Classify free text to one of the five canonical diseases, or null. */
export function classifyDisease(
  ...texts: (string | undefined)[]
): Disease | null {
  const hay = texts.filter(Boolean).join(' ')
  for (const m of DISEASE_MATCHERS) if (m.test.test(hay)) return m.disease
  return null
}

/** Normalise CTIS's verbose phase string to "Phase N", else pass through. */
export function mapPhase(trialPhase?: string): string {
  const p = str(trialPhase)
  if (!p) return 'Not specified'
  const m = p.match(/phase\s*(iv|iii|ii|i)\b/i)
  if (m) {
    const map: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4' }
    return `Phase ${map[m[1].toLowerCase()]}`
  }
  return p
}

/** Best-effort mapping of CTIS status text/codes to our TrialStatus enum. */
export function mapStatus(
  ...signals: (string | number | undefined)[]
): TrialStatus {
  const s = signals.map((x) => str(x).toLowerCase()).join(' ')
  // Closed signals first — "suspended" contains "ended".
  if (/closed|terminat|suspend|revoked|withdrawn/.test(s)) return 'closed'
  if (/\bended\b|concluded|complete/.test(s)) return 'completed'
  if (/not yet|under evaluation|not recruiting/.test(s))
    return 'not yet recruiting'
  return 'recruiting'
}

function parseCountry(trialCountries?: string[]): string {
  const first = arr(trialCountries)[0]
  // entries look like "Germany:2" (country:site-count)
  return str(first).split(':')[0].trim()
}

/** All country names from CTIS "Germany:2" style entries. */
export function parseCountries(trialCountries?: string[]): string[] {
  return arr(trialCountries)
    .map((c) => str(c).split(':')[0].trim())
    .filter(Boolean)
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1).trimEnd() + '…'
}

// ---- detail extractors (deeply-nested CTIS `retrieve` payload) ----

function eligibilityList(
  detail: unknown,
  key: string,
  field: string
): string[] {
  const list = dig(
    detail,
    'authorizedApplication',
    'authorizedPartI',
    'trialDetails',
    'trialInformation',
    'eligibilityCriteria',
    key
  )
  return arr(list)
    .map((c) => str(rec(c)[field]))
    .filter(Boolean)
}

export function extractInclusion(detail: unknown): string[] {
  return eligibilityList(
    detail,
    'principalInclusionCriteria',
    'principalInclusionCriteria'
  )
}
export function extractExclusion(detail: unknown): string[] {
  return eligibilityList(
    detail,
    'principalExclusionCriteria',
    'principalExclusionCriteria'
  )
}

export function extractCenters(detail: unknown): Center[] {
  const partsII = arr(dig(detail, 'authorizedApplication', 'authorizedPartsII'))
  const out: Center[] = []
  const seen = new Set<string>()
  for (const part of partsII) {
    for (const site of arr(rec(part).trialSites)) {
      const info = rec(rec(site).organisationAddressInfo)
      const address = rec(info.address)
      const org = rec(info.organisation)
      const city = str(address.city)
      if (!city) continue
      const country = str(address.countryName) || str(address.country)
      const name = str(org.name) || 'Trial site'
      const key = `${name}|${city}|${country}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ name, city, country })
    }
  }
  return out
}

export function extractContact(detail: unknown): {
  name: string
  email: string
  phone: string
} {
  const sponsors = arr(
    dig(detail, 'authorizedApplication', 'authorizedPartI', 'sponsors')
  )
  for (const sp of sponsors) {
    const contacts = [
      ...arr(rec(sp).publicContacts),
      ...arr(rec(sp).scientificContacts),
    ]
    for (const c of contacts) {
      const cr = rec(c)
      const name = str(cr.functionalName)
      const email = str(cr.functionalEmailAddress)
      const phone = str(cr.telephone)
      if (name || email || phone) return { name, email, phone }
    }
  }
  return { name: '', email: '', phone: '' }
}

/** Eligibility fallback from the flat search record (age/sex) when the detail
 *  payload is unavailable — still honest, registry-sourced facts. */
function basicEligibility(search: CtisSearchRecord): string[] {
  const out: string[] = []
  const age = str(search.ageGroup)
  if (age) out.push(`Age group: ${age}`)
  const gender = str(search.gender)
  if (gender) out.push(`Sex eligible for study: ${gender}`)
  return out
}

function composeDescription(search: CtisSearchRecord, disease: string): string {
  const parts: string[] = []
  const cond = str(search.conditions)
  parts.push(
    `A clinical trial registered in the EU Clinical Trials Information System (CTIS) studying ${
      cond || disease
    }.`
  )
  const sponsor = str(search.sponsor)
  if (sponsor) parts.push(`Sponsor: ${sponsor}.`)
  const enrolled = str(search.totalNumberEnrolled)
  if (enrolled) parts.push(`Planned enrolment: ${enrolled} participants.`)
  const endpoint = str(search.primaryEndPoint)
  if (endpoint) parts.push(`Primary endpoint: ${truncate(endpoint, 400)}`)
  return parts.join(' ')
}

/**
 * Map a CTIS trial (search record + optional detail payload) to a `Trial`.
 * `disease` is the canonical disease the search was scoped to. Returns null if
 * the record has no usable id.
 */
export function mapCtisTrial(params: {
  search: CtisSearchRecord
  detail: unknown | null
  disease: string
}): Trial | null {
  const { search, detail, disease } = params
  const id = str(search.ctNumber)
  if (!id) return null

  const title =
    str(search.ctTitle) || str(search.shortTitle) || 'Untitled clinical trial'
  const centers = detail ? extractCenters(detail) : []
  const searchCountry = parseCountry(search.trialCountries)
  const city = centers[0]?.city || searchCountry || 'Multiple locations'
  const country = centers[0]?.country || searchCountry || 'European Union'

  const inclusion = detail ? extractInclusion(detail) : []
  const exclusion = detail ? extractExclusion(detail) : []
  const contact = detail
    ? extractContact(detail)
    : { name: '', email: '', phone: '' }
  const therapeutic = arr(search.therapeuticAreas)
    .map((t) => str(t))
    .filter((t) => t && t.toLowerCase() !== 'not possible to specify')[0]

  return {
    id,
    title,
    disease,
    phase: mapPhase(search.trialPhase),
    city,
    country,
    status: mapStatus(str(dig(detail, 'ctStatus')), search.ctStatus),
    short_description:
      str(search.shortTitle) || truncate(str(search.conditions) || title, 160),
    full_description: composeDescription(search, disease),
    inclusion_criteria: inclusion.length ? inclusion : basicEligibility(search),
    exclusion_criteria: exclusion,
    centers,
    contact_name: contact.name,
    contact_email: contact.email,
    contact_phone: contact.phone,
    sponsor: str(search.sponsor),
    therapeutic_area: therapeutic || disease,
    medical_condition: str(search.conditions),
    intervention: str(search.product),
    age_range: str(search.ageGroup),
    gender: str(search.gender),
    countries: parseCountries(search.trialCountries),
    source_id: id,
    source_url: `https://euclinicaltrials.eu/ctis-public/#/view/${encodeURIComponent(id)}`,
  }
}

/** Parse a CTIS age-group string like "18-64 years, 65+ years" into a numeric
 *  [min, max] range for filtering (max 150 for open-ended "65+"). */
export function parseAgeRange(ageGroup?: string): {
  min: number | null
  max: number | null
} {
  const s = str(ageGroup)
  if (!s) return { min: null, max: null }
  let min: number | null = null
  let max: number | null = null
  for (const m of s.matchAll(/(\d{1,3})\s*-\s*(\d{1,3})/g)) {
    const lo = Number(m[1])
    const hi = Number(m[2])
    min = min === null ? lo : Math.min(min, lo)
    max = max === null ? hi : Math.max(max, hi)
  }
  for (const m of s.matchAll(/(\d{1,3})\s*\+/g)) {
    const lo = Number(m[1])
    min = min === null ? lo : Math.min(min, lo)
    max = 150
  }
  return { min, max }
}

export interface TrialSourceMeta {
  source_id: string
  source_url: string
  sponsor: string
  recruitment_status: string
  countries: string[]
}

/** Extra CTIS fields stored alongside a trial (internal — not in the API).
 *  Kept for future AI/RAG features and provenance/observability. */
export function buildSourceMeta(
  search: CtisSearchRecord,
  detail: unknown | null
): TrialSourceMeta {
  const id = str(search.ctNumber)
  return {
    source_id: id,
    source_url: id
      ? `https://euclinicaltrials.eu/ctis-public/#/view/${encodeURIComponent(id)}`
      : '',
    sponsor: str(search.sponsor),
    recruitment_status: str(dig(detail, 'ctStatus')) || str(search.ctStatus),
    countries: parseCountries(search.trialCountries),
  }
}
