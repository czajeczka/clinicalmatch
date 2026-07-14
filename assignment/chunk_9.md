# Chunk 9 — Replies endpoints

**Description:** List and post replies within a discussion, and delete your own.
Keeps each discussion's `reply_count` accurate. Response shapes match the
frontend `Reply` type (including `author_name`).

## Exactly what to do

1. Create `src/routes/replies.ts`:
   - `GET /discussions/:discussionId/replies` — public; returns `Reply[]`
     oldest-first for the discussion (404 if the discussion doesn't exist).
   - `POST /discussions/:discussionId/replies` — require `x-user-id`; body
     `{ content }` (non-empty). Stores `author_id = req.userId` and
     `author_name` from the user's `display_name`. Increment the discussion's
     `reply_count` (or ensure the computed count reflects it). 201 with the
     created reply.
   - `DELETE /replies/:id` — require `x-user-id`; only the author may delete
     (**403** otherwise, **404** if missing); decrement `reply_count`. 204.
2. Keep the `reply_count` strategy consistent with chunk 8 (computed vs.
   maintained-on-write).
3. Mount in `src/app.ts`.

## Files this creates or changes

- `backend/src/routes/replies.ts`
- `backend/src/app.ts` (mount)
- Test: `backend/src/routes/replies.test.ts`
- `backend/CLAUDE.md` (document endpoints + ownership rules)

## How to verify

- Supertest: list seeded replies (oldest-first); post a reply (201) → the parent
  discussion's `reply_count` increases → delete own reply (204) → count
  decreases; deleting another user's reply → **403**; empty content → 400;
  unknown discussion → 404; write calls without header → 401.
- `npm run typecheck`, `npm run lint`, `npm test` clean.

## Dependencies

- Chunks 1, 3, 4, 8 (discussions).

## House rules

Follow the repo `CLAUDE.md`: test-driven; lint/format/type-check clean;
Conventional Commits. **Update `backend/CLAUDE.md`** (replies endpoints).

Commit and push.
