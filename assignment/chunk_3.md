# Chunk 3 — Database layer, schema, and seed

**Description:** Add SQLite (`better-sqlite3`), the full schema, a DB access
module, and a seed script that loads the fictional catalogue. This is the data
foundation every endpoint chunk builds on. Reuse the **same fictional data and
IDs** already in `frontend/src/mock/data.ts` so the frontend connects seamlessly
later.

## Exactly what to do

1. Install: `better-sqlite3` and `-D @types/better-sqlite3`.
2. Add a `data/` directory (git-ignored) for the SQLite file; DB path from env
   (`DB_PATH`, default `data/clinicalmatch.sqlite`). Add `DB_PATH=` to
   `.env.example` and read it in `src/config.ts`.
3. Create `src/db/index.ts` — opens the database (WAL mode on), exports a
   singleton `db`. Provide a small typed helper surface if useful.
4. Create `src/db/schema.sql` with these tables (JSON-heavy fields stored as
   TEXT holding JSON strings, per the brief):
   - `trials(id TEXT PK, title, disease, phase, city, country, status,
     short_description, full_description, inclusion_criteria TEXT/*json*/,
     exclusion_criteria TEXT/*json*/, centers TEXT/*json*/, contact_name,
     contact_email, contact_phone)`
   - `support_groups(id TEXT PK, name, disease, description, color,
     member_count INTEGER)`
   - `users(id TEXT PK, display_name, age INTEGER NULL, city NULL,
     interests TEXT/*json*/, created_at TEXT)`
   - `discussions(id TEXT PK, group_id, author_id, author_name, title NULL,
     content, tags TEXT/*json*/, summary NULL, created_at TEXT)`
   - `replies(id TEXT PK, discussion_id, author_id, author_name, content,
     created_at TEXT)`
   - `saved_trials(id TEXT PK, user_id, trial_id, created_at TEXT,
     UNIQUE(user_id, trial_id))`
   - `group_memberships(id TEXT PK, user_id, group_id, created_at TEXT,
     UNIQUE(user_id, group_id))`
   - `notifications(id TEXT PK, title, body, trial_id NULL, created_at TEXT,
     read INTEGER /*0|1*/)`
   - Add helpful indexes (e.g. `discussions(group_id)`, `replies(discussion_id)`,
     `saved_trials(user_id)`, `group_memberships(user_id)`).
   - **Do NOT create a `protocol_chunks` / embeddings table** — that belongs to
     the deferred RAG seminar. Leave a comment: `-- TODO: RAG (later seminar)`.
5. Create `src/db/migrate.ts` — applies `schema.sql` (idempotent
   `CREATE TABLE IF NOT EXISTS`). Wire an npm script `migrate`.
6. Create `src/db/seed-data.ts` — port the trials, support groups, discussions,
   and replies from `frontend/src/mock/data.ts` (keep the same IDs: `t-001…`,
   `g-bc…`, `d-001…`, `r-001…`, and the seeded `author_name`s). Reviewer note:
   this is the "fictional-but-realistic 8–12 trials across five diseases" seed
   from the brief.
7. Create `src/db/seed.ts` — runs migrate, then clears and inserts the seed data
   (JSON fields serialised with `JSON.stringify`). Also seed the two demo
   `notifications`. Wire an npm script `seed`. Make it safe to re-run.
8. Add a tiny row-mapping helper (e.g. `src/db/serialise.ts`) that
   parses/serialises the JSON TEXT columns, so endpoint chunks return typed
   objects matching the frontend shapes (arrays for `inclusion_criteria`,
   `exclusion_criteria`, `centers`, `tags`, `interests`).

## Files this creates or changes

- `backend/src/db/index.ts`, `schema.sql`, `migrate.ts`, `seed.ts`,
  `seed-data.ts`, `serialise.ts`
- `backend/src/config.ts` (+ `DB_PATH`), `backend/.env.example` (+ `DB_PATH=`)
- `backend/package.json` (scripts `migrate`, `seed`)
- `backend/CLAUDE.md` (fill in the real schema section)
- A test: `src/db/seed.test.ts`

## How to verify

- `npm run seed` completes without error and is re-runnable.
- Test (`src/db/seed.test.ts`): after seeding, the DB has 8–12 trials spanning
  all five diseases, 5 support groups, ≥4 discussions, ≥4 replies; JSON columns
  round-trip to arrays.
- `npm run typecheck`, `npm run lint`, `npm test` clean.

## Dependencies

- Chunk 1 (backend + config + scripts).

## House rules

Follow the repo `CLAUDE.md`: test-driven; keep lint/format/type-check clean;
Conventional Commits (`feat:`/`test:`). Never commit secrets or the `.sqlite`
file. **Update `backend/CLAUDE.md`** with the finalised schema.

Commit and push.
