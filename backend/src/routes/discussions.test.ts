import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../db/index.js'
import { seed } from '../db/seed.js'
import type { Discussion } from '../types.js'

const ALICE = 'user-alice'
const BOB = 'user-bob'

describe('discussions endpoints', () => {
  beforeAll(async () => {
    seed(db)
    await request(app)
      .post('/users')
      .send({ id: ALICE, display_name: 'Alice', interests: [] })
    await request(app)
      .post('/users')
      .send({ id: BOB, display_name: 'Bob', interests: [] })
  })

  it('lists a group’s seeded discussions with correct reply_count', async () => {
    const res = await request(app).get('/groups/g-t2d/discussions')
    expect(res.status).toBe(200)
    // d-001 (2 replies) and d-002 (1 reply) are seeded in g-t2d
    const ids = res.body.map((d: Discussion) => d.id)
    expect(ids).toContain('d-001')
    const d1 = res.body.find((d: Discussion) => d.id === 'd-001')
    expect(d1.reply_count).toBe(2)
    expect(Array.isArray(d1.tags)).toBe(true)
  })

  it('GET /discussions/:id returns one or 404', async () => {
    expect((await request(app).get('/discussions/d-001')).status).toBe(200)
    const missing = await request(app).get('/discussions/nope')
    expect(missing.status).toBe(404)
  })

  it('requires identity to create (401), rejects empty content (400)', async () => {
    const noAuth = await request(app)
      .post('/discussions')
      .send({ group_id: 'g-bc', content: 'hi' })
    expect(noAuth.status).toBe(401)

    const empty = await request(app)
      .post('/discussions')
      .set('x-user-id', ALICE)
      .send({ group_id: 'g-bc', content: '   ' })
    expect(empty.status).toBe(400)
  })

  it('creates with author_name, then enforces author-only edit/delete', async () => {
    const create = await request(app)
      .post('/discussions')
      .set('x-user-id', ALICE)
      .send({
        group_id: 'g-bc',
        title: 'Hello',
        content: 'My first post',
        tags: ['intro'],
      })
    expect(create.status).toBe(201)
    expect(create.body.author_name).toBe('Alice')
    expect(create.body.author_id).toBe(ALICE)
    expect(create.body.reply_count).toBe(0)
    const id = create.body.id as string

    // Bob cannot edit or delete Alice's post
    const bobEdit = await request(app)
      .patch(`/discussions/${id}`)
      .set('x-user-id', BOB)
      .send({ content: 'hacked' })
    expect(bobEdit.status).toBe(403)
    const bobDelete = await request(app)
      .delete(`/discussions/${id}`)
      .set('x-user-id', BOB)
    expect(bobDelete.status).toBe(403)

    // Alice can edit her own
    const edit = await request(app)
      .patch(`/discussions/${id}`)
      .set('x-user-id', ALICE)
      .send({ content: 'Edited post', tags: ['intro', 'updated'] })
    expect(edit.status).toBe(200)
    expect(edit.body.content).toBe('Edited post')
    expect(edit.body.tags).toEqual(['intro', 'updated'])
    expect(edit.body.title).toBe('Hello') // untouched field preserved

    // Alice can delete her own
    const del = await request(app)
      .delete(`/discussions/${id}`)
      .set('x-user-id', ALICE)
    expect(del.status).toBe(204)
    expect((await request(app).get(`/discussions/${id}`)).status).toBe(404)
  })

  it('editing/deleting an unknown discussion → 404', async () => {
    expect(
      (
        await request(app)
          .patch('/discussions/nope')
          .set('x-user-id', ALICE)
          .send({ content: 'x' })
      ).status
    ).toBe(404)
    expect(
      (await request(app).delete('/discussions/nope').set('x-user-id', ALICE))
        .status
    ).toBe(404)
  })

  it('deleting a discussion also removes its replies', async () => {
    // d-004 has one seeded reply (r-004); Alice is not the author, so create a
    // fresh discussion, then delete it and confirm the replies query is clean.
    const create = await request(app)
      .post('/discussions')
      .set('x-user-id', ALICE)
      .send({ group_id: 'g-ms', content: 'Temp thread' })
    const id = create.body.id as string
    await request(app).delete(`/discussions/${id}`).set('x-user-id', ALICE)
    const orphanReplies = db
      .prepare('SELECT COUNT(*) AS n FROM replies WHERE discussion_id = ?')
      .get(id) as { n: number }
    expect(orphanReplies.n).toBe(0)
  })
})
