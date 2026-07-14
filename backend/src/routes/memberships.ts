import { Router, type Request, type Response } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db } from '../db/index.js'
import { requireUser } from '../middleware/identity.js'
import { validateBody } from '../lib/validation.js'
import { groupExists, groupsForUser } from './groups.js'

const joinSchema = z.object({ group_id: z.string().min(1) })

interface MembershipRow {
  id: string
  user_id: string
  group_id: string
  created_at: string
}

export const membershipsRouter = Router()

// Every membership route needs an identity.
membershipsRouter.use(requireUser)

// GET /memberships — the current user's joined groups (full SupportGroup[]).
membershipsRouter.get('/', (req: Request, res: Response) => {
  res.json(groupsForUser(req.userId as string))
})

// POST /memberships { group_id } — idempotent join (201 first time, 200 if already joined).
membershipsRouter.post(
  '/',
  validateBody(joinSchema),
  (req: Request, res: Response) => {
    const userId = req.userId as string
    const { group_id } = req.body as z.infer<typeof joinSchema>

    if (!groupExists(group_id)) {
      res.status(404).json({ error: 'Group not found' })
      return
    }

    const existing = db
      .prepare(
        'SELECT * FROM group_memberships WHERE user_id = ? AND group_id = ?'
      )
      .get(userId, group_id) as MembershipRow | undefined
    if (existing) {
      res.status(200).json(existing)
      return
    }

    const record: MembershipRow = {
      id: randomUUID(),
      user_id: userId,
      group_id,
      created_at: new Date().toISOString(),
    }
    db.prepare(
      `INSERT INTO group_memberships (id, user_id, group_id, created_at)
       VALUES (@id, @user_id, @group_id, @created_at)`
    ).run(record)
    res.status(201).json(record)
  }
)

// DELETE /memberships/:groupId — leave; always 204 (idempotent).
membershipsRouter.delete(
  '/:groupId',
  (req: Request<{ groupId: string }>, res: Response) => {
    db.prepare(
      'DELETE FROM group_memberships WHERE user_id = ? AND group_id = ?'
    ).run(req.userId, req.params.groupId)
    res.status(204).end()
  }
)
