import { Router, type Request, type Response } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db } from '../db/index.js'
import { rowToReply } from '../db/serialise.js'
import { requireUser } from '../middleware/identity.js'
import { validateBody } from '../lib/validation.js'
import type { Reply } from '../types.js'

const createSchema = z.object({ content: z.string().trim().min(1) })

function discussionExists(id: string): boolean {
  return !!db.prepare('SELECT 1 FROM discussions WHERE id = ?').get(id)
}

function authorName(userId: string): string {
  const row = db
    .prepare('SELECT display_name FROM users WHERE id = ?')
    .get(userId) as { display_name: string } | undefined
  return row?.display_name ?? 'You'
}

export const repliesRouter = Router()

// GET /discussions/:discussionId/replies — public; oldest-first.
// reply_count stays derived, so no counter maintenance is needed here.
repliesRouter.get(
  '/discussions/:discussionId/replies',
  (req: Request<{ discussionId: string }>, res: Response) => {
    if (!discussionExists(req.params.discussionId)) {
      res.status(404).json({ error: 'Discussion not found' })
      return
    }
    const rows = db
      .prepare(
        `SELECT * FROM replies WHERE discussion_id = ?
         ORDER BY created_at ASC, rowid ASC`
      )
      .all(req.params.discussionId)
    res.json(rows.map((r) => rowToReply(r as never)))
  }
)

// POST /discussions/:discussionId/replies — identity required.
repliesRouter.post(
  '/discussions/:discussionId/replies',
  requireUser,
  validateBody(createSchema),
  (req: Request<{ discussionId: string }>, res: Response) => {
    if (!discussionExists(req.params.discussionId)) {
      res.status(404).json({ error: 'Discussion not found' })
      return
    }
    const userId = req.userId as string
    const { content } = req.body as z.infer<typeof createSchema>
    const reply: Reply = {
      id: randomUUID(),
      discussion_id: req.params.discussionId,
      author_id: userId,
      author_name: authorName(userId),
      content,
      created_at: new Date().toISOString(),
    }
    db.prepare(
      `INSERT INTO replies (id, discussion_id, author_id, author_name, content, created_at)
       VALUES (@id, @discussion_id, @author_id, @author_name, @content, @created_at)`
    ).run(reply)
    res.status(201).json(reply)
  }
)

// DELETE /replies/:id — author only.
repliesRouter.delete(
  '/replies/:id',
  requireUser,
  (req: Request<{ id: string }>, res: Response) => {
    const row = db
      .prepare('SELECT author_id FROM replies WHERE id = ?')
      .get(req.params.id) as { author_id: string } | undefined
    if (!row) {
      res.status(404).json({ error: 'Reply not found' })
      return
    }
    if (row.author_id !== req.userId) {
      res.status(403).json({ error: 'You can only delete your own replies' })
      return
    }
    db.prepare('DELETE FROM replies WHERE id = ?').run(req.params.id)
    res.status(204).end()
  }
)
