# API Feature 5 — "Ask about this trial" (grounded RAG)

> **Modality:** Embeddings **+** Text generation.
> **Embeddings** (`text-embedding-3-small`) index and retrieve the trial's
> protocol text; **Chat Completions** (Structured Outputs / JSON) answers the
> question grounded in the retrieved passages.
> This feature **extends the LLM abstraction layer** from `api_feature_1.md` with
> a new `embed` method — the first new modality. Still, only `backend/src/ai/llm.ts`
> touches the OpenAI SDK. Informational only — never medical advice.

## Feature
On the **Trial Detail** page, an **"Ask about this trial"** box lets the user type
a free-text question ("Do I need to stop my current medication?", "How long is the
study?"). The app answers **only from that trial's protocol text**, returns the
**answer**, the **section it was drawn from** (a citation), and the
informational-only note. If the protocol doesn't cover the question, it says so
rather than guessing. Currently **mocked** (`frontend/src/mock/mockApi.ts` →
`askTrial`, `TODO: RAG (later seminar)`).

## Backend

### Extend the abstraction layer (new modality)
In `backend/src/ai/llm.ts`, add to the `LlmClient` interface and implementation:
```ts
embed(texts: string[]): Promise<number[][]>   // OPENAI_EMBEDDING_MODEL
```
- Calls `POST {OPENAI_BASE_URL}/embeddings` with `model: OPENAI_EMBEDDING_MODEL`
  and `input: texts`; returns one vector per input, order preserved.
- Same failure policy as `completeJSON`: retry once on transient/network error,
  then throw `LlmError`; throw immediately if `OPENAI_API_KEY` is empty.

### Retrieval store
Create `backend/src/rag/vectorStore.ts` — a small SQLite-backed store over the new
`protocol_chunks` table (below). Helpers:
- `indexTrial(trialId)`: if the trial has no chunks yet, split its protocol text
  (`full_description` + `inclusion_criteria` + `exclusion_criteria`, each tagged
  with a `section` label) into ~500-char chunks, `llm.embed()` them, and store the
  vectors (as JSON/BLOB). Idempotent.
- `search(trialId, queryVector, k=4)`: cosine similarity in JS over that trial's
  chunks; return the top-k `{ section, text, score }`.

### Endpoint
- `POST /ai/ask`
- Body (Zod): `{ trial_id: string; question: string(trim, min3, max500) }`.
  Invalid → 400.
- Load the trial (`getTrialById`); missing → 404 `{ error: 'Trial not found' }`.
- `await indexTrial(trial_id)`; embed the question via `llm.embed([question])`;
  `search()` for the top passages. If the trial has no protocol text at all,
  short-circuit to a grounded "not enough information" answer (no chat call).
- Call `llm.completeJSON<TrialAnswer>`:
  - **System prompt:** "Answer the patient's question about this clinical trial
    using ONLY the protocol passages provided. If the passages don't contain the
    answer, say so plainly and suggest asking the study team — do NOT use outside
    knowledge or guess. Keep it short and calm. Set `citedSection` to the section
    label of the passage you relied on (or empty if none). Informational only,
    never medical advice. Reply with JSON only matching the schema."
  - **User prompt:** the question + the retrieved passages (each prefixed with its
    `section` label).
  - `schema` = Zod `{ answer: string; citedSection: string; note: string }`
    (matches the frontend `TrialAnswer` type).
  - `temperature` 0.2, `maxTokens` 500.
- On `LlmError` (embed or chat) → 502 calm `{ error }`. Return 200 with the JSON.
  Mount on `/ai`.

## Data
- **New table `protocol_chunks`** (migration in `backend/src/db/schema`):
  `id TEXT PK`, `trial_id TEXT NOT NULL REFERENCES trials(id) ON DELETE CASCADE`,
  `section TEXT NOT NULL`, `text TEXT NOT NULL`, `embedding TEXT NOT NULL`
  (JSON-encoded float array). Index on `trial_id`.
- Populated lazily on first question per trial (`indexTrial`), so no seed step is
  required; re-embedding on protocol change is a documented follow-up.

## Frontend
- In `frontend/src/mock/mockApi.ts`, replace `askTrial({ trialId, question })`
  body with
  `return apiClient.post<TrialAnswer>('/ai/ask', { trial_id: trialId, question })`.
  Keep the signature; remove the `TODO: RAG (later seminar)` note + mock helper.
- No component changes: `pages/TrialDetail.tsx` already renders the "Ask about
  this trial" box (input + submit) via `useAiAction`, showing the answer, the
  `citedSection` chip, a `DisclaimerNote`, the calm error+retry, and the offline
  guard. Verify the citation renders and that an empty answer still shows the note.

## Tests
- `backend/src/ai/llm.embed.test.ts`: `embed` with an injected fake `fetchImpl` —
  returns one vector per input in order; retries once then throws `LlmError`;
  throws immediately with an empty key.
- `backend/src/rag/vectorStore.test.ts`: `indexTrial` chunks + stores (mock
  `llm.embed`); `search` ranks the most-similar chunk first; `indexTrial` is
  idempotent (no duplicate chunks on a second call).
- `backend/src/routes/ai.ask.test.ts` (Supertest, `vi.mock` the LLM): valid
  question → 200 `{ answer, citedSection, note }`; too-short question → 400;
  unknown `trial_id` → 404; mocked `LlmError` → 502 calm message.
- End-to-end: open a trial, ask a question answerable from the protocol → grounded
  answer + cited section + disclaimer; ask an unanswerable one → "not enough
  information" answer; force an error → calm fallback, rest of page still works.

## Done + commit
- `typecheck`/`lint`/`test`/`build` green in both apps.
- Manual: grounded answers cite a section; out-of-scope questions are declined,
  not guessed; disclaimer shown; degrades gracefully.
- Update `backend/CLAUDE.md` (new `src/rag/` layer + `protocol_chunks` table +
  `embed` on the abstraction + `/ai/ask`); drop the RAG deferral note where it
  touches the app.

Commit and push.
