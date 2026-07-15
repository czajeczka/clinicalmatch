import { useState } from 'react'
import type { Trial } from '@/types'

// Client-only "recently viewed" trials, stored as slim snapshots in
// localStorage (no backend). Recorded when a trial detail page opens; read by
// the dashboard's "Continue browsing" section.

export interface RecentTrial {
  id: string
  title: string
  disease: string
  city: string
  country: string
  status: string
}

const KEY = 'clinicalmatch.recent'
const MAX = 12

export function loadRecentlyViewed(): RecentTrial[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as RecentTrial[]) : []
  } catch {
    return []
  }
}

/** Record a trial as recently viewed (most-recent first, de-duplicated). */
export function recordRecentlyViewed(t: Trial): void {
  try {
    const slim: RecentTrial = {
      id: t.id,
      title: t.title,
      disease: t.disease,
      city: t.city,
      country: t.country,
      status: t.status,
    }
    const next = [slim, ...loadRecentlyViewed().filter((x) => x.id !== t.id)]
    localStorage.setItem(KEY, JSON.stringify(next.slice(0, MAX)))
  } catch {
    /* ignore quota / serialisation errors */
  }
}

/** Snapshot of recently-viewed trials, read once on mount (the dashboard
 *  remounts on navigation, so it stays fresh without a storage listener). */
export function useRecentlyViewed(): RecentTrial[] {
  const [list] = useState<RecentTrial[]>(loadRecentlyViewed)
  return list
}
