import { Router, type Request, type Response } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db } from '../db/index.js'
import { rowToTrial } from '../db/serialise.js'
import { requireAdmin } from '../middleware/identity.js'
import { diseaseSchema, validateBody } from '../lib/validation.js'
import { filterTrials } from './trials.query.js'
import { DISEASES, type Disease, type Trial } from '../types.js'

function getAllTrials(): Trial[] {
  return db
    .prepare('SELECT * FROM trials ORDER BY rowid')
    .all()
    .map((r) => rowToTrial(r as never))
}

function getTrial(id: string): Trial | undefined {
  const row = db.prepare('SELECT * FROM trials WHERE id = ?').get(id)
  return row ? rowToTrial(row as never) : undefined
}

function isDisease(value: string): value is Disease {
  return (DISEASES as readonly string[]).includes(value)
}

// ---- Admin write schema ----

const centerSchema = z.object({
  name: z.string().trim().min(1),
  city: z.string().trim().min(1),
  country: z.string().trim().min(1),
})

const trialBodySchema = z.object({
  title: z.string().trim().min(1),
  disease: diseaseSchema,
  phase: z.string().trim().min(1),
  city: z.string().trim().min(1),
  country: z.string().trim().min(1),
  status: z.enum(['recruiting', 'not yet recruiting', 'closed', 'completed']),
  short_description: z.string().trim().min(1),
  full_description: z.string().trim().min(1),
  inclusion_criteria: z.array(z.string()).default([]),
  exclusion_criteria: z.array(z.string()).default([]),
  centers: z.array(centerSchema).default([]),
  contact_name: z.string().trim().min(1),
  contact_email: z.string().trim().min(1),
  contact_phone: z.string().trim().min(1),
})
const trialPatchSchema = trialBodySchema.partial()

const writeStmt = db.prepare(`
  INSERT INTO trials (id, title, disease, phase, city, country, status,
    short_description, full_description, inclusion_criteria, exclusion_criteria,
    centers, contact_name, contact_email, contact_phone)
  VALUES (@id, @title, @disease, @phase, @city, @country, @status,
    @short_description, @full_description, @inclusion_criteria,
    @exclusion_criteria, @centers, @contact_name, @contact_email, @contact_phone)
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title, disease = excluded.disease, phase = excluded.phase,
    city = excluded.city, country = excluded.country, status = excluded.status,
    short_description = excluded.short_description,
    full_description = excluded.full_description,
    inclusion_criteria = excluded.inclusion_criteria,
    exclusion_criteria = excluded.exclusion_criteria, centers = excluded.centers,
    contact_name = excluded.contact_name, contact_email = excluded.contact_email,
    contact_phone = excluded.contact_phone
`)

function writeTrial(trial: Trial): void {
  writeStmt.run({
    ...trial,
    inclusion_criteria: JSON.stringify(trial.inclusion_criteria),
    exclusion_criteria: JSON.stringify(trial.exclusion_criteria),
    centers: JSON.stringify(trial.centers),
  })
}

export const trialsRouter = Router()

// GET /trials?query=&disease=  (public)
trialsRouter.get('/', (req: Request, res: Response) => {
  const query = typeof req.query.query === 'string' ? req.query.query : ''
  const diseaseParam =
    typeof req.query.disease === 'string' ? req.query.disease : 'all'
  // Unknown or missing disease falls back to "all".
  const disease: Disease | 'all' = isDisease(diseaseParam)
    ? diseaseParam
    : 'all'
  res.json(filterTrials(getAllTrials(), query, disease))
})

// GET /trials/:id  (public)
trialsRouter.get('/:id', (req: Request<{ id: string }>, res: Response) => {
  const trial = getTrial(req.params.id)
  if (!trial) {
    res.status(404).json({ error: 'Trial not found' })
    return
  }
  res.json(trial)
})

// POST /trials  (admin) — create a trial.
trialsRouter.post(
  '/',
  requireAdmin,
  validateBody(trialBodySchema),
  (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof trialBodySchema>
    const trial: Trial = { id: `t-${randomUUID()}`, ...body }
    writeTrial(trial)
    res.status(201).json(trial)
  }
)

// PATCH /trials/:id  (admin) — edit any trial.
trialsRouter.patch(
  '/:id',
  requireAdmin,
  validateBody(trialPatchSchema),
  (req: Request<{ id: string }>, res: Response) => {
    const existing = getTrial(req.params.id)
    if (!existing) {
      res.status(404).json({ error: 'Trial not found' })
      return
    }
    const patch = req.body as z.infer<typeof trialPatchSchema>
    const updated: Trial = { ...existing, ...patch }
    writeTrial(updated)
    res.json(updated)
  }
)

// DELETE /trials/:id  (admin) — delete a trial and any saved references.
trialsRouter.delete(
  '/:id',
  requireAdmin,
  (req: Request<{ id: string }>, res: Response) => {
    if (!getTrial(req.params.id)) {
      res.status(404).json({ error: 'Trial not found' })
      return
    }
    const tx = db.transaction((id: string) => {
      db.prepare('DELETE FROM saved_trials WHERE trial_id = ?').run(id)
      db.prepare('DELETE FROM trials WHERE id = ?').run(id)
    })
    tx(req.params.id)
    res.status(204).end()
  }
)
