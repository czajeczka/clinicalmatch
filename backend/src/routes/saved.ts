import { Router, type Request, type Response } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db } from '../db/index.js'
import { rowToTrial } from '../db/serialise.js'
import { requireUser } from '../middleware/identity.js'
import { validateBody } from '../lib/validation.js'
import type { Trial } from '../types.js'

const saveSchema = z.object({ trial_id: z.string().min(1) })

interface SavedTrialRow {
  id: string
  user_id: string
  trial_id: string
  created_at: string
}

export const savedRouter = Router()

// Every saved-trials route needs an identity.
savedRouter.use(requireUser)

// GET /saved-trials — the current user's saved trials as full Trial[], newest first.
savedRouter.get('/', (req: Request, res: Response) => {
  const rows = db
    .prepare(
      `SELECT t.* FROM saved_trials s
       JOIN trials t ON t.id = s.trial_id
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC, s.rowid DESC`
    )
    .all(req.userId)
  const trials: Trial[] = rows.map((r) => rowToTrial(r as never))
  res.json(trials)
})

// POST /saved-trials { trial_id } — idempotent save (201 first time, 200 if already saved).
savedRouter.post(
  '/',
  validateBody(saveSchema),
  (req: Request, res: Response) => {
    const userId = req.userId as string
    const { trial_id } = req.body as z.infer<typeof saveSchema>

    const trialExists = db
      .prepare('SELECT 1 FROM trials WHERE id = ?')
      .get(trial_id)
    if (!trialExists) {
      res.status(404).json({ error: 'Trial not found' })
      return
    }

    const existing = db
      .prepare('SELECT * FROM saved_trials WHERE user_id = ? AND trial_id = ?')
      .get(userId, trial_id) as SavedTrialRow | undefined
    if (existing) {
      res.status(200).json(existing)
      return
    }

    const record: SavedTrialRow = {
      id: randomUUID(),
      user_id: userId,
      trial_id,
      created_at: new Date().toISOString(),
    }
    db.prepare(
      `INSERT INTO saved_trials (id, user_id, trial_id, created_at)
     VALUES (@id, @user_id, @trial_id, @created_at)`
    ).run(record)
    res.status(201).json(record)
  }
)

// DELETE /saved-trials/:trialId — idempotent un-save (always 204).
savedRouter.delete(
  '/:trialId',
  (req: Request<{ trialId: string }>, res: Response) => {
    db.prepare(
      'DELETE FROM saved_trials WHERE user_id = ? AND trial_id = ?'
    ).run(req.userId, req.params.trialId)
    res.status(204).end()
  }
)
