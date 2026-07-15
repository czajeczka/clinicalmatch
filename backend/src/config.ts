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
  CTIS_PER_DISEASE: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().default(8)
  ),
  CTIS_TIMEOUT_MS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().default(20000)
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
