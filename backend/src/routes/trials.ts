import { Router, type Request, type Response } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db } from '../db/index.js'
import {
  queryTrials,
  getTrialById,
  getFacets,
  type TrialFilters,
} from '../db/trials.js'
import { requireAdmin } from '../middleware/identity.js'
import { validateBody } from '../lib/validation.js'
import type { Trial } from '../types.js'

// ---- Admin write schema (disease is free-form now) ----

const centerSchema = z.object({
  name: z.string().trim().min(1),
  city: z.string().trim().min(1),
  country: z.string().trim().min(1),
})

const trialBodySchema = z.object({
  title: z.string().trim().min(1),
  disease: z.string().trim().min(1),
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
    title=excluded.title, disease=excluded.disease, phase=excluded.phase,
    city=excluded.city, country=excluded.country, status=excluded.status,
    short_description=excluded.short_description,
    full_description=excluded.full_description,
    inclusion_criteria=excluded.inclusion_criteria,
    exclusion_criteria=excluded.exclusion_criteria, centers=excluded.centers,
    contact_name=excluded.contact_name, contact_email=excluded.contact_email,
    contact_phone=excluded.contact_phone
`)

function writeTrial(trial: Trial): void {
  writeStmt.run({
    ...trial,
    sponsor: undefined,
    therapeutic_area: undefined,
    medical_condition: undefined,
    intervention: undefined,
    age_range: undefined,
    gender: undefined,
    countries: undefined,
    source_id: undefined,
    source_url: undefined,
    inclusion_criteria: JSON.stringify(trial.inclusion_criteria),
    exclusion_criteria: JSON.stringify(trial.exclusion_criteria),
    centers: JSON.stringify(trial.centers),
  })
  // Keep the country facet in sync for admin-created trials.
  db.prepare(
    'INSERT OR IGNORE INTO trial_countries (trial_id, country) VALUES (?, ?)'
  ).run(trial.id, trial.country)
}

export const trialsRouter = Router()

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

// GET /trials — filtered + paginated. Returns { items, total, limit, offset }.
// Public. Filters combine: query, disease, country, city, sponsor, phase,
// status, age, sex.
trialsRouter.get('/', (req: Request, res: Response) => {
  const q = req.query
  const filters: TrialFilters = {
    query: str(q.query),
    disease: str(q.disease),
    country: str(q.country),
    city: str(q.city),
    sponsor: str(q.sponsor),
    phase: str(q.phase),
    status: str(q.status),
    sex: str(q.sex),
    age: q.age !== undefined ? Number(q.age) : undefined,
  }
  const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 100)
  const offset = Math.max(Number(q.offset) || 0, 0)
  res.json(queryTrials(filters, limit, offset))
})

// GET /trials/facets — distinct filter options (must precede /:id).
trialsRouter.get('/facets', (_req: Request, res: Response) => {
  res.json(getFacets())
})

// GET /trials/:id  (public)
trialsRouter.get('/:id', (req: Request<{ id: string }>, res: Response) => {
  const trial = getTrialById(req.params.id)
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
    res.status(201).json(getTrialById(trial.id))
  }
)

// PATCH /trials/:id  (admin) — edit any trial.
trialsRouter.patch(
  '/:id',
  requireAdmin,
  validateBody(trialPatchSchema),
  (req: Request<{ id: string }>, res: Response) => {
    const existing = getTrialById(req.params.id)
    if (!existing) {
      res.status(404).json({ error: 'Trial not found' })
      return
    }
    const patch = req.body as z.infer<typeof trialPatchSchema>
    writeTrial({ ...existing, ...patch })
    res.json(getTrialById(req.params.id))
  }
)

// DELETE /trials/:id  (admin) — delete a trial and its references.
trialsRouter.delete(
  '/:id',
  requireAdmin,
  (req: Request<{ id: string }>, res: Response) => {
    if (!getTrialById(req.params.id)) {
      res.status(404).json({ error: 'Trial not found' })
      return
    }
    const tx = db.transaction((id: string) => {
      db.prepare('DELETE FROM saved_trials WHERE trial_id = ?').run(id)
      db.prepare('DELETE FROM trial_countries WHERE trial_id = ?').run(id)
      db.prepare('DELETE FROM trials WHERE id = ?').run(id)
    })
    tx(req.params.id)
    res.status(204).end()
  }
)
