import { applySchema, db as singleton, type DB } from './index.js'

/** Apply the schema (idempotent — CREATE ... IF NOT EXISTS). */
export function migrate(database: DB = singleton): void {
  applySchema(database)
}

// `npm run migrate` runs this module directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
  console.log('Schema applied.')
}
