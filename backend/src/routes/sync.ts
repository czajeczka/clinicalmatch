import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { requireAdmin } from '../middleware/identity.js'
import { validateBody } from '../lib/validation.js'
import { getSyncStatus, runImport, type SyncMode } from '../sync/importer.js'

// Admin-only observability + control for the CTIS importer. Not part of the
// public frontend API.
export const syncRouter = Router()

const runSchema = z.object({
  mode: z.enum(['full', 'incremental']).default('incremental'),
  diseases: z.array(z.string()).optional(), // labels; empty/absent = all
  countries: z.array(z.string()).optional(),
})

function isRunning(): boolean {
  const r = db.prepare('SELECT running FROM sync_state WHERE id = 1').get() as
    { running: number } | undefined
  return !!r?.running
}

// GET /admin/sync — status: last/lastError/recent + scheduler state + catalogue.
syncRouter.get('/', requireAdmin, (_req: Request, res: Response) => {
  res.json(getSyncStatus(db))
})

// POST /admin/sync/run — start an import in the background. Body selects mode,
// diseases and countries (import all Europe = defaults; force full = mode:full).
syncRouter.post(
  '/run',
  requireAdmin,
  validateBody(runSchema),
  (req: Request, res: Response) => {
    if (isRunning()) {
      res.status(409).json({ error: 'A synchronisation is already running' })
      return
    }
    const body = req.body as z.infer<typeof runSchema>
    const mode: SyncMode = body.mode
    // Fire-and-forget: runImport flips sync_state.running synchronously before
    // its first await, so a duplicate trigger is rejected above.
    void runImport({
      mode,
      diseases: body.diseases,
      countries: body.countries,
    }).catch((e) => console.error('[ctis-sync] background run failed', e))
    res.status(202).json({ started: true, mode })
  }
)

// POST /admin/sync/pause — stop the scheduler from auto-running.
syncRouter.post('/pause', requireAdmin, (_req: Request, res: Response) => {
  db.prepare('UPDATE sync_state SET paused = 1 WHERE id = 1').run()
  res.json(getSyncStatus(db).state)
})

// POST /admin/sync/resume
syncRouter.post('/resume', requireAdmin, (_req: Request, res: Response) => {
  db.prepare('UPDATE sync_state SET paused = 0 WHERE id = 1').run()
  res.json(getSyncStatus(db).state)
})
