# Chunk 7 — Support groups and memberships endpoints

**Description:** List the disease-specific communities and let a user join/leave
them. Group listing is public; join/leave is identity-scoped and idempotent
(unique on `user_id + group_id`).

## Exactly what to do

1. Create `src/routes/groups.ts` (public):
   - `GET /groups` — returns `SupportGroup[]` (id, name, disease, description,
     color, member_count).
   - `GET /groups/:id` — one group or 404.
   - `member_count`: return a live count = seeded base `member_count` +/- actual
     memberships, **or** switch `member_count` to a computed
     `base + COUNT(group_memberships)`. Pick one and keep it consistent; document
     the choice in `backend/CLAUDE.md`.
2. Create `src/routes/memberships.ts` (require `x-user-id`):
   - `GET /memberships` — the current user's joined group ids (or full groups).
   - `POST /memberships` — body `{ group_id }`. Idempotent join; 201 first time,
     200 if already joined; 400/404 if the group doesn't exist.
   - `DELETE /memberships/:groupId` — leave; 204 (idempotent).
3. Mount both routers in `src/app.ts`.

## Files this creates or changes

- `backend/src/routes/groups.ts`, `backend/src/routes/memberships.ts`
- `backend/src/app.ts` (mount)
- Tests: `backend/src/routes/groups.test.ts`, `memberships.test.ts`
- `backend/CLAUDE.md` (document endpoints + the member_count decision)

## How to verify

- Supertest: `GET /groups` returns 5 groups; `GET /groups/:id` 200/404; join a
  group (201) → `GET /memberships` shows it → join again idempotent → leave
  (204); join unknown group → 400/404; membership calls without header → 401.
- If `member_count` is live, joining increases it and leaving decreases it.
- `npm run typecheck`, `npm run lint`, `npm test` clean.

## Dependencies

- Chunks 1, 3, 4 (identity).

## House rules

Follow the repo `CLAUDE.md`: test-driven; lint/format/type-check clean;
Conventional Commits. **Update `backend/CLAUDE.md`** (groups + memberships).

Commit and push.
