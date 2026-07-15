import { DISEASES, type Disease } from '@/types'

export { DISEASES }
export type { Disease }

// One consistent colour per disease, used for pills and community accents
// across the whole app. Deepened so the pill text (12px on a 12% tint of the
// same hue) clears WCAG AA (~4.6:1) on the light surfaces.
export const DISEASE_COLORS: Record<Disease, string> = {
  'Breast Cancer': '#9A5275',
  'Type 2 Diabetes': '#25718D',
  'Rheumatoid Arthritis': '#915E22',
  "Crohn's Disease": '#785D99',
  'Multiple Sclerosis': '#3F7459',
}

export function isDisease(value: string): value is Disease {
  return (DISEASES as readonly string[]).includes(value)
}

/**
 * A stable, AA-contrast colour for ANY disease-area label. The five featured
 * diseases keep their curated colours; every other area gets a deterministic
 * hue from a hash, so the platform can display unlimited disease areas without
 * a hardcoded map.
 */
export function colorForDisease(name: string): string {
  const curated = (DISEASE_COLORS as Record<string, string>)[name]
  if (curated) return curated
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  const hue = h % 360
  // Dark enough (L≈32%) for AA text on the 12%-tint pill background.
  return `hsl(${hue} 45% 32%)`
}
