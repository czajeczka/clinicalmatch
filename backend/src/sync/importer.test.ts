import { describe, it, expect } from 'vitest'
import { openDatabase, applySchema, type DB } from '../db/index.js'
import { runImport, resolveStatuses } from './importer.js'
import type {
  CtisClient,
  CtisSearchRecord,
  CtisSearchResponse,
} from './ctisClient.js'

function mkRecord(id: string, lastUpdated = '10/07/2026'): CtisSearchRecord {
  return {
    ctNumber: id,
    ctTitle: `Trial ${id}`,
    conditions: 'Breast cancer',
    trialCountries: ['Germany:1', 'France:2'],
    trialPhase: 'Therapeutic exploratory (Phase II)',
    ageGroup: '18-64 years',
    gender: 'Female',
    sponsor: 'Charité Berlin',
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
            { functionalEmailAddress: 'test@x.eu', telephone: '+49 1' },
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

function makePagingClient(all: CtisSearchRecord[], size: number): CtisClient {
  return {
    async search(_t, page, s): Promise<CtisSearchResponse> {
      const sz = s || size
      const start = (page - 1) * sz
      const slice = all.slice(start, start + sz)
      return { data: slice, pagination: { nextPage: start + sz < all.length } }
    },
    async retrieve() {
      return detailFixture
    },
  }
}

function freshDb(): DB {
  const db = openDatabase(':memory:')
  applySchema(db)
  return db
}
const BC = ['Breast Cancer']
const count = (db: DB) =>
  (db.prepare('SELECT COUNT(*) AS c FROM trials').get() as { c: number }).c

describe('resolveStatuses', () => {
  it('empty = all, otherwise the named subset', () => {
    expect(resolveStatuses('')).toHaveLength(4)
    expect(resolveStatuses('recruiting, completed')).toEqual([
      'recruiting',
      'completed',
    ])
  })
})

describe('CTIS importer (streaming)', () => {
  it('full import stores trials, sponsor + countries, and logs success', async () => {
    const db = freshDb()
    const res = await runImport({
      db,
      client: makeClient({ records: [mkRecord('a'), mkRecord('b')] }),
      mode: 'full',
      diseases: BC,
    })
    expect(res.status).toBe('success')
    expect(res.imported).toBe(2)
    expect(count(db)).toBe(2)
    // normalised sponsor (deduped) + country junction
    expect(
      (db.prepare('SELECT COUNT(*) AS c FROM sponsors').get() as { c: number })
        .c
    ).toBe(1)
    expect(
      (
        db
          .prepare(
            "SELECT COUNT(*) AS c FROM trial_countries WHERE trial_id='a'"
          )
          .get() as { c: number }
      ).c
    ).toBe(2) // Germany + France
    const disease = (
      db.prepare("SELECT disease FROM trials WHERE id='a'").get() as {
        disease: string
      }
    ).disease
    expect(disease).toBe('Breast Cancer')
  })

  it('de-duplicates the same trial across disease areas', async () => {
    const db = freshDb()
    const res = await runImport({
      db,
      client: makeClient({ records: [mkRecord('dup')] }),
      mode: 'full',
      diseases: ['Breast Cancer', 'Lung Cancer'],
    })
    expect(res.seen).toBe(1)
    expect(count(db)).toBe(1)
  })

  it('paginates up to the per-disease limit', async () => {
    const db = freshDb()
    const many = Array.from({ length: 10 }, (_, i) => mkRecord(`t${i}`))
    const res = await runImport({
      db,
      client: makePagingClient(many, 2),
      mode: 'full',
      diseases: BC,
      limit: 5,
      batchSize: 2,
    })
    expect(res.imported).toBe(5)
    expect(count(db)).toBe(5)
  })

  it('full import sweeps trials that dropped out (within its disease scope)', async () => {
    const db = freshDb()
    await runImport({
      db,
      client: makeClient({ records: [mkRecord('a'), mkRecord('b')] }),
      mode: 'full',
      diseases: BC,
    })
    const res = await runImport({
      db,
      client: makeClient({ records: [mkRecord('c')] }),
      mode: 'full',
      diseases: BC,
    })
    expect(res.removed).toBe(2)
    expect(count(db)).toBe(1)
    expect(
      (db.prepare('SELECT id FROM trials').get() as { id: string }).id
    ).toBe('c')
  })

  it('scoped full import does not wipe other diseases', async () => {
    const db = freshDb()
    await runImport({
      db,
      client: makeClient({ records: [mkRecord('bc1')] }),
      mode: 'full',
      diseases: ['Breast Cancer'],
    })
    // A full import scoped to Lung Cancer must not delete the Breast Cancer row.
    await runImport({
      db,
      client: makeClient({ records: [mkRecord('lc1')] }),
      mode: 'full',
      diseases: ['Lung Cancer'],
    })
    expect(count(db)).toBe(2)
  })

  it('incremental skips unchanged, updates changed, adds new', async () => {
    const db = freshDb()
    await runImport({
      db,
      client: makeClient({ records: [mkRecord('a', '10/07/2026')] }),
      mode: 'full',
      diseases: BC,
    })
    const unchanged = await runImport({
      db,
      client: makeClient({ records: [mkRecord('a', '10/07/2026')] }),
      mode: 'incremental',
      diseases: BC,
    })
    expect(unchanged.imported).toBe(0)
    expect(unchanged.skipped).toBe(1)

    const changed = await runImport({
      db,
      client: makeClient({ records: [mkRecord('a', '20/07/2026')] }),
      mode: 'incremental',
      diseases: BC,
    })
    expect(changed.updated).toBe(1)

    const added = await runImport({
      db,
      client: makeClient({ records: [mkRecord('z', '01/01/2026')] }),
      mode: 'incremental',
      diseases: BC,
    })
    expect(added.imported).toBe(1)
    expect(count(db)).toBe(2) // a + z, incremental never deletes
  })

  it('filters by status', async () => {
    const db = freshDb()
    const res = await runImport({
      db,
      client: makeClient({ records: [mkRecord('a')] }),
      mode: 'incremental', // incremental → no sweep, isolates the filter
      diseases: BC,
      statuses: ['completed'], // mapped status is 'recruiting' → filtered out
    })
    expect(res.imported).toBe(0)
    expect(res.skipped).toBe(1)
    expect(count(db)).toBe(0)
  })

  it('filters by country', async () => {
    const db = freshDb()
    const res = await runImport({
      db,
      client: makeClient({ records: [mkRecord('a')] }), // Germany, France
      mode: 'incremental',
      diseases: BC,
      countries: ['Spain'],
    })
    expect(res.skipped).toBe(1)
    expect(count(db)).toBe(0)
  })

  it('partial when detail fails, still imports via fallback', async () => {
    const db = freshDb()
    const res = await runImport({
      db,
      client: makeClient({ records: [mkRecord('a')], failRetrieve: true }),
      mode: 'full',
      diseases: BC,
    })
    expect(res.status).toBe('partial')
    expect(res.imported).toBe(1)
  })

  it('search failure logs error and preserves data', async () => {
    const db = freshDb()
    await runImport({
      db,
      client: makeClient({ records: [mkRecord('a')] }),
      mode: 'full',
      diseases: BC,
    })
    const res = await runImport({
      db,
      client: makeClient({ records: [], failSearch: true }),
      mode: 'full',
      diseases: BC,
    })
    expect(res.status).toBe('error')
    expect(count(db)).toBe(1)
  })
})
