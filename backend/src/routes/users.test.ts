import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { app } from '../app.js'
import { identity, requireUser } from '../middleware/identity.js'

describe('users endpoints', () => {
  it('creates (201), fetches (200), patches (200), filters by interest', async () => {
    const create = await request(app)
      .post('/users')
      .send({ display_name: 'Alex', interests: ['Type 2 Diabetes'] })
    expect(create.status).toBe(201)
    expect(create.body.id).toBeTruthy()
    expect(create.body.display_name).toBe('Alex')
    expect(create.body.interests).toEqual(['Type 2 Diabetes'])

    const id = create.body.id as string

    const fetched = await request(app).get(`/users/${id}`)
    expect(fetched.status).toBe(200)
    expect(fetched.body.id).toBe(id)

    const patched = await request(app)
      .patch(`/users/${id}`)
      .send({ city: 'Warsaw' })
    expect(patched.status).toBe(200)
    expect(patched.body.city).toBe('Warsaw')
    // unchanged fields survive a partial update
    expect(patched.body.display_name).toBe('Alex')

    const byInterest = await request(app).get('/users?interest=Type 2 Diabetes')
    expect(byInterest.status).toBe(200)
    expect(byInterest.body.map((u: { id: string }) => u.id)).toContain(id)
  })

  it('upserts when a client-generated id is provided (200 on second write)', async () => {
    const first = await request(app)
      .post('/users')
      .send({ id: 'device-abc', display_name: 'Sam', interests: [] })
    expect(first.status).toBe(201)

    const second = await request(app)
      .post('/users')
      .send({ id: 'device-abc', display_name: 'Sam Renamed', interests: [] })
    expect(second.status).toBe(200)
    expect(second.body.display_name).toBe('Sam Renamed')
    // created_at is preserved across the upsert
    expect(second.body.created_at).toBe(first.body.created_at)
  })

  it('returns 404 for an unknown user', async () => {
    const res = await request(app).get('/users/does-not-exist')
    expect(res.status).toBe(404)
    expect(typeof res.body.error).toBe('string')
  })

  it('rejects an invalid interest with 400', async () => {
    const res = await request(app)
      .post('/users')
      .send({ display_name: 'Nope', interests: ['Not A Disease'] })
    expect(res.status).toBe(400)
    expect(res.body.error).toBeTruthy()
  })

  it('rejects an unknown interest filter with 400', async () => {
    const res = await request(app).get('/users?interest=Flu')
    expect(res.status).toBe(400)
  })
})

describe('requireUser guard', () => {
  // A throwaway app exercising the guard without adding a production endpoint.
  const guarded = express()
  guarded.use(identity)
  guarded.get('/whoami', requireUser, (req, res) => {
    res.json({ userId: req.userId })
  })

  it('401 when the x-user-id header is missing', async () => {
    const res = await request(guarded).get('/whoami')
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/x-user-id/)
  })

  it('passes through when the header is present', async () => {
    const res = await request(guarded).get('/whoami').set('x-user-id', 'u-1')
    expect(res.status).toBe(200)
    expect(res.body.userId).toBe('u-1')
  })
})
