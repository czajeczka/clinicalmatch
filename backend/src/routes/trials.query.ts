import type { Disease, Trial } from '../types.js'

/**
 * Filter the catalogue by free-text query and disease. Pure and HTTP-free so it
 * can be unit-tested directly; mirrors the frontend's `filterTrials`.
 * - `query` matches (case-insensitive, trimmed) title, short_description, city,
 *   and disease.
 * - `disease` of `'all'` returns every disease.
 */
export function filterTrials(
  trials: Trial[],
  query: string,
  disease: Disease | 'all'
): Trial[] {
  const q = query.trim().toLowerCase()
  return trials.filter((t) => {
    if (disease !== 'all' && t.disease !== disease) return false
    if (!q) return true
    return (
      t.title.toLowerCase().includes(q) ||
      t.short_description.toLowerCase().includes(q) ||
      t.city.toLowerCase().includes(q) ||
      t.disease.toLowerCase().includes(q)
    )
  })
}
