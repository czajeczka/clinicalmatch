import { Router, type Request, type Response } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db } from '../db/index.js'
import { rowToUser } from '../db/serialise.js'
import { validateBody } from '../lib/validation.js'
import type { User } from '../types.js'

// Interests are free-form disease-area labels (the platform now covers all CTIS
// areas, not a fixed five), so we validate shape only, not membership.
const interestsSchema = z.array(z.string().trim().min(1)).max(50)

const createUserSchema = z.object({
  id: z.string().min(1).optional(),
  display_name: z.string().trim().min(1),
  age: z.number().int().positive().optional(),
  city: z.string().trim().optional(),
  interests: interestsSchema,
})

const patchUserSchema = z
  .object({
    display_name: z.string().trim().min(1),
    age: z.number().int().positive().nullable(),
    city: z.string().trim().nullable(),
    interests: interestsSchema,
  })
  .partial()

// ---- DB access ----

function findUserRow(id: string): unknown {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id)
}

function getUser(id: string): User | null {
  const row = findUserRow(id)
  return row ? rowToUser(row as never) : null
}

const upsertStmt = db.prepare(`
  INSERT INTO users (id, display_name, age, city, interests, created_at)
  VALUES (@id, @display_name, @age, @city, @interests, @created_at)
  ON CONFLICT(id) DO UPDATE SET
    display_name = excluded.display_name,
    age = excluded.age,
    city = excluded.city,
    interests = excluded.interests
`)

function writeUser(user: User): void {
  upsertStmt.run({
    id: user.id,
    display_name: user.display_name,
    age: user.age ?? null,
    city: user.city ?? null,
    interests: JSON.stringify(user.interests),
    created_at: user.created_at,
  })
}

// ---- Routes ----

export const usersRouter = Router()

// POST /users — create (201) or upsert an existing id (200).
usersRouter.post(
  '/',
  validateBody(createUserSchema),
  (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof createUserSchema>
    const existing = body.id ? getUser(body.id) : null

    const user: User = {
      id: body.id ?? randomUUID(),
      display_name: body.display_name,
      age: body.age,
      city: body.city,
      interests: body.interests,
      created_at: existing?.created_at ?? new Date().toISOString(),
      // Role/email are never accepted from the request body — role is only ever
      // assigned by the seed. Preserve an existing account's role (so the admin
      // can't be downgraded by re-posting); new accounts are always 'user'.
      email: existing?.email,
      role: existing?.role ?? 'user',
    }
    writeUser(user)
    res.status(existing ? 200 : 201).json(user)
  }
)

// GET /users?interest=<Disease> — all users, or those following a disease.
usersRouter.get('/', (req: Request, res: Response) => {
  const interest = req.query.interest
  if (interest === undefined) {
    const rows = db
      .prepare('SELECT * FROM users ORDER BY created_at DESC')
      .all()
    res.json(rows.map((r) => rowToUser(r as never)))
    return
  }
  if (typeof interest !== 'string' || !interest.trim()) {
    res.status(400).json({ error: 'Invalid interest' })
    return
  }
  // json_each expands the JSON `interests` array so we match exact values.
  const rows = db
    .prepare(
      `SELECT DISTINCT u.* FROM users u, json_each(u.interests) je
       WHERE je.value = ? ORDER BY u.created_at DESC`
    )
    .all(interest.trim())
  res.json(rows.map((r) => rowToUser(r as never)))
})

// GET /users/:id
usersRouter.get('/:id', (req: Request<{ id: string }>, res: Response) => {
  const user = getUser(req.params.id)
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  res.json(user)
})

// PATCH /users/:id — partial update.
usersRouter.patch(
  '/:id',
  validateBody(patchUserSchema),
  (req: Request<{ id: string }>, res: Response) => {
    const existing = getUser(req.params.id)
    if (!existing) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    const patch = req.body as z.infer<typeof patchUserSchema>
    const updated: User = {
      ...existing,
      ...(patch.display_name !== undefined && {
        display_name: patch.display_name,
      }),
      ...(patch.age !== undefined && { age: patch.age ?? undefined }),
      ...(patch.city !== undefined && { city: patch.city ?? undefined }),
      ...(patch.interests !== undefined && { interests: patch.interests }),
    }
    writeUser(updated)
    res.json(updated)
  }
)
