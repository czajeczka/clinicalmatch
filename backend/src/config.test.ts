import { describe, it, expect } from 'vitest'
import { parseConfig } from './config.js'

describe('parseConfig', () => {
  it('applies defaults when values are missing', () => {
    const config = parseConfig({})
    expect(config.PORT).toBe(3001)
    expect(config.CORS_ORIGIN).toBe('http://localhost:5173')
    expect(config.NODE_ENV).toBe('development')
    expect(config.DB_PATH).toBe('data/clinicalmatch.sqlite')
  })

  it('treats present-but-empty values as unset (no crash, uses defaults)', () => {
    // This is exactly what `env_file` passes for blank .env entries.
    const config = parseConfig({
      PORT: '',
      CORS_ORIGIN: '',
      NODE_ENV: '',
      DB_PATH: '',
    })
    expect(config.PORT).toBe(3001)
    expect(config.CORS_ORIGIN).toBe('http://localhost:5173')
    expect(config.NODE_ENV).toBe('development')
    expect(config.DB_PATH).toBe('data/clinicalmatch.sqlite')
  })

  it('uses provided values when set', () => {
    const config = parseConfig({
      PORT: '8080',
      CORS_ORIGIN: 'https://czajka.aibr.cz',
      NODE_ENV: 'production',
      DB_PATH: '/data/app.sqlite',
    })
    expect(config.PORT).toBe(8080)
    expect(config.CORS_ORIGIN).toBe('https://czajka.aibr.cz')
    expect(config.NODE_ENV).toBe('production')
    expect(config.DB_PATH).toBe('/data/app.sqlite')
  })
})
