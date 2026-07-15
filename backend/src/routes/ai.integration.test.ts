import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../db/index.js'
import { seed } from '../db/seed.js'

// End-to-end through the REAL LLM abstraction layer (not mocked). In the test
// env OPENAI_API_KEY is blank, so the layer throws LlmError immediately (no
// network) and the route must degrade gracefully to a calm 502 — the same path
// the client renders as an inline fallback while the rest of the app works.

describe('POST /ai/eligibility-check (real llm layer, no API key)', () => {
  beforeAll(() => seed(db))

  it('degrades to a calm 502 when the provider is not configured', async () => {
    const res = await request(app).post('/ai/eligibility-check').send({
      trial_id: 't-001',
      age: 45,
      gender: 'female',
      condition: 'Type 2 Diabetes',
    })
    expect(res.status).toBe(502)
    expect(res.body.error).toMatch(/try again/i)
  })

  it('still validates input (400) and existence (404) before calling AI', async () => {
    const bad = await request(app)
      .post('/ai/eligibility-check')
      .send({ trial_id: 't-001' })
    expect(bad.status).toBe(400)

    const missing = await request(app).post('/ai/eligibility-check').send({
      trial_id: 'nope',
      age: 45,
      gender: 'female',
      condition: 'Type 2 Diabetes',
    })
    expect(missing.status).toBe(404)
  })
})
