import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../db/index.js'
import { seed } from '../db/seed.js'
import type { Trial } from '../types.js'

const USER = 'user-save-1'

describe('saved-trials endpoints', () => {
  beforeAll(() => seed(db))

  it('requires an identity (401 without x-user-id)', async () => {
    const res = await request(app).get('/saved-trials')
    expect(res.status).toBe(401)
  })

  it('saves, lists, is idempotent, then un-saves', async () => {
    // initially empty
    const empty = await request(app).get('/saved-trials').set('x-user-id', USER)
    expect(empty.status).toBe(200)
    expect(empty.body).toEqual([])

    // save (201)
    const save = await request(app)
      .post('/saved-trials')
      .set('x-user-id', USER)
      .send({ trial_id: 't-001' })
    expect(save.status).toBe(201)
    expect(save.body.trial_id).toBe('t-001')

    // list shows the full trial with array fields
    const list = await request(app).get('/saved-trials').set('x-user-id', USER)
    expect(list.body).toHaveLength(1)
    expect(list.body[0].id).toBe('t-001')
    expect(Array.isArray((list.body[0] as Trial).inclusion_criteria)).toBe(true)

    // saving again is idempotent (200, no duplicate)
    const again = await request(app)
      .post('/saved-trials')
      .set('x-user-id', USER)
      .send({ trial_id: 't-001' })
    expect(again.status).toBe(200)
    const list2 = await request(app).get('/saved-trials').set('x-user-id', USER)
    expect(list2.body).toHaveLength(1)

    // delete (204) then list empty
    const del = await request(app)
      .delete('/saved-trials/t-001')
      .set('x-user-id', USER)
    expect(del.status).toBe(204)
    const list3 = await request(app).get('/saved-trials').set('x-user-id', USER)
    expect(list3.body).toEqual([])

    // deleting again is idempotent (still 204)
    const del2 = await request(app)
      .delete('/saved-trials/t-001')
      .set('x-user-id', USER)
    expect(del2.status).toBe(204)
  })

  it('saving an unknown trial → 404', async () => {
    const res = await request(app)
      .post('/saved-trials')
      .set('x-user-id', USER)
      .send({ trial_id: 'nope' })
    expect(res.status).toBe(404)
  })

  it('saved trials are scoped per user', async () => {
    await request(app)
      .post('/saved-trials')
      .set('x-user-id', 'user-A')
      .send({ trial_id: 't-002' })
    const otherUser = await request(app)
      .get('/saved-trials')
      .set('x-user-id', 'user-B')
    expect(otherUser.body).toEqual([])
  })
})
