import Database from 'better-sqlite3'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from '../config.js'

export type DB = Database.Database

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), 'schema.sql')

/** Add a column to a table if it isn't there yet (SQLite has no ADD COLUMN
 *  IF NOT EXISTS). Keeps already-created databases in sync with schema.sql. */
function ensureColumn(
  database: DB,
  table: string,
  column: string,
  ddl: string
): void {
  const cols = database.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string
  }[]
  if (!cols.some((c) => c.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
  }
}

/** Apply the schema (idempotent — CREATE ... IF NOT EXISTS) plus lightweight
 *  column migrations for databases created before a column existed. */
export function applySchema(database: DB): void {
  database.exec(readFileSync(schemaPath, 'utf8'))
  // Role-based access (added later): backfill onto existing users tables.
  ensureColumn(database, 'users', 'email', 'email TEXT')
  ensureColumn(database, 'users', 'role', "role TEXT NOT NULL DEFAULT 'user'")
  // CTIS importer columns added after the sync tables first shipped.
  ensureColumn(
    database,
    'sync_logs',
    'trials_skipped',
    'trials_skipped INTEGER NOT NULL DEFAULT 0'
  )
  ensureColumn(
    database,
    'sync_logs',
    'duration_ms',
    'duration_ms INTEGER NOT NULL DEFAULT 0'
  )
  for (const [col, ddl] of [
    ['source_id', 'source_id TEXT'],
    ['source_url', 'source_url TEXT'],
    ['sponsor', 'sponsor TEXT'],
    ['recruitment_status', 'recruitment_status TEXT'],
    ['countries', 'countries TEXT'],
  ]) {
    ensureColumn(database, 'trial_sync_meta', col, ddl)
  }
}

/** Open a database at `path` with sane pragmas (WAL, foreign keys). */
export function openDatabase(path: string): DB {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true })
  }
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

/**
 * The application-wide database singleton (opens the file at `DB_PATH`). The
 * schema is applied on open so route modules can prepare statements safely.
 * Tests and scripts can open their own via `openDatabase(':memory:')`.
 */
export const db: DB = openDatabase(config.DB_PATH)
applySchema(db)
