import { Router, type Request, type Response } from 'express'
import { db } from '../db/index.js'
import { rowToGroup } from '../db/serialise.js'
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
