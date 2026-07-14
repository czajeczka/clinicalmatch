import { DISEASES, type Disease } from '@/types'

export { DISEASES }
export type { Disease }

// One consistent colour per disease, used for pills and community accents
// across the whole app. Chosen to sit on white/sage surfaces at AA.
export const DISEASE_COLORS: Record<Disease, string> = {
  'Breast Cancer': '#C86B98',
  'Type 2 Diabetes': '#2F8FB3',
  'Rheumatoid Arthritis': '#B5762B',
  "Crohn's Disease": '#8A6BB0',
  'Multiple Sclerosis': '#4C8C6B',
}

export function isDisease(value: string): value is Disease {
  return (DISEASES as readonly string[]).includes(value)
}
