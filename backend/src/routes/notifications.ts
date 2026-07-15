import { Router, type Request, type Response } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db } from '../db/index.js'
import { rowToNotification } from '../db/serialise.js'
import { validateBody } from '../lib/validation.js'
import { requireAdmin } from '../middleware/identity.js'
import type { AppNotification } from '../types.js'

const createSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  trial_id: z.string().optional(),
})

const patchSchema = z.object({ read: z.boolean() })

export const notificationsRouter = Router()

// GET /notifications — global demo list, newest first (not user-scoped, matches
// the frontend's getNotifications()).
notificationsRouter.get('/', (_req: Request, res: Response) => {
  const rows = db
    .prepare('SELECT * FROM notifications ORDER BY created_at DESC, rowid DESC')
    .all()
  res.json(rows.map((r) => rowToNotification(r as never)))
})

// POST /notifications — create an announcement (ADMIN only).
// TODO: n8n workflow (later seminar) — this is also the endpoint the deferred
// n8n email workflow will call to "log the interaction"; that automated caller
// authenticates with the admin identity. The AI-written email summary itself is
// deferred (LLM feature, seminar 6). Here we only store.
notificationsRouter.post(
  '/',
  requireAdmin,
  validateBody(createSchema),
  (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof createSchema>
    const notification: AppNotification = {
      id: randomUUID(),
      title: body.title,
      body: body.body,
      trial_id: body.trial_id,
      created_at: new Date().toISOString(),
      read: false,
    }
    db.prepare(
      `INSERT INTO notifications (id, title, body, trial_id, created_at, read)
       VALUES (@id, @title, @body, @trial_id, @created_at, @read)`
    ).run({
      ...notification,
      trial_id: notification.trial_id ?? null,
      read: 0,
    })
    res.status(201).json(notification)
  }
)

// PATCH /notifications/:id — mark read/unread.
notificationsRouter.patch(
  '/:id',
  validateBody(patchSchema),
  (req: Request<{ id: string }>, res: Response) => {
    const row = db
      .prepare('SELECT * FROM notifications WHERE id = ?')
      .get(req.params.id)
    if (!row) {
      res.status(404).json({ error: 'Notification not found' })
      return
    }
    const { read } = req.body as z.infer<typeof patchSchema>
    db.prepare('UPDATE notifications SET read = ? WHERE id = ?').run(
      read ? 1 : 0,
      req.params.id
    )
    res.json({ ...rowToNotification(row as never), read })
  }
)

// DELETE /notifications/:id — remove an announcement (ADMIN only).
notificationsRouter.delete(
  '/:id',
  requireAdmin,
  (req: Request<{ id: string }>, res: Response) => {
    const row = db
      .prepare('SELECT 1 FROM notifications WHERE id = ?')
      .get(req.params.id)
    if (!row) {
      res.status(404).json({ error: 'Notification not found' })
      return
    }
    db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id)
    res.status(204).end()
  }
)
