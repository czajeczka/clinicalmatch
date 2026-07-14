# Chunk 8 — Discussions endpoints

**Description:** CRUD for discussion threads inside a community board. Anyone with
an identity can create; only the author can edit or delete their own discussion
(ownership enforced by `x-user-id`). Response shapes match the frontend
`Discussion` type (including `author_name`, `tags[]`, `reply_count`).

## Exactly what to do

1. Create `src/routes/discussions.ts`:
   - `GET /groups/:groupId/discussions` — public; returns `Discussion[]` for the
     group, newest first, each with a live `reply_count`.
   - `GET /discussions/:id` — public; one discussion or 404.
   - `POST /discussions` — require `x-user-id`; body `{ group_id, title?,
     content, tags?, summary? }`. `content` is required and non-empty. Stores
     `author_id = req.userId` and `author_name` from the user's `display_name`
     (look up the user; fall back to `"You"` if unknown). 201 with the created
     discussion. **Do not** call any AI here — the optional AI post-enhancement
     is deferred (see note below).
   - `PATCH /discussions/:id` — require `x-user-id`; only the author may edit
     (`title`, `content`, `tags`). **403** if not the owner, **404** if missing.
   - `DELETE /discussions/:id` — require `x-user-id`; only the author; also
     deletes its replies. 204 (403 if not owner).
2. `reply_count` should be computed from the `replies` table (or maintained on
   write in chunk 9) — pick one approach and keep it consistent.
3. Mount in `src/app.ts`.

## Deferred (do NOT build here)

The **AI discussion post enhancement** (suggested title/tags/summary/improved
draft) is an LLM feature. Leave it out of the backend. In the frontend it stays
mocked with a `TODO: LLM API (seminar 6)` note. Posting must work fully without
it ("publish as-is").

## Files this creates or changes

- `backend/src/routes/discussions.ts`
- `backend/src/app.ts` (mount)
- Test: `backend/src/routes/discussions.test.ts`
- `backend/CLAUDE.md` (document endpoints + ownership rules)

## How to verify

- Supertest: list a group's discussions (seeded) with correct `reply_count`;
  create as user A (201, `author_name` set); user B PATCH/DELETE A's post →
  **403**; A edits/deletes own → 200/204; empty `content` → 400; unknown id →
  404; write calls without header → 401.
- `npm run typecheck`, `npm run lint`, `npm test` clean.

## Dependencies

- Chunks 1, 3, 4 (identity), 7 (groups exist). Pairs with chunk 9 (replies).

## House rules

Follow the repo `CLAUDE.md`: test-driven; lint/format/type-check clean;
Conventional Commits. **Update `backend/CLAUDE.md`** (discussions endpoints).

Commit and push.
