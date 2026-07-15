import { describe, it, expect } from 'vitest'
import {
  classifyDisease,
  mapPhase,
  mapStatus,
  mapCtisTrial,
  buildSourceMeta,
  parseCountries,
} from './ctisMapper.js'
import type { CtisSearchRecord } from './ctisClient.js'

const search: CtisSearchRecord = {
  ctNumber: '2025-000001-11-00',
  ctTitle: 'An open-label study of drug X in breast cancer',
  shortTitle: 'STUDY-X',
  conditions: 'Metastatic breast cancer',
  trialCountries: ['Germany:3'],
  trialPhase: 'Therapeutic exploratory (Phase II)- First administration',
  ageGroup: '18-64 years',
  gender: 'Female',
  totalNumberEnrolled: '120',
  primaryEndPoint: 'Overall response rate at 6 months',
  sponsor: 'Charité Berlin',
  lastUpdated: '10/07/2026',
  ctStatus: 2,
}

const detail = {
  ctStatus: 'Ongoing, recruiting',
  authorizedApplication: {
    authorizedPartI: {
      trialDetails: {
        trialInformation: {
          eligibilityCriteria: {
            principalInclusionCriteria: [
              { principalInclusionCriteria: 'Adults aged 18 or over' },
              {
                principalInclusionCriteria:
                  'Histologically confirmed diagnosis',
              },
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
              functionalEmailAddress: 'test@charite.eu',
              telephone: '+49 30 12345',
            },
          ],
          scientificContacts: [],
        },
      ],
    },
    authorizedPartsII: [
      {
        trialSites: [
          {
            organisationAddressInfo: {
              address: { city: 'Berlin', countryName: 'Germany' },
              organisation: { name: 'Charité Universitätsmedizin' },
            },
          },
        ],
      },
    ],
  },
}

describe('ctis mapper', () => {
  it('classifies the five canonical diseases and rejects others', () => {
    expect(classifyDisease('Metastatic breast cancer')).toBe('Breast Cancer')
    expect(classifyDisease('Type 2 Diabetes Mellitus')).toBe('Type 2 Diabetes')
    expect(classifyDisease('Active rheumatoid arthritis')).toBe(
      'Rheumatoid Arthritis'
    )
    expect(classifyDisease("Crohn's disease")).toBe("Crohn's Disease")
    expect(classifyDisease('Relapsing multiple sclerosis')).toBe(
      'Multiple Sclerosis'
    )
    expect(classifyDisease('Lung carcinoma')).toBeNull()
  })

  it('normalises phase and status', () => {
    expect(mapPhase('Therapeutic exploratory (Phase II)- x')).toBe('Phase 2')
    expect(mapPhase('Human Pharmacology (Phase I)-  Other')).toBe('Phase 1')
    expect(mapPhase('')).toBe('Not specified')
    expect(mapStatus('Ended')).toBe('completed')
    expect(mapStatus('Suspended')).toBe('closed')
    expect(mapStatus('Under evaluation')).toBe('not yet recruiting')
    expect(mapStatus('Ongoing, recruiting')).toBe('recruiting')
  })

  it('maps a full record (search + detail) into the Trial shape', () => {
    const trial = mapCtisTrial({ search, detail, disease: 'Breast Cancer' })
    expect(trial).not.toBeNull()
    expect(trial!.id).toBe('2025-000001-11-00')
    expect(trial!.disease).toBe('Breast Cancer')
    expect(trial!.phase).toBe('Phase 2')
    expect(trial!.status).toBe('recruiting')
    expect(trial!.city).toBe('Berlin')
    expect(trial!.country).toBe('Germany')
    expect(trial!.inclusion_criteria).toHaveLength(2)
    expect(trial!.exclusion_criteria).toEqual(['Pregnant or breastfeeding'])
    expect(trial!.centers).toEqual([
      {
        name: 'Charité Universitätsmedizin',
        city: 'Berlin',
        country: 'Germany',
      },
    ])
    expect(trial!.contact_email).toBe('test@charite.eu')
    expect(trial!.full_description).toContain('CTIS')
  })

  it('falls back to search-only fields when detail is missing', () => {
    const trial = mapCtisTrial({
      search,
      detail: null,
      disease: 'Breast Cancer',
    })
    expect(trial!.inclusion_criteria).toEqual([
      'Age group: 18-64 years',
      'Sex eligible for study: Female',
    ])
    expect(trial!.exclusion_criteria).toEqual([])
    expect(trial!.centers).toEqual([])
    expect(trial!.country).toBe('Germany')
    expect(trial!.status).toBe('recruiting') // from numeric ctStatus fallback
  })

  it('builds internal source metadata for future AI use', () => {
    expect(parseCountries(['Germany:3', 'France:1'])).toEqual([
      'Germany',
      'France',
    ])
    const meta = buildSourceMeta(
      { ...search, trialCountries: ['Germany:3', 'Poland:2'] },
      detail
    )
    expect(meta.source_id).toBe('2025-000001-11-00')
    expect(meta.source_url).toContain('euclinicaltrials.eu')
    expect(meta.source_url).toContain('2025-000001-11-00')
    expect(meta.sponsor).toBe('Charité Berlin')
    expect(meta.recruitment_status).toBe('Ongoing, recruiting')
    expect(meta.countries).toEqual(['Germany', 'Poland'])
  })

  it('returns null for a record with no id', () => {
    expect(
      mapCtisTrial({
        search: { ctNumber: '' },
        detail: null,
        disease: 'Breast Cancer',
      })
    ).toBeNull()
  })
})
