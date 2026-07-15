import { describe, it, expect } from 'vitest'
import { openDatabase, applySchema, type DB } from '../db/index.js'
import { runImport } from './importer.js'
import type { CtisClient, CtisSearchRecord } from './ctisClient.js'

function mkRecord(id: string, lastUpdated = '10/07/2026'): CtisSearchRecord {
  return {
    ctNumber: id,
    ctTitle: `Trial ${id} in breast cancer`,
    conditions: 'Breast cancer',
    trialCountries: ['Germany:1'],
    trialPhase: 'Therapeutic exploratory (Phase II)',
    ageGroup: '18-64 years',
    gender: 'Female',
    lastUpdated,
    ctStatus: 2,
  }
}

const detailFixture = {
  ctStatus: 'Ongoing, recruiting',
  authorizedApplication: {
    authorizedPartI: {
      trialDetails: {
        trialInformation: {
          eligibilityCriteria: {
            principalInclusionCriteria: [
              { principalInclusionCriteria: 'Adults aged 18 or over' },
            ],
            principalExclusionCriteria: [
              { principalExclusionCriteria: 'Pregnant or breastfeeding' },
            ],
          },
        },
      },
      sponsors: [
        {
          publicContacts: [
            {
              functionalName: 'Dr Test',
              functionalEmailAddress: 'test@x.eu',
              telephone: '+49 30 1',
            },
          ],
        },
      ],
    },
    authorizedPartsII: [
      {
        trialSites: [
          {
            organisationAddressInfo: {
              address: { city: 'Berlin', countryName: 'Germany' },
              organisation: { name: 'Charité' },
            },
          },
        ],
      },
    ],
  },
}

function makeClient(opts: {
  records: CtisSearchRecord[]
  failRetrieve?: boolean
  failSearch?: boolean
}): CtisClient {
  return {
    async search() {
      if (opts.failSearch) throw new Error('network down')
      return { data: opts.records }
    },
    async retrieve() {
      if (opts.failRetrieve) throw new Error('detail HTTP 500')
      return detailFixture
    },
  }
}

function freshDb(): DB {
  const db = openDatabase(':memory:')
  applySchema(db)
  return db
}

const only = { diseases: ['Breast Cancer'] as const, perDisease: 10 }
const count = (db: DB) =>
  (db.prepare('SELECT COUNT(*) AS c FROM trials').get() as { c: number }).c

describe('CTIS importer', () => {
  it('full import populates the catalogue and logs success', async () => {
    const db = freshDb()
    const res = await runImport({
      db,
      client: makeClient({ records: [mkRecord('a'), mkRecord('b')] }),
      mode: 'full',
      diseases: [...only.diseases],
      perDisease: only.perDisease,
    })
    expect(res.status).toBe('success')
    expect(res.imported).toBe(2)
    expect(count(db)).toBe(2)
    const log = db
      .prepare('SELECT * FROM sync_logs ORDER BY id DESC LIMIT 1')
      .get() as { status: string; trials_imported: number; mode: string }
    expect(log.status).toBe('success')
    expect(log.mode).toBe('full')
    expect(log.trials_imported).toBe(2)
  })

  it('full import replaces the previous catalogue', async () => {
    const db = freshDb()
    await runImport({
      db,
      client: makeClient({ records: [mkRecord('a'), mkRecord('b')] }),
      mode: 'full',
      diseases: [...only.diseases],
    })
    await runImport({
      db,
      client: makeClient({ records: [mkRecord('c')] }),
      mode: 'full',
      diseases: [...only.diseases],
    })
    expect(count(db)).toBe(1)
    expect(
      db
        .prepare('SELECT id FROM trials')
        .all()
        .map((r) => (r as { id: string }).id)
    ).toEqual(['c'])
  })

  it('incremental import skips unchanged, updates changed, adds new', async () => {
    const db = freshDb()
    await runImport({
      db,
      client: makeClient({ records: [mkRecord('a', '10/07/2026')] }),
      mode: 'full',
      diseases: [...only.diseases],
    })

    const unchanged = await runImport({
      db,
      client: makeClient({ records: [mkRecord('a', '10/07/2026')] }),
      mode: 'incremental',
      diseases: [...only.diseases],
    })
    expect(unchanged.imported).toBe(0)
    expect(unchanged.updated).toBe(0)

    const changed = await runImport({
      db,
      client: makeClient({ records: [mkRecord('a', '15/07/2026')] }),
      mode: 'incremental',
      diseases: [...only.diseases],
    })
    expect(changed.updated).toBe(1)

    const added = await runImport({
      db,
      client: makeClient({ records: [mkRecord('d', '01/01/2026')] }),
      mode: 'incremental',
      diseases: [...only.diseases],
    })
    expect(added.imported).toBe(1)
    expect(count(db)).toBe(2) // a + d
  })

  it('reports "partial" and still imports when detail fetches fail', async () => {
    const db = freshDb()
    const res = await runImport({
      db,
      client: makeClient({ records: [mkRecord('a')], failRetrieve: true }),
      mode: 'full',
      diseases: [...only.diseases],
    })
    expect(res.status).toBe('partial')
    expect(res.failed).toBe(1)
    expect(res.imported).toBe(1)
    // search-only fallback still yields eligibility from age/sex
    const row = db
      .prepare('SELECT inclusion_criteria FROM trials LIMIT 1')
      .get() as { inclusion_criteria: string }
    expect(JSON.parse(row.inclusion_criteria).length).toBeGreaterThan(0)
  })

  it('on search failure logs an error and preserves existing data', async () => {
    const db = freshDb()
    await runImport({
      db,
      client: makeClient({ records: [mkRecord('a')] }),
      mode: 'full',
      diseases: [...only.diseases],
    })
    expect(count(db)).toBe(1)

    const res = await runImport({
      db,
      client: makeClient({ records: [], failSearch: true }),
      mode: 'full',
      diseases: [...only.diseases],
    })
    expect(res.status).toBe('error')
    expect(count(db)).toBe(1) // untouched

    const log = db
      .prepare(
        "SELECT * FROM sync_logs WHERE status = 'error' ORDER BY id DESC LIMIT 1"
      )
      .get() as { message: string } | undefined
    expect(log).toBeTruthy()
  })
})
