import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../db/index.js'
import { seed } from '../db/seed.js'
import type { SupportGroup } from '../types.js'

describe('groups endpoints', () => {
  beforeAll(() => seed(db))

  it('GET /groups returns the five seeded groups', async () => {
    const res = await request(app).get('/groups')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(5)
    const g = res.body[0] as SupportGroup
    expect(g).toHaveProperty('name')
    expect(g).toHaveProperty('color')
    expect(typeof g.member_count).toBe('number')
  })

  it('GET /groups/:id returns one group or 404', async () => {
    const ok = await request(app).get('/groups/g-bc')
    expect(ok.status).toBe(200)
    expect(ok.body.id).toBe('g-bc')

    const missing = await request(app).get('/groups/nope')
    expect(missing.status).toBe(404)
    expect(missing.body.error).toBe('Group not found')
  })
})
