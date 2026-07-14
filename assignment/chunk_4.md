# Chunk 4 — Identity middleware and user endpoints

**Description:** Implement the device-based anonymous identity (no login) and the
user endpoints. Every identity-scoped request carries an `x-user-id` header; this
chunk adds the middleware that reads it plus the endpoints to create, fetch, and
update a user and to list users by interest.

## Identity model (from the brief)

- No login, no passwords, no sessions. The client generates a `userId` on first
  run and sends it as `x-user-id` on every request.
- The app is fully usable logged-out; identity only attributes saved trials,
  memberships, and posts, and enforces "edit/delete only your own posts".

## Exactly what to do

1. Create `src/middleware/identity.ts`:
   - Reads `x-user-id` and attaches `req.userId` (typed via a declaration merge
     on Express `Request`, or a small typed accessor helper).
   - Provide a `requireUser` guard that returns **401** `{ error: 'x-user-id
     header required' }` when the header is missing, for endpoints that need an
     identity. Public reads (trials, groups) do not use the guard.
2. Add a Zod-validated route module `src/routes/users.ts`:
   - `POST /users` — body `{ id?, display_name, age?, city?, interests: string[] }`.
     If `id` is provided (client-generated), upsert with that id; otherwise
     generate one. `interests` must be a subset of the five canonical diseases.
     Returns the created/updated `User` (JSON fields as arrays). 201 on create.
   - `GET /users/:id` — returns the user or 404.
   - `PATCH /users/:id` — partial update of `display_name`, `age`, `city`,
     `interests`. 404 if unknown.
   - `GET /users?interest=<Disease>` — returns users whose `interests` include
     the given disease. *(This backs a future n8n "email matching users" step,
     but the endpoint itself is ordinary REST and is built now.)*
3. Mount the router and the identity middleware in `src/app.ts`.
4. Keep validation errors at **400** with `{ error, details }`.

## Files this creates or changes

- `backend/src/middleware/identity.ts`
- `backend/src/routes/users.ts`
- `backend/src/app.ts` (mount middleware + router)
- `backend/src/lib/validation.ts` (shared Zod helpers, if not already present)
- Test: `backend/src/routes/users.test.ts`
- `backend/CLAUDE.md` (document the identity model + these endpoints)

## How to verify

- Supertest cases: create a user (201) → fetch it (200) → patch it (200) →
  filter by interest returns it; unknown id → 404; invalid interest → 400;
  a `requireUser` endpoint without the header → 401.
- `npm run typecheck`, `npm run lint`, `npm test` clean.
- Manual: `curl -X POST localhost:3001/users -H 'content-type: application/json'
  -d '{"display_name":"Alex","interests":["Type 2 Diabetes"]}'`.

## Dependencies

- Chunks 1 and 3 (server + DB/seed).

## House rules

Follow the repo `CLAUDE.md`: test-driven; lint/format/type-check clean;
Conventional Commits. **Update `backend/CLAUDE.md`** (identity + user endpoints).

Commit and push.
