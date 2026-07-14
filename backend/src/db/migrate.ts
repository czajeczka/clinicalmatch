import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { db as singleton, type DB } from './index.js'

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), 'schema.sql')

/** Apply the schema (idempotent — CREATE ... IF NOT EXISTS). */
export function migrate(database: DB = singleton): void {
  const schema = readFileSync(schemaPath, 'utf8')
  database.exec(schema)
}

// `npm run migrate` runs this module directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
  console.log('Schema applied.')
}
