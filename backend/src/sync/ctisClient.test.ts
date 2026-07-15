import { describe, it, expect } from 'vitest'
import { createCtisClient } from './ctisClient.js'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('CTIS client retries', () => {
  it('retries transient network errors then succeeds', async () => {
    let calls = 0
    const client = createCtisClient({
      baseUrl: 'http://ctis.test',
      retryCount: 2,
      retryDelayMs: 0,
      fetchImpl: async () => {
        calls++
        if (calls < 3) throw new Error('ECONNRESET')
        return jsonResponse({ data: [] })
      },
    })
    const res = await client.search('x', 1, 10)
    expect(calls).toBe(3)
    expect(res.data).toEqual([])
  })

  it('retries 5xx responses then gives up', async () => {
    let calls = 0
    const client = createCtisClient({
      baseUrl: 'http://ctis.test',
      retryCount: 1,
      retryDelayMs: 0,
      fetchImpl: async () => {
        calls++
        return jsonResponse({ error: 'boom' }, 503)
      },
    })
    await expect(client.search('x', 1, 10)).rejects.toThrow()
    expect(calls).toBe(2) // initial + 1 retry
  })

  it('does not retry 4xx responses', async () => {
    let calls = 0
    const client = createCtisClient({
      baseUrl: 'http://ctis.test',
      retryCount: 3,
      retryDelayMs: 0,
      fetchImpl: async () => {
        calls++
        return jsonResponse({ error: 'bad request' }, 400)
      },
    })
    await expect(client.search('x', 1, 10)).rejects.toThrow(/400/)
    expect(calls).toBe(1)
  })
})
