import { db } from '../db/index.js'
import { runImport } from './importer.js'

// Minimal in-process scheduler. Every CHECK_MS it runs an incremental sync if
// one is due (next_run_at reached), not paused, and not already running.
// `next_run_at` is set after each run (finishState) from SYNC_INTERVAL_HOURS,
// so nothing auto-runs until at least one manual/admin run has happened.
const CHECK_MS = 15 * 60 * 1000

export function startScheduler(): NodeJS.Timeout {
  const timer = setInterval(() => {
    try {
      const s = db.prepare('SELECT * FROM sync_state WHERE id = 1').get() as
        | { paused: number; running: number; next_run_at: string | null }
        | undefined
      if (!s || s.paused || s.running || !s.next_run_at) return
      if (Date.now() < new Date(s.next_run_at).getTime()) return
      console.log('[ctis-sync] scheduler: incremental sync is due')
      void runImport({ mode: 'incremental' }).catch((e) =>
        console.error('[ctis-sync] scheduled run failed', e)
      )
    } catch (e) {
      console.error('[ctis-sync] scheduler tick failed', e)
    }
  }, CHECK_MS)
  timer.unref?.()
  return timer
}
