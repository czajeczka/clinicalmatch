import { describe, it, expect, beforeAll, vi } from 'vitest'
import request from 'supertest'

// Mock the shared LLM layer so no provider is called. `LlmError` is a real class
// here so the route's `instanceof` check (→ calm 502) still works.
vi.mock('../ai/llm.js', () => {
  class LlmError extends Error {}
  return {
    LlmError,
    llm: { completeJSON: vi.fn(), complete: vi.fn() },
  }
})

import { app } from '../app.js'
import { db } from '../db/index.js'
import { seed } from '../db/seed.js'
import { llm, LlmError } from '../ai/llm.js'
import type { EligibilityResult } from '../types.js'

const completeJSON = vi.mocked(llm.completeJSON)

const RESULT: EligibilityResult = {
  verdict: 'possibly',
  headline: 'You may be a match — some details need confirming.',
  matches: ['Your age is within the study range.'],
  gaps: ['Confirm your current treatment with the study team.'],
  note: 'Informational only — not medical advice. Final eligibility is decided by the trial investigators.',
}

const VALID_BODY = {
  trial_id: 't-001',
  age: 45,
  gender: 'female',
  condition: 'Type 2 Diabetes',
  treatment: 'Metformin',
}

describe('POST /ai/eligibility-check', () => {
  beforeAll(() => seed(db))

  it('returns a validated eligibility result for a valid request', async () => {
    completeJSON.mockResolvedValueOnce(RESULT)

    const res = await request(app)
      .post('/ai/eligibility-check')
      .send(VALID_BODY)

    expect(res.status).toBe(200)
    expect(res.body).toEqual(RESULT)
    expect(completeJSON).toHaveBeenCalledTimes(1)
  })

  it('rejects a body missing required fields with 400', async () => {
    const res = await request(app)
      .post('/ai/eligibility-check')
      .send({ trial_id: 't-001', age: 45 }) // no gender / condition
    expect(res.status).toBe(400)
    expect(res.body.error).toBeTruthy()
  })

  it('rejects an out-of-range age with 400', async () => {
    const res = await request(app)
      .post('/ai/eligibility-check')
      .send({ ...VALID_BODY, age: 200 })
    expect(res.status).toBe(400)
  })

  it('returns 404 when the trial does not exist', async () => {
    const res = await request(app)
      .post('/ai/eligibility-check')
      .send({ ...VALID_BODY, trial_id: 'does-not-exist' })
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Trial not found')
  })

  it('returns a calm 502 when the LLM ultimately fails', async () => {
    completeJSON.mockRejectedValueOnce(new LlmError('assistant down'))

    const res = await request(app)
      .post('/ai/eligibility-check')
      .send(VALID_BODY)

    expect(res.status).toBe(502)
    expect(res.body.error).toMatch(/try again/i)
  })
})
