# API Feature 1 — Eligibility self-check (core) + LLM abstraction layer

> **Modality:** Text generation (OpenAI Chat Completions, Structured Outputs / JSON).
> This is the **core** smart feature and is built first, so it also establishes
> the shared **LLM abstraction layer** and its env config that features 2–5 reuse.
> Every AI surface is **informational only — never medical advice.**

## Feature
From the user's point of view: on the **AI Assistant** tab (eligibility segment)
— and via **"Check my eligibility"** on a Trial Detail page — the user picks a
trial and answers four short questions (age, gender, diagnosed condition, and
optional current treatment). The app returns an informational **Likely /
Possibly / Unlikely** estimate with a headline, the criteria that appear to
match, the gaps still to confirm, and an informational-only note. It never
decides eligibility; investigators do. It is currently **mocked** on the client
(`frontend/src/mock/mockApi.ts` → `selfCheck`, marked `TODO: LLM API`).

## Backend

### 0. Shared prerequisite — LLM abstraction layer (build once, reused by all)
Create `backend/src/ai/llm.ts`. This is the **only** file allowed to import the
OpenAI SDK; all feature routes go through it and never touch the SDK directly.

- Install `openai`.
- Extend `backend/src/config.ts` (keep the existing empty-string→default Zod
  pattern) with:
  - `OPENAI_API_KEY` (string, default `''`; when empty the AI endpoints return the
    calm fallback instead of crashing).
  - `OPENAI_BASE_URL` (default `https://api.openai.com/v1`).
  - `OPENAI_MODEL` (default `gpt-4o-mini` — a fast, low-cost text model; swap via
    env to a newer text model if desired).
  - `OPENAI_TEMPERATURE` (coerce number, default `0.2` — careful, low-variance).
  - `OPENAI_MAX_TOKENS` (coerce int, default `800`).
  - `OPENAI_EMBEDDING_MODEL` (default `text-embedding-3-small`) — used by feature 5.
- Add the same keys (blank) to `backend/.env.example` and root `.env.example`.
- Public surface:
  ```ts
  export class LlmError extends Error {}            // thrown on final failure
  export interface LlmClient {
    // Structured JSON via Chat Completions Structured Outputs, Zod-validated.
    completeJSON<T>(opts: {
      system: string
      user: string
      schema: import('zod').ZodType<T>   // Zod schema → JSON schema for the request
      schemaName: string
      temperature?: number               // default OPENAI_TEMPERATURE
      maxTokens?: number                 // default OPENAI_MAX_TOKENS
    }): Promise<T>
    complete(opts: { system: string; user: string; temperature?: number; maxTokens?: number }): Promise<string>
    // embed(texts: string[]): Promise<number[][]>  // added in feature 5 (do not add yet)
  }
  export function createLlmClient(deps?: { apiKey?: string; fetchImpl?: typeof fetch }): LlmClient
  export const llm: LlmClient   // singleton used by routes
  ```
- `completeJSON` behaviour:
  - Calls `POST {OPENAI_BASE_URL}/chat/completions` (via the SDK) with
    `model`, `temperature`, `max_tokens`, `messages` (`system`, `user`), and
    `response_format: { type: 'json_schema', json_schema: { name: schemaName, schema: <zod-to-json-schema>, strict: true } }`.
    (Use a tiny zod→JSON-schema conversion or hand-write the JSON schema next to
    the Zod schema; either is fine as long as the request enforces the shape.)
  - Parse the returned content, then **validate with the Zod `schema`**.
  - **Retry once** on: transient HTTP error (timeout/5xx/429) OR JSON
    parse/validation failure. On the second failure throw `LlmError`.
  - If `OPENAI_API_KEY` is empty, throw `LlmError('OPENAI_API_KEY not configured')`
    immediately (no network call).
- Add a shared route helper (e.g. in `backend/src/lib/aiResponse.ts` or inline):
  catch `LlmError` in every AI route and respond **502** with
  `{ error: "The assistant couldn't complete this right now. Please try again in a moment." }`.
  Input-validation failures stay **400** `{ error, details }` via the existing
  `validateBody`.

