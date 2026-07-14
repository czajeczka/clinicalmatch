import { describe, it, expect } from 'vitest'
import { filterTrials, computeVerdict, FAIL_TOKEN, api } from './mockApi'
import { MOCK_TRIALS } from './data'
import type { Trial, SelfCheckInput } from '@/types'

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

describe('computeVerdict', () => {
  const base: SelfCheckInput = {
    trial_id: t2d.id,
    age: 45,
    gender: 'female',
    condition: 'Type 2 Diabetes',
  }

  it('returns likely when age and condition clearly match', () => {
    const r = computeVerdict(t2d, base)
    expect(r.verdict).toBe('likely')
    expect(r.matches.length).toBeGreaterThan(0)
  })

  it('returns unlikely on a clear age mismatch (shown grey, never red)', () => {
    const r = computeVerdict(t2d, { ...base, age: 80 })
    expect(r.verdict).toBe('unlikely')
    expect(r.gaps.some((g) => /age/i.test(g))).toBe(true)
  })

  it('defaults to possibly when the condition is missing/ambiguous', () => {
    const r = computeVerdict(t2d, { ...base, condition: '' })
    expect(r.verdict).toBe('possibly')
  })

  it('always carries the informational-only note', () => {
    expect(computeVerdict(t2d, base).note.toLowerCase()).toContain(
      'not medical advice'
    )
  })
})

describe('api AI failure handling', () => {
  it('throws when the input contains the fail token', async () => {
    await expect(
      api.selfCheck({
        trial_id: t2d.id,
        age: 45,
        gender: 'female',
        condition: `Type 2 Diabetes ${FAIL_TOKEN}`,
      })
    ).rejects.toThrow()
  })

  it('answers off-topic questions without guessing', async () => {
    const a = await api.askTrial(t2d.id, 'What is the weather like?')
    expect(a.answer.toLowerCase()).toContain('protocol')
  })
})
