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
npm run sync             # CTIS FULL import — replace the trials catalogue with real data
npm run sync:incremental # CTIS incremental — upsert only new/changed trials
```

In the production image (no tsx): `node dist/sync/run.js full|incremental`.

Env: copy `.env.example` → `.env`. Vars: `PORT` (3001), `CORS_ORIGIN`
(`http://localhost:5173`), `NODE_ENV`, `DB_PATH`
(default `data/clinicalmatch.sqlite`), plus the CTIS importer settings
(`CTIS_API_URL`, `CTIS_TIMEOUT_MS`, `IMPORT_LIMIT`, `IMPORT_BATCH_SIZE`,
`IMPORT_RETRY_COUNT`, `IMPORT_DISEASES`, `IMPORT_STATUS`, `SYNC_INTERVAL_HOURS`
— see § Data source). Never commit `.env` or the `.sqlite` file.

Tests: per-route Supertest suites plus `src/e2e.test.ts`, a chained golden-path
flow (create user → save → join → post → reply → edit/delete, with ownership
and error-shape assertions). Tests run against an in-memory DB (see
`vitest.config.ts`).

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
- **Admin role:** `requireAdmin` (`middleware/identity.ts`) looks the identity
  up in `users` and returns **403 `{ error: 'Admin access required' }`** unless
  `role='admin'` (**401** if the header is missing). Role is server-side, so it
  can't be forged in a body. `isAdmin(userId)` is the shared helper (also lets an
  admin edit/delete any post or reply). Every privileged endpoint uses it —
  hiding client buttons is never the enforcement point.
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
- `users` (id, display_name, age?, city?, interests[], created_at, email?,
  **role** `'user' | 'admin'` default `'user'`). Exactly one predefined admin
  (`u-admin`, Oliwia Czajka) is upserted by the seed; role is **never** settable
  through the user API. `email`/`role` are backfilled onto existing databases by
  `applySchema` (idempotent `ALTER TABLE ... ADD COLUMN`).
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

Two more tables back the CTIS importer (below): **`sync_logs`** (one row per
import run — mode/status/counts/message/timestamps) and **`trial_sync_meta`**
(per-trial provenance + CTIS `lastUpdated`, used for incremental diffing). Both
are internal — never returned by the trial API.

## Data source: CTIS synchronisation (real trial data)

Real trials come from the **EU Clinical Trials Information System (CTIS)** public
API (`https://euclinicaltrials.eu/ctis-public-api`). Fetching happens **only in
the backend** — the frontend still calls the same unchanged `/trials` endpoints.
The fictional `seed` catalogue remains for tests/local dev; production replaces
it by running the importer.

### Architecture (`src/sync/`, each layer independently testable)

- **`ctisClient.ts`** — HTTP client: `search(term,page,size)` (`POST /search`)
  and `retrieve(ctNumber)` (`GET /retrieve/:id`). Per-request `AbortController`
  timeout; **bounded retries with linear backoff** on transient failures
  (network/timeout, 5xx, 429) — 4xx and final failures propagate. `fetch` + base
  URL + retry knobs are injectable (tests use fixtures / fake fetch — no network).
- **`ctisMapper.ts`** — pure CTIS→`Trial` mapping. `classifyDisease` limits to
  the five canonical diseases; `mapPhase`/`mapStatus` normalise CTIS's verbose
  phase/status; detail extractors pull eligibility criteria, trial sites
  (→`centers`, `city`/`country`) and contacts. Missing detail → search-only
  fallback (age/sex → eligibility). `buildSourceMeta` produces the internal
  provenance record (sponsor, source URL/id, countries, raw status).
- **`importer.ts`** — `runImport({mode, ...})`. See flow + guarantees below.
- **`run.ts`** — CLI entry for the npm scripts.
- Admin observability: `getSyncStatus()` → `GET /admin/sync` (admin-only) →
  `{ last, lastError, recent[] }` for the Admin Panel's Sync tab.

### Synchronisation flow

Per disease (from `IMPORT_DISEASES`): search CTIS **page by page**
(`IMPORT_BATCH_SIZE`) until `IMPORT_LIMIT` trials are gathered or pages run out
→ for each record retrieve its detail (with retries) → map to `Trial` →
`IMPORT_STATUS` filter → **de-dupe by CTIS id** (across diseases) → collect. Then
apply all collected trials in **one transaction**, writing a `sync_logs` row
(mode, status, seen/imported/updated/skipped/failed, `duration_ms`, message).

- **full** — replace the catalogue (delete all trials + saved_trials + meta,
  then insert). This reconciles trials that disappeared/were removed upstream.
