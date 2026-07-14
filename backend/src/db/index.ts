import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { config } from '../config.js'

export type DB = Database.Database

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
 * The application-wide database singleton (opens the file at `DB_PATH`).
 * Tests and scripts can open their own via `openDatabase(':memory:')`.
 */
export const db: DB = openDatabase(config.DB_PATH)
