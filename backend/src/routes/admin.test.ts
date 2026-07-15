import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../db/index.js'
import { seed } from '../db/seed.js'

// The seeded admin (see db/seed-data.ts) and a couple of regular identities.
const ADMIN = 'u-admin'
const USER = 'user-reg'
const OTHER = 'user-other'

const trialBody = {
  title: 'Admin-created trial',
  disease: 'Type 2 Diabetes',
  phase: 'Phase 2',
  city: 'Kraków',
  country: 'Poland',
  status: 'recruiting',
  short_description: 'Short.',
  full_description: 'Full description.',
  inclusion_criteria: ['Adults aged 18–65 years'],
  exclusion_criteria: ['Pregnant or breastfeeding'],
  centers: [{ name: 'Centre A', city: 'Kraków', country: 'Poland' }],
  contact_name: 'Dr Test',
  contact_email: 'test@example.com',
  contact_phone: '+48 000 000 000',
}

describe('admin role & authorization', () => {
  beforeAll(async () => {
    seed(db)
    for (const id of [USER, OTHER]) {
      await request(app)
        .post('/users')
        .send({ id, display_name: id, interests: [] })
    }
  })

  it('seeds exactly one admin; regular users are role "user"', async () => {
    const admin = await request(app).get(`/users/${ADMIN}`)
    expect(admin.status).toBe(200)
    expect(admin.body.role).toBe('admin')
    expect(admin.body.email).toBe('o.czajka.2004@gmail.com')

    const user = await request(app).get(`/users/${USER}`)
    expect(user.body.role).toBe('user')
  })

  it('never lets role be set through the user API (no privilege escalation)', async () => {
    const res = await request(app).post('/users').send({
      id: 'sneaky',
      display_name: 'Sneaky',
      interests: [],
      role: 'admin',
    })
    expect(res.status).toBe(201)
    expect(res.body.role).toBe('user')
    // and it really can't act as admin
    const forbidden = await request(app)
      .post('/trials')
      .set('x-user-id', 'sneaky')
      .send(trialBody)
    expect(forbidden.status).toBe(403)
  })

  // ---- Trials ----
  describe('trials (admin CRUD, users 403)', () => {
    let createdId = ''

    it('admin can create, edit and delete trials', async () => {
      const create = await request(app)
        .post('/trials')
        .set('x-user-id', ADMIN)
        .send(trialBody)
      expect(create.status).toBe(201)
      createdId = create.body.id
      expect(createdId).toBeTruthy()

      const patch = await request(app)
        .patch(`/trials/${createdId}`)
        .set('x-user-id', ADMIN)
        .send({ title: 'Renamed trial' })
      expect(patch.status).toBe(200)
      expect(patch.body.title).toBe('Renamed trial')

      const del = await request(app)
        .delete(`/trials/${createdId}`)
        .set('x-user-id', ADMIN)
      expect(del.status).toBe(204)
      expect((await request(app).get(`/trials/${createdId}`)).status).toBe(404)
    })

    it('regular users get 403 (and no identity → 401)', async () => {
      expect((await request(app).post('/trials').send(trialBody)).status).toBe(
        401
      )
      expect(
        (
          await request(app)
            .post('/trials')
            .set('x-user-id', USER)
            .send(trialBody)
        ).status
      ).toBe(403)
      expect(
        (
          await request(app)
            .patch('/trials/t-001')
            .set('x-user-id', USER)
            .send({ title: 'x' })
        ).status
      ).toBe(403)
      expect(
        (await request(app).delete('/trials/t-001').set('x-user-id', USER))
          .status
      ).toBe(403)
    })
  })

  // ---- Support groups ----
  describe('groups (admin CRUD, users 403)', () => {
    it('admin can create/edit/delete; users are forbidden', async () => {
      const create = await request(app)
        .post('/groups')
        .set('x-user-id', ADMIN)
        .send({
          name: 'New Group',
          disease: 'Multiple Sclerosis',
          description: 'A place to talk.',
          color: '#3f7459',
        })
      expect(create.status).toBe(201)
      const gid = create.body.id

      const patch = await request(app)
        .patch(`/groups/${gid}`)
        .set('x-user-id', ADMIN)
        .send({ name: 'Renamed Group' })
      expect(patch.status).toBe(200)
      expect(patch.body.name).toBe('Renamed Group')

      expect(
        (
          await request(app).post('/groups').set('x-user-id', USER).send({
            name: 'x',
            disease: 'Multiple Sclerosis',
            description: 'x',
            color: '#000',
          })
        ).status
      ).toBe(403)

      const del = await request(app)
        .delete(`/groups/${gid}`)
        .set('x-user-id', ADMIN)
      expect(del.status).toBe(204)
      expect(
        (await request(app).delete('/groups/g-t2d').set('x-user-id', USER))
          .status
      ).toBe(403)
    })
  })

  // ---- Announcements / notifications ----
  describe('notifications (admin create/delete, users 403)', () => {
    it('admin creates and deletes; users are forbidden', async () => {
      const create = await request(app)
        .post('/notifications')
        .set('x-user-id', ADMIN)
        .send({ title: 'Announcement', body: 'Body' })
      expect(create.status).toBe(201)
      const nid = create.body.id

      expect(
        (
          await request(app)
            .delete(`/notifications/${nid}`)
            .set('x-user-id', USER)
        ).status
      ).toBe(403)

      const del = await request(app)
        .delete(`/notifications/${nid}`)
        .set('x-user-id', ADMIN)
      expect(del.status).toBe(204)
    })
  })

  // ---- Community moderation ----
  describe('community moderation (admin edits/deletes anyone; others 403)', () => {
    it('admin can edit & delete a discussion authored by someone else', async () => {
      const created = await request(app)
        .post('/discussions')
        .set('x-user-id', USER)
        .send({ group_id: 'g-t2d', content: 'A user post' })
      const did = created.body.id

      // A different regular user cannot edit it.
      expect(
        (
          await request(app)
            .patch(`/discussions/${did}`)
            .set('x-user-id', OTHER)
            .send({ content: 'hijack' })
        ).status
      ).toBe(403)

      // Admin can edit it.
      const adminEdit = await request(app)
        .patch(`/discussions/${did}`)
        .set('x-user-id', ADMIN)
        .send({ content: 'moderated by admin' })
      expect(adminEdit.status).toBe(200)
      expect(adminEdit.body.content).toBe('moderated by admin')

      // Admin can delete it.
      expect(
        (
          await request(app)
            .delete(`/discussions/${did}`)
            .set('x-user-id', ADMIN)
        ).status
      ).toBe(204)
    })

    it('admin can edit & delete a reply authored by someone else', async () => {
      const disc = await request(app)
        .post('/discussions')
        .set('x-user-id', USER)
        .send({ group_id: 'g-t2d', content: 'thread' })
      const did = disc.body.id
      const reply = await request(app)
        .post(`/discussions/${did}/replies`)
        .set('x-user-id', USER)
        .send({ content: 'user reply' })
      const rid = reply.body.id

      expect(
        (
          await request(app)
            .patch(`/replies/${rid}`)
            .set('x-user-id', OTHER)
            .send({ content: 'hijack' })
        ).status
      ).toBe(403)

      const adminEdit = await request(app)
        .patch(`/replies/${rid}`)
        .set('x-user-id', ADMIN)
        .send({ content: 'moderated' })
      expect(adminEdit.status).toBe(200)
      expect(adminEdit.body.content).toBe('moderated')

      expect(
        (await request(app).delete(`/replies/${rid}`).set('x-user-id', ADMIN))
          .status
      ).toBe(204)
    })
  })
})
