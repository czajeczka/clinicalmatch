import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from './app.js'
import { db } from './db/index.js'
import { seed } from './db/seed.js'

// End-to-end golden path for the non-AI features, chained through the real
// HTTP layer against the seeded DB. Mirrors the brief's demo flow:
// onboarding → discover/save → belong (join/post/reply) → ownership.

const ALICE = 'e2e-alice'
const BOB = 'e2e-bob'

describe('golden path (non-AI)', () => {
  beforeAll(() => seed(db))

  it('onboards, discovers+saves, joins, posts, replies, and enforces ownership', async () => {
    // --- Onboarding: create the device identity ---
    const user = await request(app)
      .post('/users')
      .send({
        id: ALICE,
        display_name: 'Alice',
        interests: ['Type 2 Diabetes'],
      })
    expect(user.status).toBe(201)

    // --- Discover: search + filter ---
    const search = await request(app).get('/trials?query=warsaw')
    expect(search.status).toBe(200)
    expect(search.body.items).toHaveLength(1)
    const trialId = search.body.items[0].id as string

    const filtered = await request(app).get('/trials?disease=Type 2 Diabetes')
    expect(
      filtered.body.items.every(
        (t: { disease: string }) => t.disease === 'Type 2 Diabetes'
      )
    ).toBe(true)

    // --- Save persists across a "reload" (fresh GET) ---
    const save = await request(app)
      .post('/saved-trials')
      .set('x-user-id', ALICE)
      .send({ trial_id: trialId })
    expect(save.status).toBe(201)
    const savedReload = await request(app)
      .get('/saved-trials')
      .set('x-user-id', ALICE)
    expect(savedReload.body.map((t: { id: string }) => t.id)).toContain(trialId)

    // un-save is idempotent and reflected on reload
    expect(
      (
        await request(app)
          .delete(`/saved-trials/${trialId}`)
          .set('x-user-id', ALICE)
      ).status
    ).toBe(204)
    expect(
      (await request(app).get('/saved-trials').set('x-user-id', ALICE)).body
    ).toEqual([])

    // --- Belong: join a community (live member_count rises) ---
    const groupId = 'g-t2d'
    const before = (await request(app).get(`/groups/${groupId}`)).body
      .member_count as number
    const join = await request(app)
      .post('/memberships')
      .set('x-user-id', ALICE)
      .send({ group_id: groupId })
    expect(join.status).toBe(201)
    const after = (await request(app).get(`/groups/${groupId}`)).body
      .member_count as number
    expect(after).toBe(before + 1)

    // --- Create a discussion (author_name resolved from the user) ---
    const post = await request(app)
      .post('/discussions')
      .set('x-user-id', ALICE)
      .send({ group_id: groupId, title: 'Hello', content: 'My intro' })
    expect(post.status).toBe(201)
    expect(post.body.author_name).toBe('Alice')
    const discussionId = post.body.id as string

    // it shows on the board
    const board = await request(app).get(`/groups/${groupId}/discussions`)
    expect(board.body.map((d: { id: string }) => d.id)).toContain(discussionId)

    // --- Reply (reply_count rises) ---
    const reply = await request(app)
      .post(`/discussions/${discussionId}/replies`)
      .set('x-user-id', ALICE)
      .send({ content: 'Replying to myself' })
    expect(reply.status).toBe(201)
    const withCount = await request(app).get(`/discussions/${discussionId}`)
    expect(withCount.body.reply_count).toBe(1)

    // --- Ownership: Bob cannot edit or delete Alice's post ---
    await request(app)
      .post('/users')
      .send({ id: BOB, display_name: 'Bob', interests: [] })
    expect(
      (
        await request(app)
          .patch(`/discussions/${discussionId}`)
          .set('x-user-id', BOB)
          .send({ content: 'hacked' })
      ).status
    ).toBe(403)
    expect(
      (
        await request(app)
          .delete(`/discussions/${discussionId}`)
          .set('x-user-id', BOB)
      ).status
    ).toBe(403)

    // --- Alice edits then deletes her own; delete cascades to replies ---
    const edit = await request(app)
      .patch(`/discussions/${discussionId}`)
      .set('x-user-id', ALICE)
      .send({ content: 'Edited intro' })
    expect(edit.status).toBe(200)
    expect(edit.body.content).toBe('Edited intro')

    expect(
      (
        await request(app)
          .delete(`/discussions/${discussionId}`)
          .set('x-user-id', ALICE)
      ).status
    ).toBe(204)
    // gone, and its replies are gone too
    expect(
      (await request(app).get(`/discussions/${discussionId}`)).status
    ).toBe(404)
    const orphans = db
      .prepare('SELECT COUNT(*) AS n FROM replies WHERE discussion_id = ?')
      .get(discussionId) as { n: number }
    expect(orphans.n).toBe(0)
  })

  it('unknown routes and missing identity use the standard error shape', async () => {
    const notFound = await request(app).get('/nope')
    expect(notFound.status).toBe(404)
    expect(typeof notFound.body.error).toBe('string')

    const noIdentity = await request(app).get('/saved-trials')
    expect(noIdentity.status).toBe(401)
    expect(typeof noIdentity.body.error).toBe('string')
  })
})
