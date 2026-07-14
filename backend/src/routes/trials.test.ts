import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../db/index.js'
import { seed } from '../db/seed.js'
import { filterTrials } from './trials.query.js'
import type { Trial } from '../types.js'

const fixture: Trial[] = [
  {
    id: 'a',
    title: 'Diabetes study',
    disease: 'Type 2 Diabetes',
    phase: 'Phase 2',
    city: 'Warsaw',
    country: 'Poland',
    status: 'recruiting',
    short_description: 'blood sugar control',
    full_description: '',
    inclusion_criteria: [],
    exclusion_criteria: [],
    centers: [],
    contact_name: '',
    contact_email: '',
    contact_phone: '',
  },
  {
    id: 'b',
    title: 'MS study',
    disease: 'Multiple Sclerosis',
    phase: 'Phase 3',
    city: 'Dublin',
    country: 'Ireland',
    status: 'recruiting',
    short_description: 'fatigue',
    full_description: '',
    inclusion_criteria: [],
    exclusion_criteria: [],
    centers: [],
    contact_name: '',
    contact_email: '',
    contact_phone: '',
  },
]

describe('filterTrials (pure)', () => {
  it('returns everything with no query and "all"', () => {
    expect(filterTrials(fixture, '', 'all')).toHaveLength(2)
  })
  it('filters by disease', () => {
    const out = filterTrials(fixture, '', 'Multiple Sclerosis')
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('b')
  })
  it('matches free text (case-insensitive, trimmed) against city', () => {
    expect(filterTrials(fixture, '  WARSAW ', 'all')).toHaveLength(1)
    expect(filterTrials(fixture, 'nope', 'all')).toHaveLength(0)
  })
})

describe('trials endpoints', () => {
  beforeAll(() => seed(db))

  it('GET /trials returns all seeded trials with array fields', async () => {
    const res = await request(app).get('/trials')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(10)
    expect(Array.isArray(res.body[0].inclusion_criteria)).toBe(true)
    expect(Array.isArray(res.body[0].centers)).toBe(true)
  })

  it('filters by disease', async () => {
    const res = await request(app).get('/trials?disease=Multiple Sclerosis')
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    expect(
      res.body.every((t: Trial) => t.disease === 'Multiple Sclerosis')
    ).toBe(true)
  })

  it('narrows by keyword and returns [] for no match', async () => {
    const warsaw = await request(app).get('/trials?query=warsaw')
    expect(warsaw.body.length).toBe(1)
    const none = await request(app).get('/trials?query=zzz')
    expect(none.body).toEqual([])
  })

  it('unknown disease filter falls back to all', async () => {
    const res = await request(app).get('/trials?disease=Flu')
    expect(res.body).toHaveLength(10)
  })

  it('GET /trials/:id returns one trial; unknown id → 404', async () => {
    const ok = await request(app).get('/trials/t-001')
    expect(ok.status).toBe(200)
    expect(ok.body.id).toBe('t-001')
    expect(Array.isArray(ok.body.inclusion_criteria)).toBe(true)

    const missing = await request(app).get('/trials/nope')
    expect(missing.status).toBe(404)
    expect(missing.body.error).toBe('Trial not found')
  })
})
