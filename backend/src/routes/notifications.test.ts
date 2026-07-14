import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../db/index.js'
import { seed } from '../db/seed.js'
import type { AppNotification } from '../types.js'

describe('notifications endpoints', () => {
  beforeAll(() => seed(db))

  it('GET /notifications returns the seeded records newest-first', async () => {
    const res = await request(app).get('/notifications')
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThanOrEqual(2)
    // n-001 (2026-07-13) is newer than n-002 (2026-07-12)
    const ids = res.body.map((n: AppNotification) => n.id)
    expect(ids.indexOf('n-001')).toBeLessThan(ids.indexOf('n-002'))
    expect(typeof res.body[0].read).toBe('boolean')
  })

  it('POST /notifications creates a record that then appears in the list', async () => {
    const create = await request(app).post('/notifications').send({
      title: 'New trial',
      body: 'A trial you may like',
      trial_id: 't-002',
    })
    expect(create.status).toBe(201)
    expect(create.body.id).toBeTruthy()
    expect(create.body.read).toBe(false)
    expect(create.body.trial_id).toBe('t-002')

    const list = await request(app).get('/notifications')
    const ids = list.body.map((n: AppNotification) => n.id)
    expect(ids).toContain(create.body.id)
    // newly created is newest → first
    expect(ids[0]).toBe(create.body.id)
  })

  it('rejects an invalid body with 400', async () => {
    const res = await request(app).post('/notifications').send({ title: '' })
    expect(res.status).toBe(400)
  })

  it('PATCH /notifications/:id marks read; 404 for unknown', async () => {
    const patched = await request(app)
      .patch('/notifications/n-001')
      .send({ read: true })
    expect(patched.status).toBe(200)
    expect(patched.body.read).toBe(true)

    const missing = await request(app)
      .patch('/notifications/nope')
      .send({ read: true })
    expect(missing.status).toBe(404)
  })
})
