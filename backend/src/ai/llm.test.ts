import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { createLlmClient, LlmError } from './llm.js'

// Unit tests for the LLM abstraction layer. We inject a fake `fetch` so no real
// network call happens — the OpenAI SDK runs against our canned responses.

const resultSchema = z.object({
  verdict: z.enum(['likely', 'possibly', 'unlikely']),
  headline: z.string(),
})

/** Build a Response the OpenAI SDK will parse as a chat completion. */
function completionResponse(content: string): Response {
  return new Response(
    JSON.stringify({
      id: 'cmpl-test',
      object: 'chat.completion',
      created: 0,
      model: 'gpt-4o-mini',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  )
}

const CALL = {
  system: 'system',
  user: 'user',
  schema: resultSchema,
  schemaName: 'result',
} as const

describe('createLlmClient.completeJSON', () => {
  it('validates and returns good JSON', async () => {
    const fetchImpl = vi.fn(async () =>
      completionResponse(
        JSON.stringify({ verdict: 'likely', headline: 'Looks good' })
      )
    )
    const client = createLlmClient({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    const out = await client.completeJSON(CALL)

    expect(out).toEqual({ verdict: 'likely', headline: 'Looks good' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('retries once then throws LlmError on repeated malformed output', async () => {
    // Not valid JSON → JSON.parse throws → retryable → retried once → still bad.
    const fetchImpl = vi.fn(async () => completionResponse('not-json-at-all'))
    const client = createLlmClient({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    await expect(client.completeJSON(CALL)).rejects.toBeInstanceOf(LlmError)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('retries once then throws LlmError when JSON fails schema validation', async () => {
    const fetchImpl = vi.fn(async () =>
      completionResponse(JSON.stringify({ verdict: 'maybe', headline: 1 }))
    )
    const client = createLlmClient({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    await expect(client.completeJSON(CALL)).rejects.toBeInstanceOf(LlmError)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('throws LlmError immediately when the API key is empty (no network call)', async () => {
    const fetchImpl = vi.fn(async () =>
      completionResponse(JSON.stringify({ verdict: 'likely', headline: 'x' }))
    )
    const client = createLlmClient({
      apiKey: '',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    await expect(client.completeJSON(CALL)).rejects.toBeInstanceOf(LlmError)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
