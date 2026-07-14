import { Router, type Request, type Response } from 'express'
import { db } from '../db/index.js'
import { rowToTrial } from '../db/serialise.js'
import { filterTrials } from './trials.query.js'
import { DISEASES, type Disease, type Trial } from '../types.js'

function getAllTrials(): Trial[] {
  return db
    .prepare('SELECT * FROM trials ORDER BY rowid')
    .all()
    .map((r) => rowToTrial(r as never))
}

function isDisease(value: string): value is Disease {
  return (DISEASES as readonly string[]).includes(value)
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
  const row = db.prepare('SELECT * FROM trials WHERE id = ?').get(req.params.id)
  if (!row) {
    res.status(404).json({ error: 'Trial not found' })
    return
  }
  res.json(rowToTrial(row as never))
})
