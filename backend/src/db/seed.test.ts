import { describe, it, expect, beforeAll } from 'vitest'
import { openDatabase, type DB } from './index.js'
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
})
