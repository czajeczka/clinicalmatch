import { Router, type Request, type Response } from 'express'
import { db } from '../db/index.js'
import { requireAdmin } from '../middleware/identity.js'
import { getSyncStatus } from '../sync/importer.js'

// Admin-only observability for the CTIS importer. This is admin tooling, not
// part of the public frontend API (which is unchanged).
export const syncRouter = Router()

// GET /admin/sync — latest run, latest error, and recent history.
syncRouter.get('/', requireAdmin, (_req: Request, res: Response) => {
  res.json(getSyncStatus(db))
})
