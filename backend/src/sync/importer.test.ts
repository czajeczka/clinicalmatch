import { describe, it, expect } from 'vitest'
import { openDatabase, applySchema, type DB } from '../db/index.js'
import { runImport, resolveDiseases, resolveStatuses } from './importer.js'
import type {
  CtisClient,
  CtisSearchRecord,
  CtisSearchResponse,
} from './ctisClient.js'

function mkRecord(id: string, lastUpdated = '10/07/2026'): CtisSearchRecord {
  return {
    ctNumber: id,
    ctTitle: `Trial ${id} in breast cancer`,
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
  detail?: unknown
}): CtisClient {
  return {
    async search() {
      if (opts.failSearch) throw new Error('network down')
      return { data: opts.records }
    },
    async retrieve() {
      if (opts.failRetrieve) throw new Error('detail HTTP 500')
      return opts.detail ?? detailFixture
    },
  }
}

/** Client that serves pages of `pageSize` from a flat record list. */
function makePagingClient(
  records: CtisSearchRecord[],
  pageSize: number
): CtisClient {
  return {
    async search(_term, page, size): Promise<CtisSearchResponse> {
      const s = size || pageSize
      const start = (page - 1) * s
      const slice = records.slice(start, start + s)
      return {
        data: slice,
        pagination: { nextPage: start + s < records.length },
      }
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

const BC = ['Breast Cancer'] as const
const count = (db: DB) =>
  (db.prepare('SELECT COUNT(*) AS c FROM trials').get() as { c: number }).c

describe('import config resolution', () => {
  it('resolves diseases (empty = all, invalid ignored)', () => {
    expect(resolveDiseases('')).toHaveLength(5)
    expect(resolveDiseases('breast cancer')).toEqual(['Breast Cancer'])
    expect(resolveDiseases('nonsense')).toHaveLength(5) // falls back to all
  })
  it('resolves statuses (empty = all)', () => {
    expect(resolveStatuses('')).toHaveLength(4)
    expect(resolveStatuses('recruiting, completed')).toEqual([
      'recruiting',
      'completed',
    ])
  })
})

describe('CTIS importer', () => {
  it('full import populates the catalogue, meta and a sync_logs row', async () => {
    const db = freshDb()
    const res = await runImport({
      db,
      client: makeClient({ records: [mkRecord('a'), mkRecord('b')] }),
      mode: 'full',
      diseases: [...BC],
    })
    expect(res.status).toBe('success')
    expect(res.imported).toBe(2)
    expect(count(db)).toBe(2)

    // richer provenance stored (internal, not in the API)
    const meta = db
      .prepare('SELECT * FROM trial_sync_meta WHERE trial_id = ?')
      .get('a') as { source_url: string; sponsor: string; countries: string }
    expect(meta.source_url).toContain('euclinicaltrials.eu')
    expect(meta.sponsor).toBe('Charité Berlin')
    expect(JSON.parse(meta.countries)).toEqual(['Germany', 'France'])

    const l = db
      .prepare('SELECT * FROM sync_logs ORDER BY id DESC LIMIT 1')
      .get() as {
      status: string
      trials_imported: number
      trials_skipped: number
      duration_ms: number
    }
    expect(l.status).toBe('success')
    expect(l.trials_imported).toBe(2)
    expect(l.duration_ms).toBeGreaterThanOrEqual(0)
  })

  it('de-duplicates the same trial across disease queries', async () => {
    const db = freshDb()
    // Same record returned for every disease search → one row, not many.
    const res = await runImport({
      db,
      client: makeClient({ records: [mkRecord('dup')] }),
      mode: 'full',
      diseases: ['Breast Cancer', 'Type 2 Diabetes'],
    })
    expect(res.seen).toBe(1)
    expect(count(db)).toBe(1)
  })

  it('paginates until the per-disease limit is reached', async () => {
    const db = freshDb()
    const many = Array.from({ length: 10 }, (_, i) => mkRecord(`t${i}`))
    const res = await runImport({
      db,
      client: makePagingClient(many, 2), // pages of 2
      mode: 'full',
      diseases: [...BC],
      limit: 5, // stop after 5 despite 10 available
      batchSize: 2,
    })
    expect(res.imported).toBe(5)
    expect(count(db)).toBe(5)
  })

  it('full import replaces the previous catalogue', async () => {
    const db = freshDb()
    await runImport({
      db,
      client: makeClient({ records: [mkRecord('a'), mkRecord('b')] }),
      mode: 'full',
      diseases: [...BC],
    })
    await runImport({
      db,
      client: makeClient({ records: [mkRecord('c')] }),
      mode: 'full',
      diseases: [...BC],
    })
    expect(count(db)).toBe(1)
    expect(
      (db.prepare('SELECT id FROM trials').get() as { id: string }).id
    ).toBe('c')
  })

  it('incremental skips unchanged, updates changed, adds new', async () => {
    const db = freshDb()
    await runImport({
      db,
      client: makeClient({ records: [mkRecord('a', '10/07/2026')] }),
      mode: 'full',
      diseases: [...BC],
    })

    const unchanged = await runImport({
      db,
      client: makeClient({ records: [mkRecord('a', '10/07/2026')] }),
      mode: 'incremental',
      diseases: [...BC],
    })
    expect(unchanged.imported).toBe(0)
    expect(unchanged.updated).toBe(0)
    expect(unchanged.skipped).toBe(1)

    const changed = await runImport({
      db,
      client: makeClient({ records: [mkRecord('a', '15/07/2026')] }),
      mode: 'incremental',
      diseases: [...BC],
    })
    expect(changed.updated).toBe(1)

    const added = await runImport({
      db,
      client: makeClient({ records: [mkRecord('d', '01/01/2026')] }),
      mode: 'incremental',
      diseases: [...BC],
    })
    expect(added.imported).toBe(1)
    expect(count(db)).toBe(2)
  })

  it('filters by IMPORT_STATUS without wiping the catalogue', async () => {
    const db = freshDb()
    await runImport({
      db,
      client: makeClient({ records: [mkRecord('a')] }),
      mode: 'full',
      diseases: [...BC],
    })
    expect(count(db)).toBe(1)

    // mapped status is 'recruiting'; keep only 'completed' → all filtered out
    const res = await runImport({
      db,
      client: makeClient({ records: [mkRecord('a')] }),
      mode: 'full',
      diseases: [...BC],
      statuses: ['completed'],
    })
    expect(res.status).toBe('success')
    expect(res.imported).toBe(0)
    expect(res.skipped).toBe(1)
    expect(count(db)).toBe(1) // NOT wiped
  })

  it('reports "partial" and still imports when detail fetches fail', async () => {
    const db = freshDb()
    const res = await runImport({
      db,
      client: makeClient({ records: [mkRecord('a')], failRetrieve: true }),
      mode: 'full',
      diseases: [...BC],
    })
    expect(res.status).toBe('partial')
    expect(res.imported).toBe(1)
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
      diseases: [...BC],
    })
    expect(count(db)).toBe(1)

    const res = await runImport({
      db,
      client: makeClient({ records: [], failSearch: true }),
      mode: 'full',
      diseases: [...BC],
    })
    expect(res.status).toBe('error')
    expect(count(db)).toBe(1) // untouched
    const err = db
      .prepare(
        "SELECT * FROM sync_logs WHERE status = 'error' ORDER BY id DESC LIMIT 1"
      )
      .get()
    expect(err).toBeTruthy()
  })
})
