# API Feature 4 — Discussion post enhancement (optional)

> **Modality:** Text generation (OpenAI Chat Completions, Structured Outputs / JSON).
> Reuses the **LLM abstraction layer** (`backend/src/ai/llm.ts`) + env config from
> `api_feature_1.md` — never call the OpenAI SDK directly.
> Strong human-in-the-loop: the community must never depend on this call.

## Feature
In the **"Start a discussion" bottom sheet** (`ComposeSheet`, opened from a
community Board), an **"Enhance with AI"** button polishes the user's draft: it
suggests a **title**, a cleaned-up **improved draft** (same meaning, same
first-person voice, better grammar/readability), a short **summary**, and up to
four **tags**. The original and the suggestion are shown **side by side**; the
user chooses "Use suggestion" or "Keep mine", and can still **"Publish as-is"**.
Currently **mocked** (`frontend/src/mock/mockApi.ts` → `enhancePost`,
`TODO: LLM API`).

## Backend
- `POST /ai/enhance-post`  (require `x-user-id` via the existing `requireUser`
  guard — it's an authored-content action).
- Body (Zod): `{ message: string(trim,min1); title?: string; groupName: string(min1) }`.
  Empty `message` → 400.
- Call `llm.completeJSON<PostEnhancement>`:
  - **System prompt:** "You help a patient polish a community discussion post.
    Improve grammar, clarity, and readability WITHOUT changing the meaning, the
    facts, or the first-person voice, and without adding claims. Keep it warm and
    supportive. Produce: a concise `title` (use the user's title if given), an
    `improvedContent` draft, a one-sentence `summary`, and up to 4 short lowercase
    `tags` relevant to the message and the community. Do NOT give medical advice.
    Reply with JSON only matching the schema."
  - **User prompt:** the community name, the optional title, and the message.
  - `schema` = Zod `{ title: string; improvedContent: string; tags: string[](max 4); summary: string }`
    (matches the frontend `PostEnhancement` type).
  - Model = `OPENAI_MODEL`, `temperature` 0.5, `maxTokens` 500.
- On `LlmError` → 502 calm `{ error }`. Return 200 with the JSON. Mount on `/ai`.
- **Do not** write anything to the DB here — enhancement is a suggestion only.
  Publishing still goes through the existing `POST /discussions` endpoint,
  unchanged.

## Data
None.

## Frontend
- In `frontend/src/mock/mockApi.ts`, replace `enhancePost(draft)` body with
  `return apiClient.post<PostEnhancement>('/ai/enhance-post', draft)`
  (`draft` = `{ title?, message, groupName }`). Keep the signature; remove the
  `TODO: LLM API` note + mock helper.
- No component changes required: `components/ComposeSheet.tsx` already calls
  `api.enhancePost` via `useAiAction`, shows the "Enhance with AI" button
  (disabled offline / empty message), renders the side-by-side "Your version"
  vs "Suggested" with `DisclaimerNote`, and offers "Use suggestion" / "Keep mine"
  / "Publish". Verify the **"Publish as-is" path still works when the AI call
  fails** (the board never blocks on this feature).

## Tests
- `backend/src/routes/ai.enhancePost.test.ts` (Supertest, `vi.mock` the LLM):
  valid body → 200 with `{ title, improvedContent, tags, summary }` (tags ≤ 4);
  empty `message` → 400; missing `x-user-id` → 401; mocked `LlmError` → 502 calm
  message.
- End-to-end: open the compose sheet, type a draft, "Enhance with AI", confirm
  the side-by-side suggestion renders and can be accepted/edited; then confirm
  that with the AI forced to fail, **"Publish"** still creates the discussion.

## Done + commit
- `typecheck`/`lint`/`test`/`build` green in both apps.
- Manual: enhancement suggests title/tags/summary/improved draft with the
  original preserved; publishing works with and without the AI call.
- Update `backend/CLAUDE.md` endpoints list; drop the seminar-4 deferral note for
  this feature.

Commit and push.
