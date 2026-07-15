import { Router, type Request, type Response } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db } from '../db/index.js'
import { rowToGroup } from '../db/serialise.js'
import { requireAdmin } from '../middleware/identity.js'
import { diseaseSchema, validateBody } from '../lib/validation.js'
import type { SupportGroup } from '../types.js'

// member_count is LIVE: the seeded base (a realistic starting number) plus the
// count of actual group_memberships. The stored column is the base and is never
// mutated; joining/leaving changes the count via this expression.
const LIVE_MEMBER_COUNT =
  'g.member_count + (SELECT COUNT(*) FROM group_memberships m WHERE m.group_id = g.id)'

const GROUP_COLUMNS = `g.id, g.name, g.disease, g.description, g.color, ${LIVE_MEMBER_COUNT} AS member_count`

export function allGroups(): SupportGroup[] {
  return db
    .prepare(`SELECT ${GROUP_COLUMNS} FROM support_groups g ORDER BY g.rowid`)
    .all()
    .map((r) => rowToGroup(r as never))
}

export function getGroup(id: string): SupportGroup | undefined {
  const row = db
    .prepare(`SELECT ${GROUP_COLUMNS} FROM support_groups g WHERE g.id = ?`)
    .get(id)
  return row ? rowToGroup(row as never) : undefined
}

/** Groups the given user has joined (with live member_count), newest first. */
export function groupsForUser(userId: string): SupportGroup[] {
  return db
    .prepare(
      `SELECT ${GROUP_COLUMNS} FROM support_groups g
       JOIN group_memberships m ON m.group_id = g.id
       WHERE m.user_id = ?
       ORDER BY m.created_at DESC, m.rowid DESC`
    )
    .all(userId)
    .map((r) => rowToGroup(r as never))
}

export function groupExists(id: string): boolean {
  return !!db.prepare('SELECT 1 FROM support_groups WHERE id = ?').get(id)
}

export const groupsRouter = Router()

// GET /groups  (public)
groupsRouter.get('/', (_req: Request, res: Response) => {
  res.json(allGroups())
})

// GET /groups/:id  (public)
groupsRouter.get('/:id', (req: Request<{ id: string }>, res: Response) => {
  const group = getGroup(req.params.id)
  if (!group) {
    res.status(404).json({ error: 'Group not found' })
    return
  }
  res.json(group)
})

// ---- Admin write endpoints ----

const groupBodySchema = z.object({
  name: z.string().trim().min(1),
  disease: diseaseSchema,
  description: z.string().trim().min(1),
  color: z.string().trim().min(1),
})
const groupPatchSchema = groupBodySchema.partial()

// POST /groups  (admin) — create a support group.
groupsRouter.post(
  '/',
  requireAdmin,
  validateBody(groupBodySchema),
  (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof groupBodySchema>
    const id = `g-${randomUUID()}`
    db.prepare(
      `INSERT INTO support_groups (id, name, disease, description, color, member_count)
       VALUES (@id, @name, @disease, @description, @color, 0)`
    ).run({ id, ...body })
    res.status(201).json(getGroup(id))
  }
)

// PATCH /groups/:id  (admin) — edit a support group.
groupsRouter.patch(
  '/:id',
  requireAdmin,
  validateBody(groupPatchSchema),
  (req: Request<{ id: string }>, res: Response) => {
    const existing = getGroup(req.params.id)
    if (!existing) {
      res.status(404).json({ error: 'Group not found' })
      return
    }
    const patch = req.body as z.infer<typeof groupPatchSchema>
    const merged = { ...existing, ...patch }
    db.prepare(
      `UPDATE support_groups
       SET name = @name, disease = @disease, description = @description, color = @color
       WHERE id = @id`
    ).run({
      id: req.params.id,
      name: merged.name,
      disease: merged.disease,
      description: merged.description,
      color: merged.color,
    })
    res.json(getGroup(req.params.id))
  }
)

// DELETE /groups/:id  (admin) — delete a group and everything hanging off it
// (memberships, its discussions, and those discussions' replies).
groupsRouter.delete(
  '/:id',
  requireAdmin,
  (req: Request<{ id: string }>, res: Response) => {
    if (!groupExists(req.params.id)) {
      res.status(404).json({ error: 'Group not found' })
      return
    }
    const tx = db.transaction((id: string) => {
      db.prepare(
        `DELETE FROM replies WHERE discussion_id IN
           (SELECT id FROM discussions WHERE group_id = ?)`
      ).run(id)
      db.prepare('DELETE FROM discussions WHERE group_id = ?').run(id)
      db.prepare('DELETE FROM group_memberships WHERE group_id = ?').run(id)
      db.prepare('DELETE FROM support_groups WHERE id = ?').run(id)
    })
    tx(req.params.id)
    res.status(204).end()
  }
)
