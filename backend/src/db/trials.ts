import { db as singleton, type DB } from './index.js'
import { rowToTrial } from './serialise.js'
import type { Trial } from '../types.js'

// Query layer for the trials catalogue: index-backed SQL filtering + pagination
// + facets, plus the sponsor lookup used by the importer. Kept out of the route
// so both the API and the importer share one source of truth.

const SELECT =
  'SELECT t.*, s.name AS sponsor_name FROM trials t ' +
  'LEFT JOIN sponsors s ON s.id = t.sponsor_id'

export interface TrialFilters {
  query?: string
  disease?: string
  country?: string
  city?: string
  sponsor?: string
  phase?: string
  status?: string
  age?: number
  sex?: string
}

/** Build a WHERE clause + params from filters (all index-backed columns). */
function buildWhere(f: TrialFilters): {
  clause: string
  params: Record<string, unknown>
} {
  const conds: string[] = []
  const params: Record<string, unknown> = {}
  if (f.query) {
    conds.push(
      '(LOWER(t.title) LIKE @q OR LOWER(t.short_description) LIKE @q OR ' +
        'LOWER(t.city) LIKE @q OR LOWER(t.disease) LIKE @q OR ' +
        "LOWER(COALESCE(t.medical_condition,'')) LIKE @q)"
    )
    params.q = `%${f.query.trim().toLowerCase()}%`
  }
  if (f.disease) {
    conds.push('t.disease = @disease')
    params.disease = f.disease
  }
  if (f.country) {
    conds.push(
      'EXISTS (SELECT 1 FROM trial_countries tc WHERE tc.trial_id = t.id AND tc.country = @country)'
    )
    params.country = f.country
  }
  if (f.city) {
    conds.push('t.city = @city')
    params.city = f.city
  }
  if (f.sponsor) {
    conds.push('s.name = @sponsor')
    params.sponsor = f.sponsor
  }
  if (f.phase) {
    conds.push('t.phase = @phase')
    params.phase = f.phase
  }
  if (f.status) {
    conds.push('t.status = @status')
    params.status = f.status
  }
  if (typeof f.age === 'number' && Number.isFinite(f.age)) {
    conds.push(
      '(t.age_min IS NULL OR t.age_min <= @age) AND (t.age_max IS NULL OR t.age_max >= @age)'
    )
    params.age = f.age
  }
  if (f.sex) {
    conds.push(
      "(t.gender IS NULL OR t.gender = '' OR LOWER(t.gender) LIKE @sex)"
    )
    params.sex = `%${f.sex.trim().toLowerCase()}%`
  }
  return {
    clause: conds.length ? `WHERE ${conds.join(' AND ')}` : '',
    params,
  }
}

export interface TrialPage {
  items: Trial[]
  total: number
  limit: number
  offset: number
}

/** Filtered, paginated trial list. Filters combine (AND). */
export function queryTrials(
  filters: TrialFilters,
  limit = 50,
  offset = 0,
  db: DB = singleton
): TrialPage {
  const { clause, params } = buildWhere(filters)
  const total = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM trials t LEFT JOIN sponsors s ON s.id = t.sponsor_id ${clause}`
      )
      .get(params) as { c: number }
  ).c
  const rows = db
    .prepare(`${SELECT} ${clause} ORDER BY t.rowid LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset })
  // Country arrays are omitted from list rows (attached only on detail) to keep
  // list queries cheap at scale.
  return {
    items: rows.map((r) => rowToTrial(r as never)),
    total,
    limit,
    offset,
  }
}

function countriesFor(id: string, db: DB): string[] {
  return db
    .prepare(
      'SELECT country FROM trial_countries WHERE trial_id = ? ORDER BY country'
    )
    .all(id)
    .map((r) => (r as { country: string }).country)
}

export function getTrialById(id: string, db: DB = singleton): Trial | null {
  const row = db.prepare(`${SELECT} WHERE t.id = ?`).get(id)
  if (!row) return null
  return rowToTrial(row as never, countriesFor(id, db))
}

export interface Facets {
  diseases: string[]
  countries: string[]
  cities: string[]
  sponsors: string[]
  phases: string[]
  statuses: string[]
}

/** Distinct filter options. Capped so responses stay small at scale. */
export function getFacets(db: DB = singleton): Facets {
  const col = (sql: string) =>
    db
      .prepare(sql)
      .all()
      .map((r) => Object.values(r as object)[0] as string)
  return {
    diseases: col(
      "SELECT DISTINCT disease FROM trials WHERE disease <> '' ORDER BY disease"
    ),
    countries: col(
      'SELECT DISTINCT country FROM trial_countries ORDER BY country LIMIT 100'
    ),
    cities: col(
      "SELECT DISTINCT city FROM trials WHERE city <> '' ORDER BY city LIMIT 200"
    ),
    sponsors: col('SELECT name FROM sponsors ORDER BY name LIMIT 200'),
    phases: col(
      "SELECT DISTINCT phase FROM trials WHERE phase <> '' ORDER BY phase"
    ),
    statuses: col(
      "SELECT DISTINCT status FROM trials WHERE status <> '' ORDER BY status"
    ),
  }
}

/** Insert-or-get a sponsor id (dedupes names via the UNIQUE constraint). */
export function upsertSponsor(name: string, db: DB = singleton): number | null {
  const n = name.trim()
  if (!n) return null
  db.prepare('INSERT OR IGNORE INTO sponsors (name) VALUES (?)').run(n)
  const row = db.prepare('SELECT id FROM sponsors WHERE name = ?').get(n) as
    { id: number } | undefined
  return row?.id ?? null
}
