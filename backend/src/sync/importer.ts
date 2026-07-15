import { db as singleton, type DB } from '../db/index.js'
import { config } from '../config.js'
import {
  DISEASES,
  type Disease,
  type Trial,
  type TrialStatus,
} from '../types.js'
import {
  createCtisClient,
  type CtisClient,
  type CtisSearchRecord,
} from './ctisClient.js'
import {
  buildSourceMeta,
  mapCtisTrial,
  type TrialSourceMeta,
} from './ctisMapper.js'

// The importer turns CTIS data into rows in the existing `trials` table. It is
// backend-only, resilient (a failure never wipes good data), paginated, and
// writes a row to `sync_logs` for every run. Two modes:
//   full        — replace the catalogue (delete all trials + insert fresh)
//   incremental — upsert new/changed trials only (compared via CTIS lastUpdated)

const DISEASE_QUERIES: Record<Disease, string> = {
  'Breast Cancer': 'breast cancer',
  'Type 2 Diabetes': 'type 2 diabetes',
  'Rheumatoid Arthritis': 'rheumatoid arthritis',
  "Crohn's Disease": "crohn's disease",
  'Multiple Sclerosis': 'multiple sclerosis',
}

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
  durationMs: number
  message: string
}

interface Collected {
  trial: Trial
  lastUpdated: string
  meta: TrialSourceMeta
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function log(...args: unknown[]): void {
  console.log('[ctis-sync]', ...args)
}

/** Resolve the IMPORT_DISEASES env string to canonical diseases (empty = all). */
export function resolveDiseases(raw: string): Disease[] {
  const wanted = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (wanted.length === 0) return [...DISEASES]
  const matched = DISEASES.filter((d) => wanted.includes(d.toLowerCase()))
  return matched.length ? matched : [...DISEASES]
}

/** Resolve the IMPORT_STATUS env string to TrialStatus values (empty = all). */
export function resolveStatuses(raw: string): TrialStatus[] {
  const wanted = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (wanted.length === 0) return ALL_STATUSES
  const matched = ALL_STATUSES.filter((s) => wanted.includes(s.toLowerCase()))
  return matched.length ? matched : ALL_STATUSES
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

function applyToDb(
  db: DB,
  mode: SyncMode,
  collected: Collected[]
): { imported: number; updated: number; skippedUnchanged: number } {
  const upsert = db.prepare(`
    INSERT INTO trials (id, title, disease, phase, city, country, status,
      short_description, full_description, inclusion_criteria,
      exclusion_criteria, centers, contact_name, contact_email, contact_phone)
    VALUES (@id, @title, @disease, @phase, @city, @country, @status,
      @short_description, @full_description, @inclusion_criteria,
      @exclusion_criteria, @centers, @contact_name, @contact_email,
      @contact_phone)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title, disease=excluded.disease, phase=excluded.phase,
      city=excluded.city, country=excluded.country, status=excluded.status,
      short_description=excluded.short_description,
      full_description=excluded.full_description,
      inclusion_criteria=excluded.inclusion_criteria,
      exclusion_criteria=excluded.exclusion_criteria, centers=excluded.centers,
      contact_name=excluded.contact_name, contact_email=excluded.contact_email,
      contact_phone=excluded.contact_phone
  `)
  const upsertMeta = db.prepare(`
    INSERT INTO trial_sync_meta
      (trial_id, source, source_id, source_url, sponsor, recruitment_status,
       countries, ctis_last_updated, imported_at)
    VALUES (@trial_id, 'ctis', @source_id, @source_url, @sponsor,
       @recruitment_status, @countries, @lu, @now)
    ON CONFLICT(trial_id) DO UPDATE SET
      source_id=excluded.source_id, source_url=excluded.source_url,
      sponsor=excluded.sponsor, recruitment_status=excluded.recruitment_status,
      countries=excluded.countries, ctis_last_updated=excluded.ctis_last_updated,
      imported_at=excluded.imported_at
  `)
  const getMeta = db.prepare(
    'SELECT ctis_last_updated AS lu FROM trial_sync_meta WHERE trial_id = ?'
  )

  let imported = 0
  let updated = 0
  let skippedUnchanged = 0
  const tx = db.transaction(() => {
    if (mode === 'full') {
      // Replace the whole catalogue (this reconciles removals/deletions).
      // Saved references point at ids that no longer exist afterwards.
      db.prepare('DELETE FROM saved_trials').run()
      db.prepare('DELETE FROM trials').run()
      db.prepare('DELETE FROM trial_sync_meta').run()
    }
    const now = new Date().toISOString()
    for (const { trial, lastUpdated, meta } of collected) {
      if (mode === 'incremental') {
        const existing = getMeta.get(trial.id) as { lu: string } | undefined
        if (existing) {
          if (existing.lu === lastUpdated) {
            skippedUnchanged++
            continue // unchanged → skip
          }
          updated++
        } else {
          imported++
        }
      } else {
        imported++
      }
      upsert.run({
        ...trial,
        inclusion_criteria: JSON.stringify(trial.inclusion_criteria),
        exclusion_criteria: JSON.stringify(trial.exclusion_criteria),
        centers: JSON.stringify(trial.centers),
      })
      upsertMeta.run({
        trial_id: trial.id,
        source_id: meta.source_id,
        source_url: meta.source_url,
        sponsor: meta.sponsor,
        recruitment_status: meta.recruitment_status,
        countries: JSON.stringify(meta.countries),
        lu: lastUpdated,
        now,
      })
    }
  })
  tx()
  return { imported, updated, skippedUnchanged }
}

/**
 * Run a CTIS import. Paginates per canonical disease up to `limit`, enriches
 * each trial with its detail payload (falling back to search-only mapping if
 * detail fails), de-duplicates by CTIS id, applies IMPORT_STATUS filtering,
 * then writes to the DB in a single transaction. Always records a sync_logs
 * row; on a hard failure the existing catalogue is left untouched.
 */
export async function runImport(opts?: {
  db?: DB
  client?: CtisClient
  mode?: SyncMode
  limit?: number
  batchSize?: number
  diseases?: Disease[]
  statuses?: TrialStatus[]
}): Promise<ImportResult> {
  const db = opts?.db ?? singleton
  const client = opts?.client ?? createCtisClient()
  const mode: SyncMode = opts?.mode ?? 'full'
  const limit = opts?.limit ?? config.IMPORT_LIMIT
  const batchSize = opts?.batchSize ?? config.IMPORT_BATCH_SIZE
  const diseases = opts?.diseases ?? resolveDiseases(config.IMPORT_DISEASES)
  const statuses = opts?.statuses ?? resolveStatuses(config.IMPORT_STATUS)
  const started_at = new Date().toISOString()
  const startedMs = Date.now()

  let seen = 0
  let failed = 0
  let skipped = 0
  let detailFallbacks = 0
  const errors: string[] = []
  const byId = new Map<string, Collected>() // de-dupe across disease queries

  log(
    `starting ${mode} import — diseases=[${diseases.join(', ')}] limit=${limit}` +
      ` batchSize=${batchSize} statuses=[${statuses.join(', ')}]`
  )

  try {
    for (const disease of diseases) {
      const term = DISEASE_QUERIES[disease]
      let page = 1
      let gathered = 0
      // Paginate until we hit `limit` for this disease or run out of pages.
      while (gathered < limit) {
        const response = await client.search(term, page, batchSize)
        const data = (response.data ?? []) as CtisSearchRecord[]
        if (data.length === 0) break
        for (const record of data) {
          if (gathered >= limit) break
          const id = String(record.ctNumber ?? '')
          if (!id || byId.has(id)) continue // dedupe (also across diseases)
          seen++
          gathered++
          let detail: unknown = null
          try {
            detail = await client.retrieve(id)
          } catch (e) {
            detailFallbacks++
            errors.push(`detail ${id}: ${errMsg(e)}`)
          }
          const trial = mapCtisTrial({ search: record, detail, disease })
          if (!trial) {
            failed++
            continue
          }
          if (!statuses.includes(trial.status)) {
            skipped++ // filtered out by IMPORT_STATUS
            continue
          }
          byId.set(id, {
            trial,
            lastUpdated: String(record.lastUpdated ?? ''),
            meta: buildSourceMeta(record, detail),
          })
        }
        if (!response.pagination?.nextPage) break
        page++
      }
      log(`  ${disease}: gathered ${gathered}`)
    }

    const collected = [...byId.values()]
    if (collected.length === 0) {
      // Distinguish a failed/empty *fetch* (treat as error, never wipe) from a
      // successful fetch where everything was filtered out (valid, no changes).
      if (seen === 0) {
        throw new Error(
          'CTIS returned no records; existing catalogue left unchanged'
        )
      }
      const durationMs = Date.now() - startedMs
      const status: ImportResult['status'] =
        failed > 0 || detailFallbacks > 0 ? 'partial' : 'success'
      const message = `${mode}: 0 trials matched (of ${seen} seen); catalogue left unchanged.`
      log(status, message)
      insertLog(db, {
        mode,
        status,
        seen,
        imported: 0,
        updated: 0,
        skipped,
        failed,
        durationMs,
        message,
        started_at,
      })
      return {
        mode,
        status,
        seen,
        imported: 0,
        updated: 0,
        skipped,
        failed,
        durationMs,
        message,
      }
    }

    const applied = applyToDb(db, mode, collected)
    const imported = applied.imported
    const updated = applied.updated
    skipped += applied.skippedUnchanged
    const durationMs = Date.now() - startedMs
    const status: ImportResult['status'] =
      failed > 0 || detailFallbacks > 0 ? 'partial' : 'success'
    const message =
      `${mode}: ${imported} imported, ${updated} updated, ${skipped} skipped, ` +
      `${failed} failed, ${detailFallbacks} detail fallback(s) in ${durationMs}ms.` +
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
    return {
      mode,
      status,
      seen,
      imported,
      updated,
      skipped,
      failed,
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
      imported: 0,
      updated: 0,
      skipped,
      failed,
      durationMs,
      message,
      started_at,
    })
    return {
      mode,
      status: 'error',
      seen,
      imported: 0,
      updated: 0,
      skipped,
      failed,
      durationMs,
      message,
    }
  }
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

/** Sync observability for the admin panel: latest run, latest error, history. */
export function getSyncStatus(db: DB = singleton): {
  last: SyncLogRow | null
  lastError: SyncLogRow | null
  recent: SyncLogRow[]
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
  return { last: recent[0] ?? null, lastError, recent }
}
