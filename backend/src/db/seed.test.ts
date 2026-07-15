import { describe, it, expect, beforeAll } from 'vitest'
import { openDatabase, applySchema, type DB } from './index.js'
import { seed } from './seed.js'
import { rowToTrial, rowToDiscussion } from './serialise.js'
import { DISEASES } from '../types.js'

describe('seed', () => {
  let db: DB

  beforeAll(() => {
    db = openDatabase(':memory:')
    seed(db)
  })

  it('loads 8–12 trials spanning all five diseases', () => {
    const count = db.prepare('SELECT COUNT(*) AS n FROM trials').get() as {
      n: number
    }
    expect(count.n).toBeGreaterThanOrEqual(8)
    expect(count.n).toBeLessThanOrEqual(12)

    const diseases = (
      db.prepare('SELECT DISTINCT disease FROM trials').all() as {
        disease: string
      }[]
    ).map((r) => r.disease)
    for (const d of DISEASES) {
      expect(diseases).toContain(d)
    }
  })

  it('loads 5 support groups, ≥4 discussions and ≥4 replies', () => {
    const groups = db
      .prepare('SELECT COUNT(*) AS n FROM support_groups')
      .get() as { n: number }
    const discussions = db
      .prepare('SELECT COUNT(*) AS n FROM discussions')
      .get() as { n: number }
    const replies = db.prepare('SELECT COUNT(*) AS n FROM replies').get() as {
      n: number
    }
    expect(groups.n).toBe(5)
    expect(discussions.n).toBeGreaterThanOrEqual(4)
    expect(replies.n).toBeGreaterThanOrEqual(4)
  })

  it('round-trips JSON TEXT columns back to arrays', () => {
    const trialRow = db
      .prepare('SELECT * FROM trials WHERE id = ?')
      .get('t-001')
    const trial = rowToTrial(trialRow as never)
    expect(Array.isArray(trial.inclusion_criteria)).toBe(true)
    expect(trial.inclusion_criteria.length).toBeGreaterThan(0)
    expect(Array.isArray(trial.centers)).toBe(true)
    expect(trial.centers[0]).toHaveProperty('city')

    const discRow = db
      .prepare('SELECT * FROM discussions WHERE id = ?')
      .get('d-001')
    const disc = rowToDiscussion(discRow as never, 2)
    expect(Array.isArray(disc.tags)).toBe(true)
    expect(disc.reply_count).toBe(2)
  })

  it('is safe to re-run (no duplicates)', () => {
    seed(db)
    const count = db.prepare('SELECT COUNT(*) AS n FROM trials').get() as {
      n: number
    }
    expect(count.n).toBe(10)
  })

  it('production seeding leaves trials to CTIS (no fictional trials, community still seeded)', () => {
    const prod = openDatabase(':memory:')
    applySchema(prod)
    // Pretend a CTIS trial is already imported.
    prod
      .prepare(
        `INSERT INTO trials (id, title, disease, phase, city, country, status,
          short_description, full_description, inclusion_criteria,
          exclusion_criteria, centers, contact_name, contact_email, contact_phone)
         VALUES ('ctis-1','Real trial','Lung Cancer','Phase 2','Berlin','Germany',
          'recruiting','s','f','[]','[]','[]','n','e','p')`
      )
      .run()

    seed(prod, { seedTrials: false })

    const trials = prod
      .prepare('SELECT id FROM trials')
      .all()
      .map((r) => (r as { id: string }).id)
    expect(trials).toEqual(['ctis-1']) // CTIS trial kept; no t-001… seeded
    // Community scaffolding + admin are still seeded in production.
    expect(
      (
        prod.prepare('SELECT COUNT(*) AS n FROM support_groups').get() as {
          n: number
        }
      ).n
    ).toBe(5)
    expect(
      prod.prepare("SELECT role FROM users WHERE id = 'u-admin'").get()
    ).toEqual({ role: 'admin' })
  })
})
