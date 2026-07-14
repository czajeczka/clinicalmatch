# CLAUDE.md — ClinicalMatch backend

Standing guide for the `backend/` app. Read the root `CLAUDE.md` for the whole
project and its engineering rules; this file is the backend-specific contract.

**Keep this file current:** whenever you add or change an endpoint, change the
database schema, or change the run/test workflow, update the relevant section
here in the **same** change.

## Purpose & stack

REST API for ClinicalMatch: trials discovery, saved trials, communities
(groups, discussions, replies), users, and notifications. The frontend PWA calls
it; there is no login.

- **Runtime/language:** Node.js 24 + TypeScript, **ESM** (`"module": "NodeNext"`).
- **Framework:** Express 5.
- **Database:** SQLite via `better-sqlite3` (synchronous) — added in chunk 3.
- **Validation:** Zod (validate every request body / query).
- **Tests:** Vitest + Supertest (HTTP-level).
- **Lint/format:** oxlint + Prettier.

**Deferred — do NOT implement in the backend chunks** (each has its own later
seminar): the four **AI/LLM** features (seminar 6), **RAG**, **MCP**, the
**n8n** workflow, and the **autonomous agent**. Leave `TODO: <topic> (seminar)`
notes where a deferred feature would connect (e.g. `POST /notifications` is the
future n8n log target). Ordinary integrations (email, etc.) are in scope.

## How to run and test

```bash
npm install
npm run dev          # tsx watch, http://localhost:3001
npm run build        # tsc → dist/ (no test files) + copies db/schema.sql into dist
npm start            # node dist/index.js
npm test             # vitest run  (+ supertest)
npm run test:watch
npm run typecheck    # tsc --noEmit  (typechecks tests too)
npm run lint         # oxlint
npm run format       # prettier --write .
npm run migrate      # apply schema.sql (idempotent)
npm run seed         # load the fictional catalogue (idempotent, re-runnable)
```

Env: copy `.env.example` → `.env`. Vars: `PORT` (3001), `CORS_ORIGIN`
(`http://localhost:5173`), `NODE_ENV`, and `DB_PATH`
(default `data/clinicalmatch.sqlite`). Never commit `.env` or the `.sqlite` file.

## API structure & conventions

- **App wiring:** `src/config.ts` (Zod-validated env), `src/app.ts` (builds the
  Express app; **no `listen`** so tests import it), `src/index.ts` (starts it).
- **Routes:** one module per resource under `src/routes/*`, mounted in
  `src/app.ts` **above** the 404 handler.
- **Module style:** ESM with **relative imports and explicit `.js` extensions**
  (e.g. `import { app } from './app.js'`). We deliberately do **not** use a
  `@/*` path alias — it needs extra rewriting tooling for the `tsc` build.
- **Identity:** device-based, no login. Clients send an **`x-user-id`** header
  (generated on the frontend's first run). Identity middleware attaches
  `req.userId`; a `requireUser` guard returns **401** when the header is missing.
  Public reads (trials, groups) don't require it; anything user-owned does.
- **Responses:** JSON. Errors are always `{ error: string }` (optionally
  `{ error, details }` for validation). Status codes: **400** invalid input,
  **401** missing identity, **403** not the owner, **404** not found, **201**
  created, **204** no content.
- **CORS:** restricted to `CORS_ORIGIN` (the frontend dev origin).
- **JSON-in-TEXT:** SQLite stores array/object fields (criteria, centers, tags,
  interests) as JSON strings; the db serialise helper (chunk 3) parses them back
  to arrays so responses match the frontend types exactly.

## Database schema

SQLite (`better-sqlite3`, WAL). The DDL lives in `src/db/schema.sql`;
`src/db/index.ts` opens the DB (singleton `db`, or `openDatabase(path)` for
tests / `:memory:`); `src/db/migrate.ts` applies the schema idempotently;
`src/db/seed.ts` (+ `seed-data.ts`) loads the fictional catalogue. Array/object
fields are stored as **TEXT holding JSON**; `src/db/serialise.ts` maps rows back
to the typed objects in `src/types.ts` (parses `inclusion_criteria`,
`exclusion_criteria`, `centers`, `tags`, `interests`).

Tables (JSON-in-TEXT fields marked `[]`):

- `trials` (id, title, disease, phase, city, country, status,
  short_description, full_description, inclusion_criteria[], exclusion_criteria[],
  centers[], contact_name, contact_email, contact_phone)
- `support_groups` (id, name, disease, description, color, member_count)
- `users` (id, display_name, age?, city?, interests[], created_at)
- `discussions` (id, group_id, author_id, author_name, title?, content, tags[],
  summary?, created_at) — **`reply_count` is derived** (COUNT of replies), not a
  column
- `replies` (id, discussion_id, author_id, author_name, content, created_at)
- `saved_trials` (id, user_id, trial_id, created_at) — UNIQUE(user_id, trial_id)
- `group_memberships` (id, user_id, group_id, created_at) — UNIQUE(user_id, group_id)
- `notifications` (id, title, body, trial_id?, created_at, read 0|1)

Seeded IDs match the frontend (`t-001…`, `g-bc…`, `d-001…`, `r-001…`) so the
frontend connects seamlessly. `npm run seed` is idempotent (clears + reinserts
the seeded content tables; leaves user data alone). No `protocol_chunks` /
embeddings table — that belongs to the deferred RAG seminar.

## How to add an endpoint

1. **Write a failing Supertest test first** in `src/routes/<resource>.test.ts`.
2. Create/extend `src/routes/<resource>.ts`; export an Express `Router`.
3. **Validate** the body/query with Zod; return 400 `{ error, details }` on
   failure.
4. Read/write through the DB layer (`src/db/*`); use the serialise helper for
   JSON columns.
5. Enforce identity where relevant (`requireUser`; 403 for non-owners).
6. **Mount** the router in `src/app.ts` above the 404 handler.
7. Keep `typecheck`, `lint`, and `format` clean; run `npm test`.
8. **Update this file's API section** (and the root `CLAUDE.md` if structure
   changed).

