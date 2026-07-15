import { describe, it, expect } from 'vitest'
import { filterTrials, FAIL_TOKEN, api } from './mockApi'
import { MOCK_TRIALS } from './data'
import type { Trial } from '@/types'

const t2d = MOCK_TRIALS.find((t) => t.id === 't-001') as Trial

describe('filterTrials', () => {
  it('returns everything with no query and "all"', () => {
    expect(filterTrials(MOCK_TRIALS, '', 'all')).toHaveLength(
      MOCK_TRIALS.length
    )
  })

  it('filters by disease', () => {
    const out = filterTrials(MOCK_TRIALS, '', 'Multiple Sclerosis')
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((t) => t.disease === 'Multiple Sclerosis')).toBe(true)
  })

  it('matches free text against title, description and city', () => {
    expect(filterTrials(MOCK_TRIALS, 'warsaw', 'all')).toHaveLength(1)
    expect(filterTrials(MOCK_TRIALS, 'zzzznope', 'all')).toHaveLength(0)
  })

  it('is case-insensitive and trims', () => {
    expect(filterTrials(MOCK_TRIALS, '  BERLIN ', 'all')).toHaveLength(1)
  })
})

describe('api AI failure handling (still-mocked features)', () => {
  // selfCheck and enhancePost now call the real backend (/ai/*); the remaining
  // AI features stay mocked here and keep the FAILTEST escape hatch.
  it('throws when a mocked AI input contains the fail token', async () => {
    await expect(
      api.askTrial(t2d.id, `What about diet ${FAIL_TOKEN}?`)
    ).rejects.toThrow()
  })

  it('answers off-topic questions without guessing', async () => {
    const a = await api.askTrial(t2d.id, 'What is the weather like?')
    expect(a.answer.toLowerCase()).toContain('protocol')
  })
})
