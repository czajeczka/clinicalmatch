import { runImport, type SyncMode } from './importer.js'

// CLI entry for the CTIS importer.
//   npm run sync                 → full import (replace catalogue)
//   npm run sync:incremental     → incremental upsert of new/changed trials
// In the production image (no tsx): `node dist/sync/run.js [full|incremental]`.

async function main(): Promise<void> {
  const mode: SyncMode =
    process.argv[2] === 'incremental' ? 'incremental' : 'full'
  console.log(`[ctis-sync] starting ${mode} import…`)
  const result = await runImport({ mode })
  console.log(`[ctis-sync] ${result.status}: ${result.message}`)
  process.exit(result.status === 'error' ? 1 : 0)
}

main().catch((e) => {
  console.error('[ctis-sync] fatal:', e)
  process.exit(1)
})
