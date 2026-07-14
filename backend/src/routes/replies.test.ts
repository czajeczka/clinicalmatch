import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../db/index.js'
import { seed } from '../db/seed.js'
import type { Reply } from '../types.js'

const ALICE = 'user-alice-r'
const BOB = 'user-bob-r'

async function replyCount(discussionId: string): Promise<number> {
  const res = await request(app).get(`/discussions/${discussionId}`)
  return res.body.reply_count as number
}

describe('replies endpoints', () => {
  beforeAll(async () => {
    seed(db)
    await request(app)
      .post('/users')
      .send({ id: ALICE, display_name: 'Alice', interests: [] })
    await request(app)
      .post('/users')
      .send({ id: BOB, display_name: 'Bob', interests: [] })
  })

  it('lists seeded replies oldest-first (404 for unknown discussion)', async () => {
    const res = await request(app).get('/discussions/d-001/replies')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    // r-001 (10:05) before r-002 (13:30)
    expect(res.body.map((r: Reply) => r.id)).toEqual(['r-001', 'r-002'])
    expect(res.body[0].author_name).toBeTruthy()

    const missing = await request(app).get('/discussions/nope/replies')
    expect(missing.status).toBe(404)
  })

  it('requires identity (401) and non-empty content (400)', async () => {
    const noAuth = await request(app)
      .post('/discussions/d-001/replies')
      .send({ content: 'hi' })
    expect(noAuth.status).toBe(401)

    const empty = await request(app)
      .post('/discussions/d-001/replies')
      .set('x-user-id', ALICE)
      .send({ content: '   ' })
    expect(empty.status).toBe(400)
  })

  it('posting a reply raises reply_count; deleting own lowers it', async () => {
    const before = await replyCount('d-001')

    const post = await request(app)
      .post('/discussions/d-001/replies')
      .set('x-user-id', ALICE)
      .send({ content: 'Thanks for sharing' })
    expect(post.status).toBe(201)
    expect(post.body.author_name).toBe('Alice')
    expect(post.body.author_id).toBe(ALICE)
    const replyId = post.body.id as string

    expect(await replyCount('d-001')).toBe(before + 1)

    // Bob cannot delete Alice's reply
    const bobDelete = await request(app)
      .delete(`/replies/${replyId}`)
      .set('x-user-id', BOB)
    expect(bobDelete.status).toBe(403)

    // Alice can delete her own; count returns to base
    const del = await request(app)
      .delete(`/replies/${replyId}`)
      .set('x-user-id', ALICE)
    expect(del.status).toBe(204)
    expect(await replyCount('d-001')).toBe(before)
  })

  it('posting to an unknown discussion → 404', async () => {
    const res = await request(app)
      .post('/discussions/nope/replies')
      .set('x-user-id', ALICE)
      .send({ content: 'hello' })
    expect(res.status).toBe(404)
  })

  it('deleting an unknown reply → 404', async () => {
    const res = await request(app)
      .delete('/replies/nope')
      .set('x-user-id', ALICE)
    expect(res.status).toBe(404)
  })
})
