# Chunk 11 — Connect the frontend to the backend

**Description:** Replace the frontend's mock data with real API calls at the
`TODO: connect to API` markers. Introduce a small API client that sends the
`x-user-id` header, point the reads and mutations at the backend, and **keep all
AI features mocked** (they belong to later seminars). After this, the app runs
end-to-end against the real server with the mock data source retired for
non-AI features.

## Prerequisites to run both apps

- Backend: `cd backend && npm run seed && npm run dev` (serves on `:3001`).
- Frontend: set `VITE_API_URL=http://localhost:3001` in `frontend/.env`
  (add `VITE_API_URL=` to a new `frontend/.env.example`), then `npm run dev`.
- Backend CORS already allows `http://localhost:5173` (chunk 1).

## Exactly what to do

1. **API client** — create `frontend/src/lib/apiClient.ts`: a typed `fetch`
   wrapper using `import.meta.env.VITE_API_URL`, JSON in/out, attaches
   `x-user-id` from the stored identity on every request, and throws on non-2xx
   so existing `useAsync` / `useAiAction` error states keep working.
2. **Reads** — in `frontend/src/mock/mockApi.ts`, replace the bodies of the
   real-data functions with client calls (keep the same signatures/return types
   so screens don't change):
   - `getTrials({query, disease})` → `GET /trials?query=&disease=`
   - `getTrial(id)` → `GET /trials/:id`
   - `getGroups()` → `GET /groups`
   - `getNotifications()` → `GET /notifications`
3. **Mutations** — move the store's client-only actions
   (`frontend/src/store/store.tsx`) onto the backend, at their existing
   `TODO: connect to API` markers, keeping the optimistic UX where sensible:
   - `toggleSave` → `POST /saved-trials` / `DELETE /saved-trials/:trialId`;
     saved list hydrated from `GET /saved-trials`.
   - `toggleJoin` → `POST /memberships` / `DELETE /memberships/:groupId`;
     joined list from `GET /memberships`.
   - `addDiscussion` / `updateDiscussion` / `deleteDiscussion` → `POST/PATCH/
     DELETE /discussions…`; board lists from `GET /groups/:id/discussions`.
   - `addReply` / `deleteReply` → `POST /discussions/:id/replies` /
     `DELETE /replies/:id`; thread from `GET /discussions/:id/replies`.
   - On first run, `POST /users` to persist the onboarding identity (and PATCH on
     profile edits) so `author_name` resolves server-side.
   - Decide and document whether community content still needs local seeding now
     that the backend seeds it (it should now come from the API).
4. **Keep mocked — do NOT wire to the backend:**
   - `summariseTrial`, `explainCriteria`, `selfCheck`, `enhancePost` →
     leave the mock implementation and add/keep a `TODO: LLM API (seminar 6)`.
   - `askTrial` (grounded Q&A) → leave mocked with `TODO: RAG (later seminar)`
     and `TODO: LLM API (seminar 6)`.
   - The offline/`FAILTEST` behaviours can stay for the AI panels.
5. Ensure loading, empty, error, and offline states still behave (they were
   built against these shapes; real latency/errors now exercise them for real).

## Files this creates or changes

- `frontend/src/lib/apiClient.ts` (new)
- `frontend/src/mock/mockApi.ts` (reads → real calls; AI stays mocked)
- `frontend/src/store/store.tsx` (mutations → real calls)
- `frontend/.env.example` (new, `VITE_API_URL=`), `frontend/.gitignore` (ensure `.env` ignored)
- Any screen/store tests that assumed local-only state (update/mocking as needed)
- `frontend/CLAUDE.md` and root `CLAUDE.md` (note the frontend now calls the API; AI features remain mocked pending seminar 6)

## How to verify

- With backend seeded and running + `VITE_API_URL` set: browse/search/filter
  trials, open a detail page, save/un-save (persists across reload via the API),
  join/leave a community, create a discussion, reply, and edit/delete your own —
  all backed by the server (confirm rows change via `curl` or the DB).
- AI panels still render via the mock and show the informational-only framing.
- Frontend `npm run typecheck`, `npm run lint`, `npm test` clean; backend tests
  still green.

## Dependencies

- All backend endpoint chunks (1, 3, 4, 5, 6, 7, 8, 9, 10).

## House rules

Follow the repo `CLAUDE.md`: test-driven where practical (keep the pure logic
tests; adjust store/screen tests to the API layer); lint/format/type-check clean;
Conventional Commits. Never commit `.env`. **Update the relevant `CLAUDE.md`.**

Commit and push.
