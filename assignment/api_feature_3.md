# API Feature 3 — Plain-language trial summary

> **Modality:** Text generation (OpenAI Chat Completions, Structured Outputs / JSON).
> Reuses the **LLM abstraction layer** (`backend/src/ai/llm.ts`) + env config from
> `api_feature_1.md` — never call the OpenAI SDK directly.
> Informational only — never medical advice; benefits phrased non-promissory.

## Feature
On the **Trial Detail** page, the **"Plain-language summary"** panel offers an
**"Explain simply"** action that produces a short, four-part overview of the
study: **what it's for**, **who it's for**, **possible benefits** (cautiously,
never promised), and **what's involved**. Rendered as a labelled list with the
informational-only note. Currently **mocked** (`frontend/src/mock/mockApi.ts` →
`summariseTrial`, `TODO: LLM API`).

## Backend
- `POST /ai/summary`
- Body (Zod): `{ trial_id: string }`. Missing/empty → 400.
- Load the trial via `getTrialById`. Missing → 404 `{ error: 'Trial not found' }`.
- Call `llm.completeJSON<TrialSummary>`:
  - **System prompt:** "You write short, calm, plain-language overviews of
    clinical trials for patients. Use only the provided study text; do not invent
    details. Be concise (1–2 sentences per field). Phrase benefits cautiously and
    NON-PROMISSORY (e.g. 'may', 'aims to') — never guarantee outcomes.
    Informational only, never medical advice. Reply with JSON only matching the
    schema."
  - **User prompt:** the trial title, disease, `full_description`, phase, status,
    and (if present) `intervention`.
  - `schema` = Zod `{ purpose: string; targetPatients: string; benefits: string; requirements: string }`
    (matches the frontend `TrialSummary` type).
  - Model = `OPENAI_MODEL`, `temperature` 0.4, `maxTokens` 600.
- On `LlmError` → 502 calm `{ error }`. Return 200 with the JSON. Mount on `/ai`.

## Data
None.

## Frontend
- In `frontend/src/mock/mockApi.ts`, replace `summariseTrial(trialId)` body with
  `return apiClient.post<TrialSummary>('/ai/summary', { trial_id: trialId })`.
  Keep the signature; remove the `TODO: LLM API` note + mock helper.
- No component changes: `pages/TrialDetail.tsx` renders the summary through
  `AiResultPanel` (owns the idle "Explain simply" button, the loading label, the
  calm error+retry, and the `DisclaimerNote`) via `useAiAction`. Verify it still
  renders the four `SummaryRow`s from `summary.data` and degrades gracefully.

## Tests
- `backend/src/routes/ai.summary.test.ts` (Supertest, `vi.mock` the LLM): valid
  `trial_id` → 200 with `{ purpose, targetPatients, benefits, requirements }`
  (all non-empty strings); unknown id → 404; mocked `LlmError` → 502 calm message.
- End-to-end: open a trial, tap "Explain simply", confirm the four-part summary
  renders from validated JSON with the disclaimer; an induced error shows the
  fallback and the rest of the page works.

## Done + commit
- `typecheck`/`lint`/`test`/`build` green in both apps.
- Manual: summary renders and degrades gracefully; disclaimer shown; benefits
  read cautiously (non-promissory).
- Update `backend/CLAUDE.md` endpoints list; drop the seminar-4 deferral note for
  this feature.

Commit and push.