- **incremental** — upsert only new trials or those whose CTIS `lastUpdated`
  changed (diffed via `trial_sync_meta`); unchanged → **skipped**; never deletes.

### Guarantees

- **No duplicates** — `id = ctNumber` is the PK; writes are `INSERT … ON
CONFLICT(id) DO UPDATE`; the run also de-dupes by id before applying.
- **Correct updates** — changed trials update in place (same id).
- **Closed/deleted** — status changes flow through the status mapping on every
  sync; upstream removals are reconciled by the periodic **full** import
  (incremental intentionally never deletes, to avoid over-pruning a partial fetch).
- **Failure-safe** — everything applies in a transaction; a failed/empty _fetch_
  logs `error` and leaves the catalogue untouched; a run where all records were
  filtered out logs `success`/`partial` and also changes nothing (never wipes).
- **Retries** — transient CTIS failures retried up to `IMPORT_RETRY_COUNT`.

### Configuration (all env vars, sensible defaults)

| Var                   | Default                                       | Meaning                                |
| --------------------- | --------------------------------------------- | -------------------------------------- |
| `CTIS_API_URL`        | `https://euclinicaltrials.eu/ctis-public-api` | CTIS base URL                          |
| `CTIS_TIMEOUT_MS`     | `20000`                                       | per-request timeout                    |
| `IMPORT_LIMIT`        | `8`                                           | max trials **per disease**             |
| `IMPORT_BATCH_SIZE`   | `20`                                          | CTIS search page size                  |
| `IMPORT_RETRY_COUNT`  | `2`                                           | retries per request                    |
| `IMPORT_DISEASES`     | _(all 5)_                                     | comma list to restrict diseases        |
| `IMPORT_STATUS`       | _(all)_                                       | comma list of TrialStatus to keep      |
| `SYNC_INTERVAL_HOURS` | `24`                                          | cadence hint for a host-scheduled sync |

**Change imported diseases:** set `IMPORT_DISEASES` (e.g.
`IMPORT_DISEASES="Breast Cancer,Multiple Sclerosis"`) and re-run the importer.
Adding a _new_ disease also needs a canonical entry in `types.ts` `DISEASES`, a
matcher in `ctisMapper.classifyDisease`, a query in `importer.DISEASE_QUERIES`,
and the frontend `DISEASE_COLORS`.

**Import the full European dataset later:** raise `IMPORT_LIMIT` (per disease)
or drop the per-disease scoping and paginate the whole registry; the client
already pages via `nextPage`. For thousands of trials also consider: server-side
disease/keyword filtering in `GET /trials` (currently a small in-memory filter),
a leaner list projection for the list endpoint, and running the sync as a
scheduled job (host cron / systemd timer / container, cadence `SYNC_INTERVAL_HOURS`)
using `incremental` mode.

Mapping summary: `ctNumber`→`id`, `ctTitle`→`title`, disease = canonical disease
searched, `trialPhase`→`phase`, trial-site address→`city`/`country`,
`ctStatus`→`status`, eligibility criteria→`inclusion/exclusion_criteria`, sites
→`centers`, sponsor contact→`contact_*`. Richer CTIS fields (sponsor, source
URL/id, countries, raw recruitment status) are stored in **`trial_sync_meta`**
for future AI/RAG use — internal only, so the `Trial` API shape is unchanged.

### Deployment

Production always uses CTIS data. On deploy: `docker compose up -d --build`
(startup runs `applySchema`, which creates/migrates the sync tables + columns),
then seed the community/admin (`node dist/db/seed.js`) and run the importer
(`node dist/sync/run.js full`). The fictional trial seed is **dev/test only**;
in production the full import replaces it. Refresh later with
`node dist/sync/run.js incremental` on a schedule.

Tests: `ctisMapper.test.ts` (classification/normalisation/mapping + fallback +
source meta), `ctisClient.test.ts` (retry: transient→retry, 5xx→give up, 4xx→no
retry), `importer.test.ts` (full/incremental/pagination/de-dupe/status-filter/
partial/error against a fake client + in-memory DB).

### Comprehensive platform (all diseases + European coverage)

- **Supported diseases** are data-driven (`sync/diseaseAreas.ts` — ~40 areas
  across oncology, neurology, cardiology, endocrinology, immunology, respiratory,
  etc.). `disease` on a trial is now a **free-form string** (no fixed enum), so
  new areas need **no code change** — add a label to `IMPORT_DISEASES`
  (env / admin panel) and unknown labels are searched verbatim.
- **Stored per trial**: country, city, recruiting sites (`centers`), sponsor,
  phase, recruitment status, therapeutic area, medical condition, intervention,
  inclusion/exclusion criteria, CTIS id + URL, plus `age_min/age_max`/`gender`
  for filtering and `countries[]` (all recruiting countries).
