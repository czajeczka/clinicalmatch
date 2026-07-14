import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from './app.js'

describe('base server', () => {
  it('GET /health returns 200 { status: "ok" }', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('unknown route returns 404 with an error field', async () => {
    const res = await request(app).get('/nope')
    expect(res.status).toBe(404)
    expect(typeof res.body.error).toBe('string')
  })
})
