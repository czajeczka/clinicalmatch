import { db as singleton, type DB } from '../db/index.js'
import { config } from '../config.js'
import { DISEASES, type Disease, type Trial } from '../types.js'
import {
  createCtisClient,
  type CtisClient,
  type CtisSearchRecord,
} from './ctisClient.js'
import { mapCtisTrial } from './ctisMapper.js'

// The importer turns CTIS data into rows in the existing `trials` table. It is
// backend-only, resilient (a failure never wipes good data), and writes a row
// to `sync_logs` for every run. Two modes:
//   full        — replace the catalogue (delete all trials + insert fresh)
//   incremental — upsert new/changed trials only (compared via CTIS lastUpdated)

const DISEASE_QUERIES: Record<Disease, string> = {
  'Breast Cancer': 'breast cancer',
  'Type 2 Diabetes': 'type 2 diabetes',
  'Rheumatoid Arthritis': 'rheumatoid arthritis',
  "Crohn's Disease": "crohn's disease",
  'Multiple Sclerosis': 'multiple sclerosis',
}

export type SyncMode = 'full' | 'incremental'

export interface ImportResult {
  mode: SyncMode
  status: 'success' | 'partial' | 'error'
  seen: number
  imported: number
  updated: number
  failed: number
  message: string
}

interface Collected {
  trial: Trial
  lastUpdated: string
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function insertLog(
  db: DB,
  row: Omit<ImportResult, 'message'> & {
    message: string
    started_at: string
  }
): void {
  db.prepare(
    `INSERT INTO sync_logs
       (source, mode, status, trials_seen, trials_imported, trials_updated,
        trials_failed, message, started_at, finished_at)
     VALUES ('ctis', @mode, @status, @seen, @imported, @updated, @failed,
        @message, @started_at, @finished_at)`
  ).run({
    mode: row.mode,
    status: row.status,
    seen: row.seen,
    imported: row.imported,
    updated: row.updated,
    failed: row.failed,
    message: row.message.slice(0, 1000),
    started_at: row.started_at,
    finished_at: new Date().toISOString(),
  })
}

function applyToDb(
  db: DB,
  mode: SyncMode,
  collected: Collected[]
): { imported: number; updated: number } {
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
    INSERT INTO trial_sync_meta (trial_id, source, ctis_last_updated, imported_at)
    VALUES (@trial_id, 'ctis', @lu, @now)
    ON CONFLICT(trial_id) DO UPDATE SET
      ctis_last_updated=excluded.ctis_last_updated, imported_at=excluded.imported_at
  `)
  const getMeta = db.prepare(
    'SELECT ctis_last_updated AS lu FROM trial_sync_meta WHERE trial_id = ?'
  )

  let imported = 0
  let updated = 0
  const tx = db.transaction(() => {
    if (mode === 'full') {
      // Replace the whole catalogue. Saved references point at ids that no
      // longer exist after a full re-import, so clear them too.
      db.prepare('DELETE FROM saved_trials').run()
      db.prepare('DELETE FROM trials').run()
      db.prepare('DELETE FROM trial_sync_meta').run()
    }
    const now = new Date().toISOString()
    for (const { trial, lastUpdated } of collected) {
      if (mode === 'incremental') {
        const existing = getMeta.get(trial.id) as { lu: string } | undefined
        if (existing) {
          if (existing.lu === lastUpdated) continue // unchanged → skip
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
      upsertMeta.run({ trial_id: trial.id, lu: lastUpdated, now })
    }
  })
  tx()
  return { imported, updated }
}

/**
 * Run a CTIS import. Fetches per canonical disease, enriches each trial with
 * its detail payload (falling back to search-only mapping if detail fails),
 * then applies to the DB in a single transaction. Always records a sync_logs
 * row; on a hard failure the existing catalogue is left untouched.
 */
export async function runImport(opts?: {
  db?: DB
  client?: CtisClient
  mode?: SyncMode
  perDisease?: number
  diseases?: Disease[]
}): Promise<ImportResult> {
  const db = opts?.db ?? singleton
  const client = opts?.client ?? createCtisClient()
  const mode: SyncMode = opts?.mode ?? 'full'
  const perDisease = opts?.perDisease ?? config.CTIS_PER_DISEASE
  const diseases = opts?.diseases ?? [...DISEASES]
  const started_at = new Date().toISOString()

  let seen = 0
  let failed = 0
  const errors: string[] = []
  const collected: Collected[] = []

  try {
    for (const disease of diseases) {
      const term = DISEASE_QUERIES[disease]
      const response = await client.search(term, 1, perDisease)
      const records = (response.data ?? []).slice(0, perDisease)
      for (const record of records as CtisSearchRecord[]) {
        seen++
        let detail: unknown = null
        try {
          detail = await client.retrieve(record.ctNumber)
        } catch (e) {
          // Detail is best-effort; fall back to search-only mapping.
          failed++
          errors.push(`detail ${record.ctNumber}: ${errMsg(e)}`)
        }
        const trial = mapCtisTrial({ search: record, detail, disease })
        if (trial) {
          collected.push({
            trial,
            lastUpdated: String(record.lastUpdated ?? ''),
          })
        }
      }
    }

    if (collected.length === 0) {
      // Don't wipe a good catalogue because of an empty/failed fetch.
      throw new Error(
        'CTIS returned no mappable trials; existing catalogue left unchanged'
      )
    }

    const { imported, updated } = applyToDb(db, mode, collected)
    const status: ImportResult['status'] = failed > 0 ? 'partial' : 'success'
    const message =
      `${mode} import: ${imported} new, ${updated} updated, ${failed} detail failure(s).` +
      (errors.length ? ` First errors: ${errors.slice(0, 3).join(' | ')}` : '')
    insertLog(db, {
      mode,
      status,
      seen,
      imported,
      updated,
      failed,
      message,
      started_at,
    })
    return { mode, status, seen, imported, updated, failed, message }
  } catch (e) {
    const message = errMsg(e)
    insertLog(db, {
      mode,
      status: 'error',
      seen,
      imported: 0,
      updated: 0,
      failed,
      message,
      started_at,
    })
    return {
      mode,
      status: 'error',
      seen,
      imported: 0,
      updated: 0,
      failed,
      message,
    }
  }
}