### This feature's endpoint
- `POST /ai/eligibility-check`
- Body (Zod): `{ trial_id: string; age: number(int,1..129); gender: 'female'|'male'|'other'|'prefer not to say'; condition: string(trim,min1); treatment?: string }`.
  Age, gender, condition required → 400 otherwise. (`x-user-id` may be sent but
  is not required; the result is advisory and **not stored**.)
- Load the trial via the existing DB layer (`getTrialById` in `backend/src/db/trials.js`).
  If missing → **404** `{ error: 'Trial not found' }`.
- Call `llm.completeJSON<EligibilityResult>` with:
  - **System prompt:** "You are ClinicalMatch's eligibility assistant. You compare
    a patient's self-reported details against a clinical trial's inclusion and
    exclusion criteria and return an INFORMATIONAL estimate only — never medical
    advice, never a decision; final eligibility is decided by the trial
    investigators. Reply with JSON only, matching the schema. Rules: base the
    verdict ONLY on the provided criteria and answers; if key information is
    missing or ambiguous, default to `possibly` — never guess `likely` or
    `unlikely` without support. `matches` = criteria the person appears to meet;
    `gaps` = things still to confirm with the study team. Keep language plain,
    calm, and non-alarming. Always set `note` to the informational-only
    disclaimer."
  - **User prompt:** the trial title, inclusion_criteria and exclusion_criteria
    (joined), and the user's age/gender/condition/treatment.
  - `schema` = Zod for `EligibilityResult`:
    `{ verdict: 'likely'|'possibly'|'unlikely', headline: string, matches: string[], gaps: string[], note: string }`.
  - `temperature` 0.2, `maxTokens` 700.
- Response shape must exactly match the frontend `EligibilityResult` type
  (`frontend/src/types.ts`). Return `200` with the JSON.
- Mount the router in `backend/src/app.ts` (above the 404 handler).

## Data
None. (No table changes; the result is not persisted.)

## Frontend
- In `frontend/src/mock/mockApi.ts` replace the body of `selfCheck(input)` with:
  `return apiClient.post<EligibilityResult>('/ai/eligibility-check', input)`.
  Keep the exported signature/return type identical so the UI is untouched.
  Remove the `TODO: LLM API` note and the `maybeFail`/mock logic for this fn
  (keep the `FAILTEST` escape hatch only if trivial; otherwise drop it here).
- No component changes required: `pages/Assistant.tsx` (SelfCheck) and the
  "Check my eligibility" flow already call `api.selfCheck` via `useAiAction`
  (retry-once-then-fallback) and render the `ConfidenceMeter` +
  `DisclaimerNote`. Verify the **"unlikely" verdict stays neutral grey**
  (`--color-verdict-unlikely`), never red, and the disclaimer shows.
- Loading = the existing spinner label ("Checking protocol…"); error = the calm
  inline fallback from `useAiAction`; offline = the existing "Unavailable
  offline" guard.

## Tests
- `backend/src/ai/llm.test.ts`: unit-test `completeJSON` with an injected fake
  `fetchImpl` — asserts it (a) validates good JSON, (b) retries once then throws
  `LlmError` on repeated malformed output, (c) throws immediately when the API
  key is empty.
- `backend/src/routes/ai.eligibility.test.ts` (Supertest): **mock the LLM** — use
  `vi.mock('../ai/llm.js')` so `llm.completeJSON` resolves to a fixed
  `EligibilityResult`. Assert: valid body → 200 with the verdict; missing
  required field → 400; unknown `trial_id` → 404; when the mocked `completeJSON`
  rejects with `LlmError` → 502 with the calm `{ error }`.
- End-to-end check: with a real (or fake) key, run the app + frontend, open a
  trial, "Check my eligibility", confirm a validated Likely/Possibly/Unlikely
  result renders with the disclaimer and that an AI failure degrades only that
  panel (browsing/community still work).

## Done + commit
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` green in
  `backend/` and `frontend/`.
- Manual: self-check returns a validated result; forcing an LLM error shows the
  calm fallback; "unlikely" is grey, never red; the disclaimer appears.
- Update `backend/CLAUDE.md` (new `src/ai/` layer, env vars, the `/ai/*` route
  convention) and remove the seminar-4 deferral note for this feature.

Commit and push.
