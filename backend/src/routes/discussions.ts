import { Router, type Request, type Response } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db } from '../db/index.js'
import { rowToDiscussion } from '../db/serialise.js'
import { requireUser } from '../middleware/identity.js'
import { validateBody } from '../lib/validation.js'
import { groupExists } from './groups.js'
import type { Discussion } from '../types.js'

const createSchema = z.object({
  group_id: z.string().min(1),
  title: z.string().trim().optional(),
  content: z.string().trim().min(1),
  tags: z.array(z.string()).optional(),
  summary: z.string().trim().optional(),
})

const patchSchema = z
  .object({
    title: z.string().trim().nullable(),
    content: z.string().trim().min(1),
    tags: z.array(z.string()),
  })
  .partial()

// reply_count is DERIVED (COUNT of replies), never stored — see chunk 3.
const WITH_REPLY_COUNT = `d.*, (SELECT COUNT(*) FROM replies r WHERE r.discussion_id = d.id) AS reply_count`

function mapRow(row: unknown): Discussion {
  const r = row as { reply_count: number }
  return rowToDiscussion(row as never, Number(r.reply_count))
}

function getDiscussion(id: string): Discussion | undefined {
  const row = db
    .prepare(`SELECT ${WITH_REPLY_COUNT} FROM discussions d WHERE d.id = ?`)
    .get(id)
  return row ? mapRow(row) : undefined
}

function authorName(userId: string): string {
  const row = db
    .prepare('SELECT display_name FROM users WHERE id = ?')
    .get(userId) as { display_name: string } | undefined
  return row?.display_name ?? 'You'
}

export const discussionsRouter = Router()

// GET /groups/:groupId/discussions — public; newest first.
discussionsRouter.get(
  '/groups/:groupId/discussions',
  (req: Request<{ groupId: string }>, res: Response) => {
    const rows = db
      .prepare(
        `SELECT ${WITH_REPLY_COUNT} FROM discussions d
         WHERE d.group_id = ?
         ORDER BY d.created_at DESC, d.rowid DESC`
      )
      .all(req.params.groupId)
    res.json(rows.map(mapRow))
  }
)

// GET /discussions/:id — public.
discussionsRouter.get(
  '/discussions/:id',
  (req: Request<{ id: string }>, res: Response) => {
    const discussion = getDiscussion(req.params.id)
    if (!discussion) {
      res.status(404).json({ error: 'Discussion not found' })
      return
    }
    res.json(discussion)
  }
)

// POST /discussions — create (identity required). No AI here — the optional
// AI post-enhancement is deferred (frontend keeps it mocked; TODO: LLM API,
// seminar 6). Publishing works fully without it.
discussionsRouter.post(
  '/discussions',
  requireUser,
  validateBody(createSchema),
  (req: Request, res: Response) => {
    const userId = req.userId as string
    const body = req.body as z.infer<typeof createSchema>

    if (!groupExists(body.group_id)) {
      res.status(404).json({ error: 'Group not found' })
      return
    }

    const discussion: Discussion = {
      id: randomUUID(),
      group_id: body.group_id,
      author_id: userId,
      author_name: authorName(userId),
      title: body.title || undefined,
      content: body.content,
      tags: body.tags ?? [],
      summary: body.summary || undefined,
      created_at: new Date().toISOString(),
      reply_count: 0,
    }
    db.prepare(
      `INSERT INTO discussions (id, group_id, author_id, author_name, title,
        content, tags, summary, created_at)
       VALUES (@id, @group_id, @author_id, @author_name, @title, @content,
        @tags, @summary, @created_at)`
    ).run({
      ...discussion,
      title: discussion.title ?? null,
      summary: discussion.summary ?? null,
      tags: JSON.stringify(discussion.tags),
    })
    res.status(201).json(discussion)
  }
)

// PATCH /discussions/:id — author only.
discussionsRouter.patch(
  '/discussions/:id',
  requireUser,
  validateBody(patchSchema),
  (req: Request<{ id: string }>, res: Response) => {
    const existing = getDiscussion(req.params.id)
    if (!existing) {
      res.status(404).json({ error: 'Discussion not found' })
      return
    }
    if (existing.author_id !== req.userId) {
      res.status(403).json({ error: 'You can only edit your own posts' })
      return
    }
    const patch = req.body as z.infer<typeof patchSchema>
    const updated: Discussion = {
      ...existing,
      ...(patch.title !== undefined && { title: patch.title ?? undefined }),
      ...(patch.content !== undefined && { content: patch.content }),
      ...(patch.tags !== undefined && { tags: patch.tags }),
    }
    db.prepare(
      `UPDATE discussions SET title = @title, content = @content, tags = @tags
       WHERE id = @id`
    ).run({
      id: updated.id,
      title: updated.title ?? null,
      content: updated.content,
      tags: JSON.stringify(updated.tags),
    })
    res.json(updated)
  }
)

// DELETE /discussions/:id — author only; also removes its replies.
discussionsRouter.delete(
  '/discussions/:id',
  requireUser,
  (req: Request<{ id: string }>, res: Response) => {
    const existing = getDiscussion(req.params.id)
    if (!existing) {
      res.status(404).json({ error: 'Discussion not found' })
      return
    }
    if (existing.author_id !== req.userId) {
      res.status(403).json({ error: 'You can only delete your own posts' })
      return
    }
    const tx = db.transaction((id: string) => {
      db.prepare('DELETE FROM replies WHERE discussion_id = ?').run(id)
      db.prepare('DELETE FROM discussions WHERE id = ?').run(id)
    })
    tx(req.params.id)
    res.status(204).end()
  }
)
