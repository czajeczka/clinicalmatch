import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../db/index.js'
import { seed } from '../db/seed.js'

const USER = 'user-join-1'

async function baseCount(groupId: string): Promise<number> {
  const res = await request(app).get(`/groups/${groupId}`)
  return res.body.member_count as number
}

describe('memberships endpoints', () => {
  beforeAll(() => seed(db))

  it('requires an identity (401 without x-user-id)', async () => {
    expect((await request(app).get('/memberships')).status).toBe(401)
    expect(
      (await request(app).post('/memberships').send({ group_id: 'g-bc' }))
        .status
    ).toBe(401)
  })

  it('joins (live count rises), is idempotent, then leaves (count falls)', async () => {
    const before = await baseCount('g-bc')

    const join = await request(app)
      .post('/memberships')
      .set('x-user-id', USER)
      .send({ group_id: 'g-bc' })
    expect(join.status).toBe(201)
    expect(join.body.group_id).toBe('g-bc')

    // membership list shows the joined group
    const list = await request(app).get('/memberships').set('x-user-id', USER)
    expect(list.body).toHaveLength(1)
    expect(list.body[0].id).toBe('g-bc')

    // live member_count went up by one
    expect(await baseCount('g-bc')).toBe(before + 1)

    // joining again is idempotent
    const again = await request(app)
      .post('/memberships')
      .set('x-user-id', USER)
      .send({ group_id: 'g-bc' })
    expect(again.status).toBe(200)
    expect(await baseCount('g-bc')).toBe(before + 1)

    // leave → 204, list empty, count back to base
    const leave = await request(app)
      .delete('/memberships/g-bc')
      .set('x-user-id', USER)
    expect(leave.status).toBe(204)
    expect(
      (await request(app).get('/memberships').set('x-user-id', USER)).body
    ).toEqual([])
    expect(await baseCount('g-bc')).toBe(before)

    // leaving again is idempotent
    expect(
      (await request(app).delete('/memberships/g-bc').set('x-user-id', USER))
        .status
    ).toBe(204)
  })

  it('joining an unknown group → 404', async () => {
    const res = await request(app)
      .post('/memberships')
      .set('x-user-id', USER)
      .send({ group_id: 'nope' })
    expect(res.status).toBe(404)
  })
})
