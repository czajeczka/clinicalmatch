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
