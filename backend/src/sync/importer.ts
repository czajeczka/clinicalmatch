import { db as singleton, type DB } from '../db/index.js'
import { config } from '../config.js'
import type { TrialStatus } from '../types.js'
import {
  createCtisClient,
  type CtisClient,
  type CtisSearchRecord,
} from './ctisClient.js'
import { mapCtisTrial, parseAgeRange } from './ctisMapper.js'
import {
  DISEASE_AREAS,
  resolveAreas,
  queryFor,
  type DiseaseArea,
} from './diseaseAreas.js'
import { upsertSponsor } from '../db/trials.js'

// Backend-only CTIS importer. Streams per page (bounded memory), is resilient
// (a bad fetch never wipes good data), resumable (incremental upserts persist
// as it goes), and writes a sync_logs row per run. Modes:
//   full        — import + then sweep trials that dropped out of CTIS
//   incremental — upsert only new/changed trials (diffed on CTIS lastUpdated)

const ALL_STATUSES: TrialStatus[] = [
  'recruiting',
  'not yet recruiting',
  'closed',
  'completed',
]

export type SyncMode = 'full' | 'incremental'

export interface ImportResult {
  mode: SyncMode
  status: 'success' | 'partial' | 'error'
  seen: number
  imported: number
  updated: number
  skipped: number
  failed: number
  removed: number
  durationMs: number
  message: string
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
function log(...args: unknown[]): void {
  console.log('[ctis-sync]', ...args)
}

/** Resolve IMPORT_STATUS to TrialStatus values (empty = all). */
export function resolveStatuses(raw: string): TrialStatus[] {
  const wanted = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (wanted.length === 0) return ALL_STATUSES
  const matched = ALL_STATUSES.filter((s) => wanted.includes(s.toLowerCase()))
  return matched.length ? matched : ALL_STATUSES
}

function resolveCountries(raw: string | string[] | undefined): string[] {
  return (Array.isArray(raw) ? raw : (raw ?? '').split(','))
    .map((s) => s.trim())
    .filter(Boolean)
}

// ---- per-trial persistence (one page = one transaction) ----

const upsertTrial = (db: DB) =>
  db.prepare(`
  INSERT INTO trials (id, title, disease, phase, city, country, status,
    short_description, full_description, inclusion_criteria, exclusion_criteria,
    centers, contact_name, contact_email, contact_phone, sponsor_id,
    therapeutic_area, medical_condition, intervention, age_range, age_min,
    age_max, gender, source_id, source_url)
  VALUES (@id, @title, @disease, @phase, @city, @country, @status,
    @short_description, @full_description, @inclusion_criteria,
    @exclusion_criteria, @centers, @contact_name, @contact_email, @contact_phone,
    @sponsor_id, @therapeutic_area, @medical_condition, @intervention,
    @age_range, @age_min, @age_max, @gender, @source_id, @source_url)
  ON CONFLICT(id) DO UPDATE SET
    title=excluded.title, disease=excluded.disease, phase=excluded.phase,
    city=excluded.city, country=excluded.country, status=excluded.status,
    short_description=excluded.short_description,
    full_description=excluded.full_description,
    inclusion_criteria=excluded.inclusion_criteria,
    exclusion_criteria=excluded.exclusion_criteria, centers=excluded.centers,
    contact_name=excluded.contact_name, contact_email=excluded.contact_email,
    contact_phone=excluded.contact_phone, sponsor_id=excluded.sponsor_id,
    therapeutic_area=excluded.therapeutic_area,
    medical_condition=excluded.medical_condition,
    intervention=excluded.intervention, age_range=excluded.age_range,
    age_min=excluded.age_min, age_max=excluded.age_max, gender=excluded.gender,
    source_id=excluded.source_id, source_url=excluded.source_url
`)

interface Prepared {
  upsert: ReturnType<DB['prepare']>
  exists: ReturnType<DB['prepare']>
  metaGet: ReturnType<DB['prepare']>
  metaUpsert: ReturnType<DB['prepare']>
  delCountries: ReturnType<DB['prepare']>
  insCountry: ReturnType<DB['prepare']>
}
function prepare(db: DB): Prepared {
  return {
    upsert: upsertTrial(db),
    exists: db.prepare('SELECT 1 FROM trials WHERE id = ?'),
    metaGet: db.prepare(
      'SELECT ctis_last_updated AS lu FROM trial_sync_meta WHERE trial_id = ?'
    ),
    metaUpsert: db.prepare(
      `INSERT INTO trial_sync_meta (trial_id, source, ctis_last_updated, imported_at)
       VALUES (@trial_id, 'ctis', @lu, @now)
       ON CONFLICT(trial_id) DO UPDATE SET
         ctis_last_updated = excluded.ctis_last_updated,
         imported_at = excluded.imported_at`
    ),
    delCountries: db.prepare('DELETE FROM trial_countries WHERE trial_id = ?'),
    insCountry: db.prepare(
      'INSERT OR IGNORE INTO trial_countries (trial_id, country) VALUES (@trial_id, @country)'
    ),
  }
}

export async function runImport(opts?: {
  db?: DB
  client?: CtisClient
  mode?: SyncMode
  limit?: number
  batchSize?: number
  diseases?: string[]
  statuses?: TrialStatus[]
  countries?: string[]
}): Promise<ImportResult> {
  const db = opts?.db ?? singleton
  const client = opts?.client ?? createCtisClient()
  const mode: SyncMode = opts?.mode ?? 'full'
  const limit = opts?.limit ?? config.IMPORT_LIMIT
  const batchSize = opts?.batchSize ?? config.IMPORT_BATCH_SIZE
  const areas: DiseaseArea[] = opts?.diseases
    ? resolveAreas(opts.diseases)
    : resolveAreas(config.IMPORT_DISEASES || undefined)
  const statuses = opts?.statuses ?? resolveStatuses(config.IMPORT_STATUS)
  const countryFilter = new Set(
    (opts?.countries ?? resolveCountries(config.IMPORT_COUNTRIES)).map((c) =>
      c.toLowerCase()
    )
  )
  const started_at = new Date().toISOString()
  const startedMs = Date.now()
  const runStamp = started_at // marks trials touched this run (for the sweep)
  const p = prepare(db)

  let seen = 0
  let imported = 0
  let updated = 0
  let skipped = 0
  let failed = 0
  let detailFallbacks = 0
  let areasFailed = 0
  const errors: string[] = []
  const seenIds = new Set<string>()
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  db.prepare('UPDATE sync_state SET running = 1 WHERE id = 1').run()

  try {
    for (const area of areas) {
      try {
        const term = queryFor(area)
        let page = 1
        let gathered = 0
        while (gathered < limit) {
          const response = await client.search(term, page, batchSize)
          const data = (response.data ?? []) as CtisSearchRecord[]
          if (data.length === 0) break

          // Process this page as one transaction (batching + bounded memory).
          const applyPage = db.transaction((records: CtisSearchRecord[]) => {
            for (const record of records) {
              if (gathered >= limit) break
              const id = String(record.ctNumber ?? '')
              if (!id || seenIds.has(id)) continue
              seenIds.add(id)
              seen++
              gathered++
              // detail fetch is awaited outside the tx (see below) — here we only
              // persist. Detail is attached on the record object as __detail.
              const detail = (record as { __detail?: unknown }).__detail ?? null
              const trial = mapCtisTrial({
                search: record,
                detail,
                disease: area.label,
              })
              if (!trial) {
                failed++
                continue
              }
              if (!statuses.includes(trial.status)) {
                skipped++
                continue
              }
              if (
                countryFilter.size > 0 &&
                !(trial.countries ?? []).some((c) =>
                  countryFilter.has(c.toLowerCase())
                )
              ) {
                skipped++
                continue
              }
              if (mode === 'incremental') {
                const existing = p.metaGet.get(id) as { lu: string } | undefined
                if (
                  existing &&
                  existing.lu === String(record.lastUpdated ?? '')
                ) {
                  skipped++
                  continue
                }
              }
              const existed = p.exists.get(id)
              const { min, max } = parseAgeRange(trial.age_range)
              p.upsert.run({
                id: trial.id,
                title: trial.title,
                disease: trial.disease,
                phase: trial.phase,
                city: trial.city,
                country: trial.country,
                status: trial.status,
                short_description: trial.short_description,
                full_description: trial.full_description,
                inclusion_criteria: JSON.stringify(trial.inclusion_criteria),
                exclusion_criteria: JSON.stringify(trial.exclusion_criteria),
                centers: JSON.stringify(trial.centers),
                contact_name: trial.contact_name,
                contact_email: trial.contact_email,
                contact_phone: trial.contact_phone,
                sponsor_id: trial.sponsor
                  ? upsertSponsor(trial.sponsor, db)
                  : null,
                therapeutic_area: trial.therapeutic_area ?? null,
                medical_condition: trial.medical_condition ?? null,
                intervention: trial.intervention ?? null,
                age_range: trial.age_range ?? null,
                age_min: min,
                age_max: max,
                gender: trial.gender ?? null,
                source_id: trial.source_id ?? null,
                source_url: trial.source_url ?? null,
              })
              p.delCountries.run(id)
              for (const c of trial.countries ?? [])
                p.insCountry.run({ trial_id: id, country: c })
              p.metaUpsert.run({
                trial_id: id,
                lu: String(record.lastUpdated ?? ''),
                now: runStamp,
              })
              if (existed) updated++
              else imported++
            }
          })

          // Fetch details for this page (best-effort) before persisting.
          // A short delay keeps us under CTIS's burst rate limit.
          for (const record of data) {
            const id = String(record.ctNumber ?? '')
            if (!id || seenIds.has(id)) continue
            try {
              ;(record as { __detail?: unknown }).__detail =
                await client.retrieve(id)
            } catch (e) {
              detailFallbacks++
              errors.push(`detail ${id}: ${errMsg(e)}`)
            }
            await sleep(120)
          }
          applyPage(data)

          if (!response.pagination?.nextPage) break
          page++
        }
        log(`${area.label}: gathered ${gathered}`)
      } catch (e) {
        // A per-area failure (e.g. a persistent rate-limit) is isolated: log it
        // and continue with the other areas. Already-imported data persists.
        areasFailed++
        errors.push(`area ${area.label}: ${errMsg(e)}`)
      }
    }

    // Full-mode sweep: remove CTIS-sourced trials not touched this run (i.e.
    // dropped out of the registry). Guarded so an empty fetch never wipes.
    let removed = 0
    if (mode === 'full') {
      if (seen === 0) {
        throw new Error(
          'CTIS returned no records; existing catalogue left unchanged'
        )
      }
    }
    // Only sweep on a fully-successful full run — if any area failed (e.g. a
    // rate-limit), skip the sweep so we don't remove trials whose fresh data we
    // simply couldn't fetch this run.
    if (mode === 'full' && areasFailed === 0) {
      // Scope the sweep to the disease areas imported this run, so a scoped
      // full import can't wipe trials from other diseases.
      const labels = areas.map((a) => a.label)
      const placeholders = labels.map(() => '?').join(', ')
      const stale = db
        .prepare(
          `SELECT tsm.trial_id FROM trial_sync_meta tsm
           JOIN trials t ON t.id = tsm.trial_id
           WHERE tsm.source = 'ctis' AND tsm.imported_at <> ?
             AND t.disease IN (${placeholders})`
        )
        .all(runStamp, ...labels)
        .map((r) => (r as { trial_id: string }).trial_id)
      const sweep = db.transaction((ids: string[]) => {
        for (const id of ids) {
          db.prepare('DELETE FROM saved_trials WHERE trial_id = ?').run(id)
          db.prepare('DELETE FROM trial_countries WHERE trial_id = ?').run(id)
          db.prepare('DELETE FROM trial_sync_meta WHERE trial_id = ?').run(id)
          db.prepare('DELETE FROM trials WHERE id = ?').run(id)
        }
      })
      sweep(stale)
      removed = stale.length
    }

    const durationMs = Date.now() - startedMs
    const status: ImportResult['status'] =
      areasFailed > 0 || failed > 0 || detailFallbacks > 0
        ? 'partial'
        : 'success'
    const message =
      `${mode}: ${imported} imported, ${updated} updated, ${skipped} skipped, ` +
      `${removed} removed, ${failed} failed, ${detailFallbacks} detail fallback(s) ` +
      `across ${areas.length} disease areas in ${durationMs}ms.` +
      (errors.length ? ` First errors: ${errors.slice(0, 3).join(' | ')}` : '')
    log(status, message)
    insertLog(db, {
      mode,
      status,
      seen,
      imported,
      updated,
      skipped,
      failed,
      durationMs,
      message,
      started_at,
    })
    finishState(db)
    return {
      mode,
      status,
      seen,
      imported,
      updated,
      skipped,
      failed,
      removed,
      durationMs,
      message,
    }
  } catch (e) {
    const durationMs = Date.now() - startedMs
    const message = errMsg(e)
    log('error', message)
    insertLog(db, {
      mode,
      status: 'error',
      seen,
      imported,
      updated,
      skipped,
      failed,
      durationMs,
      message,
      started_at,
    })
    finishState(db)
    return {
      mode,
      status: 'error',
      seen,
      imported,
      updated,
      skipped,
      failed,
      removed: 0,
      durationMs,
      message,
    }
  }
}

function finishState(db: DB): void {
  const row = db
    .prepare('SELECT interval_hours AS h FROM sync_state WHERE id = 1')
    .get() as { h: number } | undefined
  const hours = row?.h ?? 24
  const now = Date.now()
  db.prepare(
    'UPDATE sync_state SET running = 0, last_run_at = ?, next_run_at = ? WHERE id = 1'
  ).run(
    new Date(now).toISOString(),
    new Date(now + hours * 3600_000).toISOString()
  )
}

function insertLog(
  db: DB,
  row: {
    mode: SyncMode
    status: ImportResult['status']
    seen: number
    imported: number
    updated: number
    skipped: number
    failed: number
    durationMs: number
    message: string
    started_at: string
  }
): void {
  db.prepare(
    `INSERT INTO sync_logs
       (source, mode, status, trials_seen, trials_imported, trials_updated,
        trials_skipped, trials_failed, duration_ms, message, started_at, finished_at)
     VALUES ('ctis', @mode, @status, @seen, @imported, @updated, @skipped,
        @failed, @duration_ms, @message, @started_at, @finished_at)`
  ).run({
    mode: row.mode,
    status: row.status,
    seen: row.seen,
    imported: row.imported,
    updated: row.updated,
    skipped: row.skipped,
    failed: row.failed,
    duration_ms: row.durationMs,
    message: row.message.slice(0, 2000),
    started_at: row.started_at,
    finished_at: new Date().toISOString(),
  })
}

export interface SyncLogRow {
  id: number
  mode: string
  status: string
  trials_seen: number
  trials_imported: number
  trials_updated: number
  trials_skipped: number
  trials_failed: number
  duration_ms: number
  message: string | null
  started_at: string
  finished_at: string
}

/** Sync observability for the admin panel: latest run, latest error, history,
 *  scheduler state, and current catalogue stats (diseases/countries/total). */
export function getSyncStatus(db: DB = singleton): {
  last: SyncLogRow | null
  lastError: SyncLogRow | null
  recent: SyncLogRow[]
  state: {
    paused: boolean
    running: boolean
    interval_hours: number
    last_run_at: string | null
    next_run_at: string | null
  }
  catalogue: {
    totalTrials: number
    diseases: number
    countries: number
    supportedDiseaseAreas: number
  }
} {
  const recent = db
    .prepare('SELECT * FROM sync_logs ORDER BY id DESC LIMIT 10')
    .all() as SyncLogRow[]
  const lastError =
    (db
      .prepare(
        "SELECT * FROM sync_logs WHERE status = 'error' ORDER BY id DESC LIMIT 1"
      )
      .get() as SyncLogRow | undefined) ?? null
  const s = db.prepare('SELECT * FROM sync_state WHERE id = 1').get() as
    | {
        paused: number
        running: number
        interval_hours: number
        last_run_at: string | null
        next_run_at: string | null
      }
    | undefined
  const num = (sql: string) => (db.prepare(sql).get() as { c: number }).c
  return {
    last: recent[0] ?? null,
    lastError,
    recent,
    state: {
      paused: !!s?.paused,
      running: !!s?.running,
      interval_hours: s?.interval_hours ?? 24,
      last_run_at: s?.last_run_at ?? null,
      next_run_at: s?.next_run_at ?? null,
    },
    catalogue: {
      totalTrials: num('SELECT COUNT(*) AS c FROM trials'),
      diseases: num('SELECT COUNT(DISTINCT disease) AS c FROM trials'),
      countries: num(
        'SELECT COUNT(DISTINCT country) AS c FROM trial_countries'
      ),
      supportedDiseaseAreas: DISEASE_AREAS.length,
    },
  }
}
