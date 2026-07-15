# API Feature 2 — Plain-language eligibility criteria

> **Modality:** Text generation (OpenAI Chat Completions, Structured Outputs / JSON).
> Reuses the **LLM abstraction layer** (`backend/src/ai/llm.ts`) and env config
> added in `api_feature_1.md` — never call the OpenAI SDK directly.
> Informational only — never medical advice.

## Feature
On the **Trial Detail** page, the "Who can take part" card has an **"Explain in
plain language"** action. Tapping it rewrites the trial's dense inclusion/
exclusion criteria into two clear, non-technical lists — **"You may be able to
join if…"** and **"This may rule you out…"** — shown in place of (or alongside)
the raw criteria, with the informational-only note. Currently **mocked** on the
client (`frontend/src/mock/mockApi.ts` → `explainCriteria`, `TODO: LLM API`).

## Backend
- `POST /ai/plain-criteria`
- Body (Zod): `{ trial_id: string }`. Missing/empty → 400.
- Load the trial via `getTrialById`. Missing → 404 `{ error: 'Trial not found' }`.
  If both criteria arrays are empty, return `{ canJoin: [], cannotJoin: [] }`
  without an LLM call (the UI hides an empty section).
- Call `llm.completeJSON<PlainCriteria>`:
  - **System prompt:** "You rewrite clinical-trial eligibility criteria into
    plain, everyday language for patients. Do not add, remove, or infer criteria
    — only rephrase what is given. Keep each item short and concrete; avoid
    jargon (expand abbreviations like BMI). Informational only, never medical
    advice. Reply with JSON only matching the schema: `canJoin` = plain-language
    versions of the inclusion criteria; `cannotJoin` = plain-language versions of
    the exclusion criteria. Preserve list order and count where reasonable."
  - **User prompt:** the trial's `inclusion_criteria` and `exclusion_criteria`
    (as given), plus the disease for context.
  - `schema` = Zod `{ canJoin: string[], cannotJoin: string[] }` (matches the
    frontend `PlainCriteria` type).
  - Model = `OPENAI_MODEL`, `temperature` 0.3, `maxTokens` 700 (from env/opts).
- On `LlmError` → 502 with the calm `{ error }` (shared helper from feature 1).
- Return 200 with the JSON. Mount on the `/ai` router.

## Data
None.

## Frontend
- In `frontend/src/mock/mockApi.ts`, replace `explainCriteria(trialId)` body with
  `return apiClient.post<PlainCriteria>('/ai/plain-criteria', { trial_id: trialId })`.
  Keep the signature/return type; remove the `TODO: LLM API` note + mock helper.
- No component changes needed: `pages/TrialDetail.tsx` already calls
  `api.explainCriteria` via `useAiAction` and swaps the raw criteria for the
  plain-language lists when `criteria.data` exists, with a `DisclaimerNote`, a
  retry link on error, and an offline guard. Verify those still render.

## Tests
- `backend/src/routes/ai.plainCriteria.test.ts` (Supertest, `vi.mock` the LLM):
  valid `trial_id` → 200 with `{ canJoin, cannotJoin }` arrays; unknown id →
  404; a trial with no criteria → 200 `{ canJoin: [], cannotJoin: [] }` and the
  LLM is **not** called; mocked `LlmError` → 502 with the calm message.
- End-to-end: open a trial, tap "Explain in plain language", confirm the lists
  render from validated JSON with the disclaimer, and an induced LLM error shows
  the fallback while the rest of the page keeps working.

## Done + commit
- `typecheck`/`lint`/`test`/`build` green in both apps.
- Manual: plain-language criteria render and degrade gracefully; disclaimer shown.
- Update `backend/CLAUDE.md` endpoints list; drop the seminar-4 deferral note for
  this feature.

Commit and push.
