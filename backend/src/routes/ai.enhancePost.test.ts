import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'

// Mock the shared LLM layer so no provider is called. `LlmError` stays a real
// class so the route's instanceof check (→ calm 502) works.
vi.mock('../ai/llm.js', () => {
  class LlmError extends Error {}
  return {
    LlmError,
    llm: { completeJSON: vi.fn(), complete: vi.fn() },
  }
})

import { app } from '../app.js'
import { llm, LlmError } from '../ai/llm.js'
import type { PostEnhancement } from '../types.js'

const completeJSON = vi.mocked(llm.completeJSON)

const USER = 'u-test'
const VALID_BODY = {
  message: 'started new meds last week feeling ok but tired',
  title: '',
  groupName: 'Breast Cancer Together',
}

describe('POST /ai/enhance-post', () => {
  it('returns a validated enhancement for a valid request', async () => {
    const enhancement: PostEnhancement = {
      title: 'Starting new medication',
      improvedContent:
        'I started a new medication last week. I feel okay, just a little tired.',
      tags: ['Treatment', 'Side Effects'],
      summary:
        'A member shares that they started a new medication and feel tired.',
    }
    completeJSON.mockResolvedValueOnce(enhancement)

    const res = await request(app)
      .post('/ai/enhance-post')
      .set('x-user-id', USER)
      .send(VALID_BODY)

    expect(res.status).toBe(200)
    expect(res.body.title).toBe(enhancement.title)
    expect(res.body.tags).toEqual(['Treatment', 'Side Effects'])
  })

  it('drops unknown tags and caps at four', async () => {
    completeJSON.mockResolvedValueOnce({
      title: 'T',
      improvedContent: 'C',
      summary: 'S',
      tags: [
        'Treatment',
        'Nonsense',
        'Questions',
        'Nutrition',
        'Mental Health',
      ],
    })
    const res = await request(app)
      .post('/ai/enhance-post')
      .set('x-user-id', USER)
      .send(VALID_BODY)
    expect(res.status).toBe(200)
    expect(res.body.tags).not.toContain('Nonsense')
    expect(res.body.tags.length).toBeLessThanOrEqual(4)
  })

  it('requires identity (401) and a non-empty message (400)', async () => {
    const noAuth = await request(app).post('/ai/enhance-post').send(VALID_BODY)
    expect(noAuth.status).toBe(401)

    const bad = await request(app)
      .post('/ai/enhance-post')
      .set('x-user-id', USER)
      .send({ message: '', groupName: 'x' })
    expect(bad.status).toBe(400)
  })

  it('returns a calm 502 when the LLM ultimately fails', async () => {
    completeJSON.mockRejectedValueOnce(new LlmError('down'))
    const res = await request(app)
      .post('/ai/enhance-post')
      .set('x-user-id', USER)
      .send(VALID_BODY)
    expect(res.status).toBe(502)
    expect(res.body.error).toMatch(/try again/i)
  })
})