## Endpoints (kept current as chunks land)

- `GET /health` — liveness. _(chunk 1)_
- **Users** _(chunk 4)_ — device identity; `x-user-id` is read globally by the
  `identity` middleware onto `req.userId`; `requireUser` guards owned resources.
  - `POST /users` — `{ id?, display_name, age?, city?, interests: Disease[] }`.
    Creates (201) or upserts a client-provided id (200; `created_at` preserved).
    `interests` must be a subset of the five diseases (else 400).
  - `GET /users/:id` — the user, or 404.
  - `PATCH /users/:id` — partial update of display_name/age/city/interests; 404
    if unknown.
  - `GET /users?interest=<Disease>` — users following a disease (no `interest`
    → all users; unknown disease → 400). Backs a future n8n step.
- **Trials** _(chunk 5)_ — public (no identity).
  - `GET /trials?query=&disease=` — `Trial[]`. `query` matches (case-insensitive,
    trimmed) title/short_description/city/disease; `disease` filters to one of
    the five (missing/`all`/unknown → all). Filtering is a pure helper
    (`routes/trials.query.ts`) so it's unit-testable; JSON columns come back as
    arrays via the serialise helper.
  - `GET /trials/:id` — one `Trial`, or 404 `{ error: 'Trial not found' }`.
- **Saved trials** _(chunk 6)_ — all require `x-user-id` (`requireUser`).
  - `GET /saved-trials` — the user's saved trials as full `Trial[]`, newest first.
  - `POST /saved-trials` — `{ trial_id }`. 404 if the trial is unknown;
    idempotent (unique on user_id+trial_id): 201 on first save, 200 with the
    existing record otherwise.
  - `DELETE /saved-trials/:trialId` — un-save; always 204 (idempotent).
- **Groups** _(chunk 7)_ — public.
  - `GET /groups` — `SupportGroup[]` (5 seeded).
  - `GET /groups/:id` — one group, or 404 `{ error: 'Group not found' }`.
  - `member_count` is **live**: the seeded base column (a realistic starting
    number, never mutated) **plus** `COUNT(group_memberships)` for that group.
    Joining raises it, leaving lowers it.
- **Memberships** _(chunk 7)_ — all require `x-user-id` (`requireUser`).
  - `GET /memberships` — the user's joined groups as full `SupportGroup[]`.
  - `POST /memberships` — `{ group_id }`. 404 if unknown; idempotent (unique
    user_id+group_id): 201 first join, 200 if already joined.
  - `DELETE /memberships/:groupId` — leave; always 204 (idempotent).
- **Discussions** _(chunk 8)_ — all discussion routes live in one root-mounted
  router. `reply_count` is derived (COUNT of replies).
  - `GET /groups/:groupId/discussions` — public; `Discussion[]` newest first.
  - `GET /discussions/:id` — public; one, or 404.
  - `POST /discussions` — `requireUser`; `{ group_id, title?, content, tags?,
summary? }`; `content` required non-empty (400 otherwise); 404 if the group
    is unknown; stores `author_id`/`author_name` (from the user's display name,
    else `"You"`); 201. **No AI** — post-enhancement is deferred (frontend
    mock; TODO: LLM API, seminar 6).
  - `PATCH /discussions/:id` — `requireUser`; author only (403 otherwise, 404 if
    missing); edits title/content/tags.
  - `DELETE /discussions/:id` — `requireUser`; author only; also deletes its
    replies; 204.
- **Replies** _(chunk 9)_ — root-mounted router. `reply_count` stays derived,
  so posting/deleting moves it automatically (no counter to maintain).
  - `GET /discussions/:discussionId/replies` — public; `Reply[]` oldest-first;
    404 if the discussion is unknown.
  - `POST /discussions/:discussionId/replies` — `requireUser`; `{ content }`
    (non-empty, else 400); 404 if the discussion is unknown; stores
    `author_id`/`author_name`; 201.
  - `DELETE /replies/:id` — `requireUser`; author only (403 otherwise, 404 if
    missing); 204.
- _Notifications — added in chunk 10; document here as it lands._
