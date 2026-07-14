# Chunk 12 — End-to-end testing and polish

**Description:** Prove the whole non-AI app works together and tighten the rough
edges. Add an end-to-end pass over the golden path, verify the PWA and offline
behaviour, and confirm every deferred feature is clearly marked and gracefully
stubbed — without building any deferred feature.

## Exactly what to do

1. **End-to-end golden path** — with the backend seeded + running and the
   frontend pointed at it, walk (and where practical automate) the brief's demo
   path for the **non-AI** features:
   - Onboarding creates an identity (persisted via `POST /users`).
   - Discover: browse → search → filter → open a trial → save/un-save (persists
     across reload).
   - Belong: join a community → create a discussion → reply → edit/delete own
     posts (ownership enforced: another identity cannot edit/delete them).
   - Home shows matching trials + notifications from the API.
   Add at least one automated end-to-end style test (e.g. a backend Supertest
   flow that chains create-user → save-trial → join → post → reply, asserting
   persisted state), and/or a frontend integration test against a mocked client.
2. **Cross-cutting checks:**
   - Consistent error shape (`{ error }`) and status codes across endpoints.
   - CORS works from the frontend origin; `x-user-id` flows on every scoped call.
   - Empty/loading/error/offline states render correctly against real latency
     and real failures (stop the backend and confirm calm error + retry).
   - PWA still installs and opens offline showing cached saved trials, profile,
     and joined groups (service worker from the frontend build).
3. **Deferred-feature audit (verify, don't build):** confirm every AI surface
   still carries the informational-only framing and a `TODO: LLM API (seminar 6)`
   note; the grounded Q&A carries `TODO: RAG (later seminar)`; and there are
   `TODO: MCP (later seminar)`, `TODO: n8n workflow (later seminar)`,
   `TODO: autonomous agent (later seminar)` notes where those touch the app
   (e.g. the `POST /notifications` log target). None of these are implemented.
4. **Polish:** fix any shape mismatches found between frontend types and API
   responses; tidy copy, empty-state actions, focus/keyboard issues, and obvious
   responsive glitches; remove dead mock code that connect (chunk 11) obsoleted.
5. **Docs:** update root `CLAUDE.md`, `frontend/CLAUDE.md`, `backend/CLAUDE.md`
   so run/test instructions for the combined app are correct, and record what is
   done vs. deferred against the brief's acceptance checklist.

## Files this creates or changes

- New e2e/integration test(s) (backend flow test and/or frontend integration test)
- Small fixes across `frontend/` and `backend/` as needed
- `CLAUDE.md`, `frontend/CLAUDE.md`, `backend/CLAUDE.md` (final run/test + status)

## How to verify

- Backend and frontend: `npm run typecheck`, `npm run lint`, `npm test` all
  clean in both apps; the new e2e/flow test passes.
- Manual golden-path walk-through succeeds start to finish for the non-AI
  features; AI panels degrade gracefully and are clearly marked deferred.
- Stopping the backend shows calm inline errors, not crashes; offline PWA still
  shows cached data.

## Dependencies

- All previous chunks, especially chunk 11 (frontend connected).

## House rules

Follow the repo `CLAUDE.md`: test-driven; keep lint/format/type-check clean in
both apps; Conventional Commits (`test:`, `fix:`, `docs:`). Do **not** implement
any deferred (AI/RAG/MCP/n8n/agent) feature here. **Update all three CLAUDE.md
files.**

Commit and push.
