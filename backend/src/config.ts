import 'dotenv/config'
import { z } from 'zod'

// Environment configuration, validated once at startup. Import `config`
// anywhere for typed, defaulted access to env values.
const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DB_PATH: z.string().default('data/clinicalmatch.sqlite'),
})

export const config = schema.parse(process.env)
export type Config = z.infer<typeof schema>
