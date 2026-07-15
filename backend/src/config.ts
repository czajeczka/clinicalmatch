import 'dotenv/config'
import { z } from 'zod'

// Environment configuration, validated once at startup. Import `config`
// anywhere for typed, defaulted access to env values.
//
// `env_file` in docker-compose passes present-but-empty variables as empty
// strings, and Zod's `.default()` only fires on `undefined` — so we map
// "" -> undefined first. This means a blank value in `.env` degrades to the
// sensible default instead of crashing the server on startup.
const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v)

const schema = z.object({
  PORT: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().default(3001)
  ),
  CORS_ORIGIN: z.preprocess(
    emptyToUndefined,
    z.string().default('http://localhost:5173')
  ),
  NODE_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(['development', 'test', 'production']).default('development')
  ),
  DB_PATH: z.preprocess(
    emptyToUndefined,
    z.string().default('data/clinicalmatch.sqlite')
  ),
  // CTIS (EU Clinical Trials Information System) public API — the real trial
  // data source. Synced by the backend importer only; never called from the UI.
  CTIS_API_URL: z.preprocess(
    emptyToUndefined,
    z.string().default('https://euclinicaltrials.eu/ctis-public-api')
  ),
  CTIS_TIMEOUT_MS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().default(20000)
  ),
  // Importer settings (all env-configurable).
  IMPORT_LIMIT: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().default(8)
  ), // max trials per disease
  IMPORT_BATCH_SIZE: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().default(20)
  ), // CTIS search page size
  IMPORT_RETRY_COUNT: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().nonnegative().default(2)
  ),
  // Comma-separated; empty = all five canonical diseases.
  IMPORT_DISEASES: z.preprocess(emptyToUndefined, z.string().default('')),
  // Comma-separated TrialStatus values to keep; empty = all statuses.
  IMPORT_STATUS: z.preprocess(emptyToUndefined, z.string().default('')),
  // Comma-separated country names to keep; empty = all European countries.
  IMPORT_COUNTRIES: z.preprocess(emptyToUndefined, z.string().default('')),
  // Cadence hint for a scheduled sync (used by the host cron / docs; the API
  // process does not run a timer itself).
  SYNC_INTERVAL_HOURS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().default(24)
  ),
  // OpenAI / LLM provider — powers the AI smart features through the shared
  // abstraction layer (src/ai/llm.ts). When OPENAI_API_KEY is blank the AI
  // endpoints return a calm fallback instead of crashing (see llm.ts).
  OPENAI_API_KEY: z.preprocess(emptyToUndefined, z.string().default('')),
  OPENAI_BASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().default('https://api.openai.com/v1')
  ),
  OPENAI_MODEL: z.preprocess(
    emptyToUndefined,
    z.string().default('gpt-4o-mini')
  ),
  OPENAI_TEMPERATURE: z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(0).max(2).default(0.2)
  ),
  OPENAI_MAX_TOKENS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().default(800)
  ),
  OPENAI_EMBEDDING_MODEL: z.preprocess(
    emptyToUndefined,
    z.string().default('text-embedding-3-small')
  ),
})

export type Config = z.infer<typeof schema>

/**
 * Parse and validate config from an env-like object. Empty strings fall back to
 * defaults (see note above), so a missing or blank `.env` value never crashes.
 */
export function parseConfig(env: NodeJS.ProcessEnv): Config {
  return schema.parse(env)
}

export const config = parseConfig(process.env)
