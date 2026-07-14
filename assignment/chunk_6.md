# Chunk 6 — Saved trials endpoints

**Description:** Let a user save and un-save trials to their profile. Identity-
scoped via `x-user-id`. Saving is idempotent (unique on `user_id + trial_id`),
matching the frontend's save toggle.

## Exactly what to do

1. Create `src/routes/saved.ts` (all require `x-user-id` via `requireUser`):
   - `GET /saved-trials` — returns the current user's saved trials as full
     `Trial[]` (join `saved_trials` → `trials`), newest first.
   - `POST /saved-trials` — body `{ trial_id }`. Validates the trial exists
     (else 400/404). Idempotent: saving an already-saved trial returns 200 with
     the existing record rather than erroring. 201 on first save.
   - `DELETE /saved-trials/:trialId` — un-saves; returns 204 (idempotent — 204
     even if it wasn't saved).
2. Mount in `src/app.ts`.
3. Reuse the chunk-3 serialise helper so returned trials are fully typed.

## Files this creates or changes

- `backend/src/routes/saved.ts`
- `backend/src/app.ts` (mount)
- Test: `backend/src/routes/saved.test.ts`
- `backend/CLAUDE.md` (document the saved-trials endpoints)

## How to verify

- Supertest (with an `x-user-id` header): save a trial (201) → list shows it →
  saving again is idempotent (no duplicate) → delete (204) → list is empty;
  saving an unknown trial → 400/404; any call without the header → 401.
- `npm run typecheck`, `npm run lint`, `npm test` clean.

## Dependencies

- Chunks 1, 3, 4 (identity), 5 (trials exist to save).

## House rules

Follow the repo `CLAUDE.md`: test-driven; lint/format/type-check clean;
Conventional Commits. **Update `backend/CLAUDE.md`** (saved-trials endpoints).

Commit and push.
