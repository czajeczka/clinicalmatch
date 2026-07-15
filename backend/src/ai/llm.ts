import OpenAI from 'openai'
import { z, type ZodType } from 'zod'
import { config } from '../config.js'

// -----------------------------------------------------------------------------
// Shared LLM abstraction layer.
//
// This is the ONLY file allowed to import the OpenAI SDK. Every AI feature route
// goes through `llm` (the singleton) or a client from `createLlmClient` — never
// the SDK directly — so provider details, prompting policy, JSON validation, and
// the failure policy live in exactly one place. New modalities (embeddings, …)
// are added here, not in feature code.
//
// Failure policy (the brief's "safety is a feature"): every structured call is
// validated JSON, retried once on transient/ malformed failure, then throws
// `LlmError`, which routes turn into a calm 502. A blank API key throws
// immediately (no network), so the app degrades gracefully when AI is not
// configured.
// -----------------------------------------------------------------------------

/** Thrown when an LLM call ultimately fails (after the single retry) or when the
 *  provider is not configured. Routes catch this and respond with a calm 502. */
export class LlmError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'LlmError'
  }
}

export interface CompleteJSONOptions<T> {
  system: string
  user: string
  /** Zod schema the response must match; also drives the request's json_schema. */
  schema: ZodType<T>
  /** Stable name for the schema (sent to the provider). */
  schemaName: string
  temperature?: number
  maxTokens?: number
}

export interface CompleteOptions {
  system: string
  user: string
  temperature?: number
  maxTokens?: number
}

export interface LlmClient {
  /** Structured JSON via Chat Completions Structured Outputs, Zod-validated. */
  completeJSON<T>(opts: CompleteJSONOptions<T>): Promise<T>
  /** Plain text completion. */
  complete(opts: CompleteOptions): Promise<string>
  // embed(texts: string[]): Promise<number[][]>  // added by the RAG feature.
}

export interface CreateLlmDeps {
  /** Override the API key (defaults to config.OPENAI_API_KEY). */
  apiKey?: string
  /** Inject a fetch implementation (tests use a fake — no real network). */
  fetchImpl?: typeof fetch
}

/**
 * Convert a Zod schema into a JSON Schema that satisfies OpenAI Structured
 * Outputs' strict mode: no `$schema` marker, and every object requires all of
 * its keys with `additionalProperties: false`. Zod v4 already emits the latter
 * for plain objects; we re-assert it (and strip `$schema`) defensively.
 */
function toStrictJsonSchema(schema: ZodType<unknown>): Record<string, unknown> {
  const json = z.toJSONSchema(schema, {
    target: 'draft-2020-12',
  }) as Record<string, unknown>
  const strictify = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach(strictify)
      return
    }
    const obj = node as Record<string, unknown>
    delete obj.$schema
    if (
      obj.type === 'object' &&
      obj.properties &&
      typeof obj.properties === 'object'
    ) {
      const props = obj.properties as Record<string, unknown>
      obj.additionalProperties = false
      obj.required = Object.keys(props)
      Object.values(props).forEach(strictify)
    }
    if (obj.items) strictify(obj.items)
  }
  strictify(json)
  return json
}

/** Wrap any thrown value as an LlmError (preserving the cause). */
function asLlmError(err: unknown): LlmError {
  if (err instanceof LlmError) return err
  const message = err instanceof Error ? err.message : String(err)
  return new LlmError(message, { cause: err })
}

/** Transient failures worth one retry: bad/malformed output (parse/validation),
 *  rate limits (429), server errors (5xx), and network/timeout errors (which the
 *  SDK surfaces without a numeric status). Client errors (4xx ≠ 429) are not
 *  retried — a retry would fail the same way. */
function isRetryable(err: unknown): boolean {
  if (err instanceof z.ZodError) return true
  if (err instanceof SyntaxError) return true
  const status = (err as { status?: number } | null)?.status
  if (typeof status === 'number') return status === 429 || status >= 500
  return true
}

/** Run `fn`, retrying exactly once on a retryable failure, then throw LlmError. */
async function withSingleRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (!isRetryable(err)) throw asLlmError(err)
    try {
      return await fn()
    } catch (err2) {
      throw asLlmError(err2)
    }
  }
}

/**
 * Build an LLM client. The OpenAI client is created lazily and memoised, so a
 * blank API key never reaches the SDK constructor (which would throw at import
 * time). `maxRetries: 0` keeps our own single-retry policy authoritative.
 */
export function createLlmClient(deps?: CreateLlmDeps): LlmClient {
  const apiKey = deps?.apiKey ?? config.OPENAI_API_KEY
  let client: OpenAI | null = null

  function getClient(): OpenAI {
    if (!client) {
      client = new OpenAI({
        apiKey,
        baseURL: config.OPENAI_BASE_URL,
        maxRetries: 0,
        ...(deps?.fetchImpl ? { fetch: deps.fetchImpl } : {}),
      })
    }
    return client
  }

  function requireKey(): void {
    if (!apiKey) throw new LlmError('OPENAI_API_KEY not configured')
  }

  return {
    async completeJSON<T>(opts: CompleteJSONOptions<T>): Promise<T> {
      requireKey()
      return withSingleRetry(async () => {
        const completion = await getClient().chat.completions.create({
          model: config.OPENAI_MODEL,
          temperature: opts.temperature ?? config.OPENAI_TEMPERATURE,
          max_tokens: opts.maxTokens ?? config.OPENAI_MAX_TOKENS,
          messages: [
            { role: 'system', content: opts.system },
            { role: 'user', content: opts.user },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: opts.schemaName,
              schema: toStrictJsonSchema(opts.schema),
              strict: true,
            },
          },
        })
        const content = completion.choices[0]?.message?.content
        if (!content) throw new SyntaxError('Empty completion content')
        const parsed: unknown = JSON.parse(content)
        return opts.schema.parse(parsed)
      })
    },

    async complete(opts: CompleteOptions): Promise<string> {
      requireKey()
      return withSingleRetry(async () => {
        const completion = await getClient().chat.completions.create({
          model: config.OPENAI_MODEL,
          temperature: opts.temperature ?? config.OPENAI_TEMPERATURE,
          max_tokens: opts.maxTokens ?? config.OPENAI_MAX_TOKENS,
          messages: [
            { role: 'system', content: opts.system },
            { role: 'user', content: opts.user },
          ],
        })
        const content = completion.choices[0]?.message?.content
        if (!content) throw new SyntaxError('Empty completion content')
        return content
      })
    },
  }
}

/** Application-wide singleton used by the AI routes. */
export const llm: LlmClient = createLlmClient()