- **Normalisation / indexes**: `sponsors` lookup table (deduped) referenced by
  `trials.sponsor_id`; `trial_countries` junction for multi-country filtering.
  Indexes on disease, status, city, country, phase, sponsor_id, and
  trial_countries(country).
- **Filtering + pagination**: `GET /trials?query&disease&country&city&sponsor&
phase&status&age&sex&limit&offset` — all combine (AND), index-backed SQL, and
  return `{ items, total, limit, offset }`. `GET /trials/facets` returns the
  distinct filter options (diseases/countries/cities/sponsors/phases/statuses)
  that drive the frontend dropdowns dynamically.
- **Scale strategy**: the importer **streams page-by-page** (one CTIS page =
  one transaction → bounded memory), paginates each area up to `IMPORT_LIMIT`,
  retries transient failures, de-dupes by id across areas, and is **resumable**
  (incremental upserts persist as it goes). **full** mode reconciles removals
  via a scoped sweep (deletes CTIS trials in the imported diseases not seen this
  run — never touches other diseases or admin-created trials; never wipes on an
  empty/failed fetch).
- **Admin control** (`/admin/sync`, admin-only): `GET` returns last/lastError/
  recent runs + scheduler state (paused/running/next_run) + catalogue stats
  (total trials, distinct diseases, distinct countries, supported areas).
  `POST /run { mode, diseases?, countries? }` starts a background import
  (import all Europe, or scoped to selected diseases/countries; `mode:full` =
  force full). `POST /pause` / `POST /resume` toggle the scheduler.
- **Scheduler**: `sync/scheduler.ts` runs an incremental sync when due
  (`SYNC_INTERVAL_HOURS`), unless paused/running. Nothing auto-runs until a
  first run sets `next_run_at`.
- **New config**: `IMPORT_COUNTRIES` (comma list; empty = all). `IMPORT_LIMIT`
  is now per-disease-area; `IMPORT_DISEASES` is a comma list of area labels.

**Import the complete European catalogue:** raise `IMPORT_LIMIT` (e.g. into the
hundreds) and/or widen `IMPORT_DISEASES`; the client already pages the whole
result set via `nextPage`, and the streaming importer keeps memory bounded. Run
`node dist/sync/run.js full` (periodic) + `incremental` (frequent, scheduled).
For very large volumes, run the importer as a dedicated job (host cron / separate
container) rather than in the API process.

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
  - `POST /trials` — **admin** (`requireAdmin`); full trial body; 201.
  - `PATCH /trials/:id` — **admin**; partial update; 200/404.
  - `DELETE /trials/:id` — **admin**; also clears saved references; 204/404.
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
  - `POST /groups` — **admin**; `{ name, disease, description, color }`; 201.
  - `PATCH /groups/:id` — **admin**; partial update; 200/404.
  - `DELETE /groups/:id` — **admin**; cascades memberships + discussions +
    replies; 204/404.
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
  - `PATCH /discussions/:id` — `requireUser`; author **or admin** (403 otherwise,
    404 if missing); edits title/content/tags.
  - `DELETE /discussions/:id` — `requireUser`; author **or admin**; also deletes
    its replies; 204.
- **Replies** _(chunk 9)_ — root-mounted router. `reply_count` stays derived,
  so posting/deleting moves it automatically (no counter to maintain).
  - `GET /discussions/:discussionId/replies` — public; `Reply[]` oldest-first;
    404 if the discussion is unknown.
  - `POST /discussions/:discussionId/replies` — `requireUser`; `{ content }`
    (non-empty, else 400); 404 if the discussion is unknown; stores
    `author_id`/`author_name`; 201.
  - `PATCH /replies/:id` — `requireUser`; author **or admin**; edits content;
    200/403/404.
  - `DELETE /replies/:id` — `requireUser`; author **or admin** (403 otherwise,
    404 if missing); 204.
- **Notifications** _(chunk 10)_ — plain REST; global demo list (not
  user-scoped), matching the frontend's `getNotifications()`.
  - `GET /notifications` — `Notification[]`, newest first.
  - `POST /notifications` — **admin** (`requireAdmin`); `{ title, body, trial_id? }`;
    201 (`read: false`). Admins create announcements here; the future n8n
    workflow authenticates as the admin to log interactions (TODO: n8n, later
    seminar; AI email summary deferred to seminar 6).
  - `PATCH /notifications/:id` — `{ read }`; marks read/unread (open to any
    user); 404 if unknown.
  - `DELETE /notifications/:id` — **admin**; removes an announcement; 204/404.
