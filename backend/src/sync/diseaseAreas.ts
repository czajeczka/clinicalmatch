// Disease areas the importer can pull from CTIS. Each entry is a CTIS search
// term plus the label stored on the trial. This is data, not logic: adding a
// new area is a one-line edit here (or override entirely at runtime via the
// IMPORT_DISEASES env var / admin panel — no code change needed).
//
// `disease` on a Trial is a free-form string (the matched area label), so the
// platform is not limited to a fixed enum.

export interface DiseaseArea {
  /** Stored on the trial as `disease` and shown in filters. */
  label: string
  /** CTIS full-text query term (defaults to the label lowercased). */
  query?: string
}

export const DISEASE_AREAS: DiseaseArea[] = [
  // Oncology
  { label: 'Breast Cancer' },
  { label: 'Lung Cancer' },
  { label: 'Colorectal Cancer' },
  { label: 'Prostate Cancer' },
  { label: 'Melanoma' },
  { label: 'Leukemia' },
  { label: 'Lymphoma' },
  { label: 'Ovarian Cancer' },
  { label: 'Pancreatic Cancer' },
  { label: 'Oncology', query: 'cancer' },
  // Neurology
  { label: 'Multiple Sclerosis' },
  { label: "Parkinson's Disease", query: 'parkinson' },
  { label: "Alzheimer's Disease", query: 'alzheimer' },
  { label: 'Epilepsy' },
  { label: 'Migraine' },
  { label: 'Stroke' },
  // Cardiology
  { label: 'Heart Failure' },
  { label: 'Hypertension' },
  { label: 'Atrial Fibrillation' },
  { label: 'Coronary Artery Disease' },
  // Endocrinology / metabolic
  { label: 'Type 2 Diabetes' },
  { label: 'Type 1 Diabetes' },
  { label: 'Obesity' },
  { label: 'Thyroid Disorders', query: 'thyroid' },
  // Immunology / rheumatology
  { label: 'Rheumatoid Arthritis' },
  { label: 'Lupus' },
  { label: 'Psoriasis' },
  { label: 'Psoriatic Arthritis' },
  // Gastroenterology
  { label: "Crohn's Disease", query: 'crohn' },
  { label: 'Ulcerative Colitis' },
  // Respiratory
  { label: 'Asthma' },
  { label: 'COPD' },
  { label: 'Cystic Fibrosis' },
  // Other major areas
  { label: 'Chronic Kidney Disease' },
  { label: 'Depression' },
  { label: 'Schizophrenia' },
  { label: 'HIV' },
  { label: 'Hepatitis' },
  { label: 'COVID-19', query: 'covid' },
  { label: 'Macular Degeneration' },
  { label: 'Rare Diseases', query: 'rare disease' },
]

export function queryFor(area: DiseaseArea): string {
  return area.query ?? area.label.toLowerCase()
}

/** Resolve a raw IMPORT_DISEASES / admin selection into DiseaseAreas. An empty
 *  selection means "all". Unknown labels become ad-hoc areas (term = label),
 *  so brand-new categories work with zero code changes. */
export function resolveAreas(
  raw: string | string[] | undefined
): DiseaseArea[] {
  const list = (Array.isArray(raw) ? raw : (raw ?? '').split(','))
    .map((s) => s.trim())
    .filter(Boolean)
  if (list.length === 0) return DISEASE_AREAS
  const byLabel = new Map(DISEASE_AREAS.map((a) => [a.label.toLowerCase(), a]))
  return list.map((name) => byLabel.get(name.toLowerCase()) ?? { label: name })
}
