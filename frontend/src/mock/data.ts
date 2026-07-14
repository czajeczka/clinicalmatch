import type { Trial } from '@/types'

// The trial catalogue is now served by the backend (see src/lib/apiClient.ts).
// This local copy remains ONLY to back the still-mocked AI features
// (TODO: LLM API (seminar 6)) in mockApi.ts, which read a trial's text by id.
// The ids match the backend seed, so the mocks line up with real data.
export const MOCK_TRIALS: Trial[] = [
  {
    id: 't-001',
    title: 'Oral GLP-1 Agonist for Early Type 2 Diabetes (VERANDA)',
    disease: 'Type 2 Diabetes',
    phase: 'Phase 3',
    city: 'Warsaw',
    country: 'Poland',
    status: 'recruiting',
    short_description:
      'Testing a once-daily oral medication to improve blood sugar control in adults recently diagnosed with Type 2 Diabetes.',
    full_description:
      'VERANDA is a 12-month study evaluating whether a new once-daily oral GLP-1 receptor agonist improves long-term blood sugar control (HbA1c) compared with standard care in adults diagnosed with Type 2 Diabetes within the last three years. Participants attend the study centre every eight weeks for blood tests and a check-up.',
    inclusion_criteria: [
      'Adults aged 18–70 years',
      'Diagnosed with Type 2 Diabetes within the past 3 years',
      'HbA1c between 7.0% and 10.0%',
      'Body mass index (BMI) of 25 or above',
    ],
    exclusion_criteria: [
      'Type 1 Diabetes',
      'Current use of insulin',
      'History of pancreatitis',
      'Pregnant or breastfeeding',
    ],
    centers: [
      {
        name: 'Warsaw Metabolic Research Centre',
        city: 'Warsaw',
        country: 'Poland',
      },
      { name: 'Kraków Diabetes Institute', city: 'Kraków', country: 'Poland' },
    ],
    contact_name: 'Dr Anna Kowalczyk',
    contact_email: 'veranda@example-trials.eu',
    contact_phone: '+48 22 555 0142',
  },
  {
    id: 't-002',
    title: 'Digital Coaching + Metformin in Type 2 Diabetes (STRIDE)',
    disease: 'Type 2 Diabetes',
    phase: 'Phase 2',
    city: 'Berlin',
    country: 'Germany',
    status: 'recruiting',
    short_description:
      'A smartphone coaching programme alongside standard metformin, to see whether daily support improves outcomes.',
    full_description:
      'STRIDE compares standard metformin treatment with the same treatment plus a structured 6-month digital coaching programme delivered through a smartphone app. The study measures changes in blood sugar, weight, and self-reported wellbeing.',
    inclusion_criteria: [
      'Adults aged 21–65 years',
      'Established Type 2 Diabetes on metformin',
      'Owns a smartphone and is comfortable using apps',
    ],
    exclusion_criteria: [
      'Currently using another continuous glucose monitoring study device',
      'Severe diabetic complications',
    ],
    centers: [
      { name: 'Charité Study Unit', city: 'Berlin', country: 'Germany' },
    ],
    contact_name: 'Dr Markus Vogel',
    contact_email: 'stride@example-trials.eu',
    contact_phone: '+49 30 555 0198',
  },
  {
    id: 't-003',
    title: 'Neoadjuvant Immunotherapy in HER2+ Breast Cancer (AURORA-B)',
    disease: 'Breast Cancer',
    phase: 'Phase 2',
    city: 'Milan',
    country: 'Italy',
    status: 'recruiting',
    short_description:
      'Adding an immunotherapy drug before surgery for HER2-positive early breast cancer.',
    full_description:
      'AURORA-B studies whether adding an investigational immunotherapy to standard chemotherapy before surgery increases the chance of a complete response in people with HER2-positive early-stage breast cancer. Treatment lasts about 5 months and is followed by surgery and routine follow-up.',
    inclusion_criteria: [
      'Women aged 18 or older',
      'Newly diagnosed HER2-positive breast cancer',
      'Tumour has not spread to distant organs (stage I–III)',
      'Able to undergo surgery',
    ],
    exclusion_criteria: [
      'Previous chemotherapy for this cancer',
      'Active autoimmune disease requiring treatment',
      'Known allergy to the study drug class',
    ],
    centers: [
      { name: 'Istituto Oncologico Milano', city: 'Milan', country: 'Italy' },
      { name: 'Bologna Cancer Centre', city: 'Bologna', country: 'Italy' },
    ],
    contact_name: 'Dr Giulia Ferrari',
    contact_email: 'aurora@example-trials.eu',
    contact_phone: '+39 02 555 0176',
  },
  {
    id: 't-004',
    title: 'Exercise Programme During Breast Cancer Chemotherapy (MOVE-ON)',
    disease: 'Breast Cancer',
    phase: 'Phase 3',
    city: 'Barcelona',
    country: 'Spain',
    status: 'not yet recruiting',
    short_description:
      'A supervised exercise programme to reduce fatigue during chemotherapy.',
    full_description:
      'MOVE-ON evaluates whether a 12-week supervised exercise programme reduces treatment-related fatigue and improves quality of life for people receiving chemotherapy for breast cancer. Sessions run twice weekly at the study centre.',
    inclusion_criteria: [
      'Adults aged 18 or older',
      'Scheduled to begin chemotherapy for breast cancer',
      'Able to take part in light-to-moderate exercise',
    ],
    exclusion_criteria: [
      'Heart condition that makes exercise unsafe',
      'Unstable bone metastases',
    ],
    centers: [
      {
        name: 'Hospital Clínic Barcelona',
        city: 'Barcelona',
        country: 'Spain',
      },
    ],
    contact_name: 'Dr Marta Serrano',
    contact_email: 'moveon@example-trials.eu',
    contact_phone: '+34 93 555 0121',
  },
  {
    id: 't-005',
    title: 'JAK Inhibitor for Moderate Rheumatoid Arthritis (CLARITY-RA)',
    disease: 'Rheumatoid Arthritis',
    phase: 'Phase 3',
    city: 'Lyon',
    country: 'France',
    status: 'recruiting',
    short_description:
      'An oral JAK inhibitor for adults whose rheumatoid arthritis is not well controlled on methotrexate.',
    full_description:
      'CLARITY-RA tests whether adding an oral JAK inhibitor to methotrexate reduces joint pain and swelling in adults with moderate rheumatoid arthritis that remains active despite methotrexate. The study lasts 6 months with monthly visits.',
    inclusion_criteria: [
      'Adults aged 18–75 years',
      'Diagnosed with rheumatoid arthritis for at least 6 months',
      'Currently taking methotrexate',
      'At least 4 tender and 4 swollen joints',
    ],
    exclusion_criteria: [
      'Active or recent serious infection',
      'History of blood clots',
      'Previous treatment with a JAK inhibitor',
    ],
    centers: [
      { name: 'Lyon Rheumatology Centre', city: 'Lyon', country: 'France' },
    ],
    contact_name: 'Dr Camille Laurent',
    contact_email: 'clarity@example-trials.eu',
    contact_phone: '+33 4 555 0188',
  },
  {
    id: 't-006',
    title: 'Tapering Steroids in Early Rheumatoid Arthritis (EASE-RA)',
    disease: 'Rheumatoid Arthritis',
    phase: 'Phase 2',
    city: 'Vienna',
    country: 'Austria',
    status: 'recruiting',
    short_description:
      'Comparing two ways of reducing steroid use early in rheumatoid arthritis treatment.',
    full_description:
      'EASE-RA compares a fast versus a gradual steroid-tapering schedule in people newly starting treatment for rheumatoid arthritis, to find the approach that best controls symptoms while minimising steroid side effects.',
    inclusion_criteria: [
      'Adults aged 18 or older',
      'Rheumatoid arthritis diagnosed within the last 12 months',
      'Currently taking low-dose steroids',
    ],
    exclusion_criteria: ['Diabetes requiring insulin', 'Severe osteoporosis'],
    centers: [
      { name: 'Vienna General Hospital', city: 'Vienna', country: 'Austria' },
    ],
    contact_name: 'Dr Lukas Bauer',
    contact_email: 'ease@example-trials.eu',
    contact_phone: '+43 1 555 0133',
  },
  {
    id: 't-007',
    title: 'Anti-Inflammatory Biologic for Crohn’s Disease (SUMMIT-CD)',
    disease: "Crohn's Disease",
    phase: 'Phase 3',
    city: 'Amsterdam',
    country: 'Netherlands',
    status: 'recruiting',
    short_description:
      'A new biologic injection for adults with moderate-to-severe Crohn’s disease.',
    full_description:
      'SUMMIT-CD evaluates a new biologic therapy that targets inflammation in the gut for adults with moderate-to-severe Crohn’s disease who have not responded well to conventional treatment. The study runs for 52 weeks.',
    inclusion_criteria: [
      'Adults aged 18–70 years',
      'Confirmed diagnosis of Crohn’s disease',
      'Moderate-to-severe disease activity',
      'Inadequate response to conventional therapy',
    ],
    exclusion_criteria: [
      'Current abdominal abscess',
      'Recent bowel surgery within 3 months',
      'Active tuberculosis',
    ],
    centers: [
      {
        name: 'Amsterdam Gut Health Centre',
        city: 'Amsterdam',
        country: 'Netherlands',
      },
    ],
    contact_name: 'Dr Sanne de Vries',
    contact_email: 'summit@example-trials.eu',
    contact_phone: '+31 20 555 0155',
  },
  {
    id: 't-008',
    title: 'Diet and the Gut Microbiome in Crohn’s Disease (NOURISH)',
    disease: "Crohn's Disease",
    phase: 'Phase 2',
    city: 'Copenhagen',
    country: 'Denmark',
    status: 'completed',
    short_description:
      'Studying whether a specialised diet helps maintain remission in Crohn’s disease.',
    full_description:
      'NOURISH investigated whether a specialised, dietitian-guided nutrition plan helps people with Crohn’s disease stay in remission for longer. Recruitment is closed and results are being analysed.',
    inclusion_criteria: [
      'Adults aged 18 or older',
      'Crohn’s disease currently in remission',
    ],
    exclusion_criteria: ['Requires a feeding tube', 'Severe food allergies'],
    centers: [
      { name: 'Copenhagen IBD Unit', city: 'Copenhagen', country: 'Denmark' },
    ],
    contact_name: 'Dr Freja Nielsen',
    contact_email: 'nourish@example-trials.eu',
    contact_phone: '+45 33 555 0100',
  },
  {
    id: 't-009',
    title: 'Remyelination Therapy in Relapsing MS (RENEW-MS)',
    disease: 'Multiple Sclerosis',
    phase: 'Phase 2',
    city: 'Stockholm',
    country: 'Sweden',
    status: 'recruiting',
    short_description:
      'An investigational therapy aiming to repair nerve insulation in relapsing multiple sclerosis.',
    full_description:
      'RENEW-MS tests whether an investigational therapy can help repair the protective coating around nerves (myelin) in adults with relapsing-remitting multiple sclerosis, potentially improving nerve function. The study lasts 18 months.',
    inclusion_criteria: [
      'Adults aged 18–55 years',
      'Relapsing-remitting multiple sclerosis',
      'At least one relapse in the past 2 years',
      'Able to walk with or without aid',
    ],
    exclusion_criteria: [
      'Primary progressive MS',
      'Other significant neurological disease',
      'Pregnant or planning pregnancy',
    ],
    centers: [
      {
        name: 'Karolinska Neurology Centre',
        city: 'Stockholm',
        country: 'Sweden',
      },
    ],
    contact_name: 'Dr Erik Lindqvist',
    contact_email: 'renew@example-trials.eu',
    contact_phone: '+46 8 555 0177',
  },
  {
    id: 't-010',
    title: 'Fatigue Management Programme in MS (ENERGISE)',
    disease: 'Multiple Sclerosis',
    phase: 'Phase 3',
    city: 'Dublin',
    country: 'Ireland',
    status: 'recruiting',
    short_description:
      'A structured programme to help manage one of the most common MS symptoms: fatigue.',
    full_description:
      'ENERGISE evaluates a structured, therapist-led programme combining energy-management techniques and gentle activity to reduce fatigue in people living with multiple sclerosis. The programme runs over 8 weeks.',
    inclusion_criteria: [
      'Adults aged 18 or older',
      'Diagnosis of multiple sclerosis',
      'Reports significant fatigue',
    ],
    exclusion_criteria: [
      'Another medical condition that fully explains the fatigue',
      'Currently in another fatigue-focused programme',
    ],
    centers: [{ name: 'Dublin MS Centre', city: 'Dublin', country: 'Ireland' }],
    contact_name: 'Dr Aoife Murphy',
    contact_email: 'energise@example-trials.eu',
    contact_phone: '+353 1 555 0166',
  },
]
