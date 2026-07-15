# CLAUDE.md — ClinicalMatch

Standing instructions for developing this app. Read the full picture in
`project-brief.md`; this file is the working contract. Where the brief is
silent, sensible defaults are chosen and marked **(assumption)** — confirm
before relying on them.

## Project
ClinicalMatch is a mobile-first, installable PWA that helps patients with one of
five chronic/serious conditions (Breast Cancer, Type 2 Diabetes, Rheumatoid
Arthritis, Crohn's Disease, Multiple Sclerosis) walk the whole journey:
**discover** European clinical trials, **understand** their eligibility criteria
in plain language (plus an informational Likely/Possibly/Unlikely self-check),
and **belong** through disease-specific discussion boards. It layers four Claude
AI features, local-embedding RAG, an MCP server, a Telegram agent, and an n8n
email workflow on an Express + SQLite backend. **Everything AI is informational
only — never medical advice; final eligibility is always the trial
investigators' call**, and that framing must appear on every AI surface.

## Status & scope
Two-app monorepo:
- **`frontend/`** — built and **connected to the backend** (chunk 11) for all
  non-AI data via `src/lib/apiClient.ts` (sends `x-user-id`). The four AI
  features remain mocked pending their seminars. Set `VITE_API_URL`. See
  `frontend/CLAUDE.md`.
- **`backend/`** — Express + TypeScript + SQLite. Full non-AI REST API built and
  tested (chunks 1–10): users, trials, saved-trials, groups, memberships,
  discussions, replies, notifications. See `backend/CLAUDE.md`.

**Deferred building blocks — do NOT build these early** (each gets its own later
seminar; building now just means redoing it):
- **AI / LLM smart features** (eligibility self-check, plain-language criteria,
  trial summary, discussion-post enhancement) → **seminar 6**.
- **RAG** (grounded "Ask about this trial"), **MCP server**, **n8n workflow**,
  **autonomous agent** → their own later seminars.

Where a deferred feature surfaces in the UI, keep its placeholder/mock and a
`TODO: <topic> (its seminar)` note — e.g. `TODO: LLM API (seminar 6)`,
`TODO: RAG (later seminar)`. Ordinary third-party integrations (email, maps,
etc.) are in scope and built normally.

## Tech stack
**Frontend** (as built)
- React 19 + TypeScript, built with Vite 8.
- TailwindCSS v4 (tokens in `src/index.css`); PWA via `vite-plugin-pwa`.
- react-router 7. Fonts: Fraunces (headings), Inter (body), IBM Plex Mono.

**Backend** (as built / planned)
- Node.js v24 + TypeScript (ESM, NodeNext), **Express 5**.
- SQLite via `better-sqlite3` (single file, synchronous) — added in chunk 3.
- **Zod** for request validation.
- _Deferred (later seminars — not built in the current chunks):_ Claude API
  (`@anthropic-ai/sdk`) for the four AI features; RAG via `@xenova/transformers`
  + an in-memory `VectorStore`; MCP (`@modelcontextprotocol/sdk`, stdio); a
  Telegraf agent. Exact Claude model id is still an **(assumption)**.

**Shared tooling**
- Package manager: **npm** (Node 24 / npm 11 installed).
- Test runner: **Vitest** (+ **Supertest** for backend HTTP tests).
- Linter: **oxlint**. Formatter: **Prettier**. Type check: **`tsc --noEmit`**.
- **n8n** workflow (deferred) lives as exported JSON; reverse proxy/TLS via
  **Caddy** **(assumption — Caddy over Nginx for simpler automatic HTTPS)**.

## Repository structure
Each app is self-contained with its own `package.json`, config, and tests.

```
clinicalmatch/
├── frontend/                 # React + Vite PWA
│   ├── src/
│   │   ├── components/       # reusable UI + design system
│   │   ├── pages/            # the 10 screens (Home, Trials, Detail, …)
│   │   ├── mock/             # mock data + mockApi (the only "server" for now)
│   │   ├── store/, hooks/, lib/, layout/
│   │   └── main.tsx
│   ├── public/               # PWA icons, manifest assets
│   └── *.test.ts(x) co-located
├── backend/                  # Express 5 + TypeScript API
│   ├── src/
│   │   ├── config.ts, app.ts, index.ts
│   │   ├── routes/           # REST endpoints (added chunk by chunk)
│   │   ├── db/               # better-sqlite3 setup, schema, seed (chunk 3)
│   │   ├── ai/               # DEFERRED — Claude calls (seminar 6)
│   │   ├── rag/, mcp/, agent/ # DEFERRED — their own later seminars
│   │   └── *.test.ts co-located
│   └── CLAUDE.md
├── n8n/                      # DEFERRED — exported workflow JSON (later seminar)
├── deploy/                   # VPS notes, Caddy config
├── assignment/              # build brief + chunk_*.md implementation plan
├── project-brief.md
└── CLAUDE.md
```

Dirs marked DEFERRED are planned but intentionally not built yet (see
Status & scope).

Tests live beside the code they cover (co-located `*.test.ts(x)`) or in a
per-app `tests/` dir — keep them close and fast. Config (tsconfig, eslint,
prettier, vite) stays inside each app.

## How we work (engineering rules)
1. **Test-driven:** write or update a *failing* test first, then the code to
   make it pass. Keep tests fast and close to the code.
2. **Green before commit:** every change keeps the linter and formatter clean
   and `tsc` type-check green before it is committed.
3. **Small, focused commits**, Conventional Commits style: `feat:`, `fix:`,
   `chore:`, `test:`, `docs:`, `refactor:`.
4. **Never commit secrets.** Keep a `.env.example` with empty values; `.env`
   stays in `.gitignore`. Never print `.env` contents.
5. **Readable over clever.** Match existing patterns; prefer conventional code.
6. **Explain non-obvious decisions** in the commit body or a comment — the
   maintainer is learning.
7. **Keep CLAUDE.md current:** when you add a feature, add or change an
   endpoint, or change project structure, update the relevant `CLAUDE.md`
   (root, `frontend/`, or `backend/`) in the **same** change.
8. **Safety is a feature:** every AI response is validated JSON, retried once on
   malformed output, then falls back to a calm inline message; the app stays
   usable when AI is down; the informational-only disclaimer appears on every AI
   surface. The "unlikely" verdict is neutral grey (`#8A8F8C`), never red.

## Commands

**Backend** (`cd backend`) — Express 5 + TS; base server up (chunk 1). Full
details and the "how to add an endpoint" recipe live in `backend/CLAUDE.md`.
- Install: `npm install`
- Dev: `npm run dev` (tsx watch, http://localhost:3001) · Build: `npm run build` · Start: `npm start`
- Test: `npm test` (vitest + supertest) · Watch: `npm run test:watch`
- Types: `npm run typecheck` · Lint: `npm run lint` (oxlint) · Format: `npm run format`
- DB (from chunk 3): `npm run migrate` · `npm run seed`

**Frontend** (`cd frontend`) — calls the backend for non-AI data; AI mocked.
- Install: `npm install`
- Dev: `npm run dev` (vite, http://localhost:5173)
- Build: `npm run build` (tsc + vite; generates the PWA service worker) · Preview: `npm run preview`
- Test: `npm test` (vitest) · Watch: `npm run test:watch`
- Types: `npm run typecheck` · Lint: `npm run lint` (oxlint) · Format: `npm run format` (prettier)
- Stack: React 19 + TS, Vite 8, Tailwind v4, react-router 7, vite-plugin-pwa.

**Run the full app together**
1. `cd backend && npm run seed && npm run dev` (API on `:3001`).
2. In `frontend/`: set `VITE_API_URL=http://localhost:3001` in `.env`, then
   `npm run dev` (`:5173`). Onboard, then browse/save/join/post end to end.
3. The backend Supertest e2e (`backend/src/e2e.test.ts`) covers the same
   non-AI golden path headlessly.

## Deployment (Docker + Traefik)
Production runs as three containers on a shared Docker network, orchestrated by
`docker-compose.yml` at the repo root. **Config only — nothing is started
automatically; run `docker compose up` yourself when ready.**

Files:
- `backend/Dockerfile` — multi-stage: full `node:24-bookworm` builds TS and the
  native `better-sqlite3` binary, then `node:24-bookworm-slim` runs
  `node dist/index.js` as the non-root `node` user. Schema auto-applies on boot
  (`db/index.ts`); the SQLite file lives on the `backend-data` volume.
- `frontend/Dockerfile` + `frontend/nginx.conf` — multi-stage: build the Vite
  bundle, serve it with `nginx:1.27-alpine` (SPA fallback + PWA-aware caching).
  `VITE_API_URL` is a **build arg**, inlined at build time.
- `docker-compose.yml` — `traefik` + `backend` + `frontend` services, shared
  `clinicalmatch` bridge network, `restart: always` on all three. Backend config
  via `env_file: .env`; `backend-data` (DB) and `letsencrypt` (certs) named
  volumes.
- `.env.example` — every variable (`DOMAIN`, `ACME_EMAIL`; backend `PORT`/
  `CORS_ORIGIN`/`NODE_ENV`/`DB_PATH`; build `VITE_API_URL`). Copy to `.env`
  (git-ignored) and fill in before building.
- `backend/.dockerignore`, `frontend/.dockerignore` — keep `node_modules`,
  build output, the DB, and secrets out of the images.

**Traefik ingress & routing.** Traefik is the single entrypoint; it terminates
TLS and is the only service publishing host ports.
- Entrypoints: `web` (:80) and `websecure` (:443); `web` globally redirects to
  `websecure` (HTTP → HTTPS).
- Certificates: Let's Encrypt via the ACME **HTTP-01** challenge (resolver `le`,
  email `${ACME_EMAIL}`), persisted to `/letsencrypt/acme.json` on the
  `letsencrypt` volume (Traefik creates the file with 600 perms).
- Provider: `docker` with `exposedbydefault=false` — services opt in via
  `traefik.enable=true` labels. Docker socket mounted **read-only**. Image is
  pinned to **`traefik:v3.7`**: older Traefik (e.g. v3.3) pins Docker API 1.24,
  which this host's Docker Engine (API ≥ 1.40) rejects, breaking label discovery.
- Routing (single subdomain `${DOMAIN}`), both routers on `websecure` + resolver
  `le`:
  - `Host(DOMAIN)` → **frontend** (nginx, container port 80).
  - `Host(DOMAIN) && PathPrefix(/api)` → **backend** (container port 3001),
    priority 100, with a `StripPrefix(/api)` middleware so the API still sees its
    root paths (`/trials`, `/groups`, `/users`, `/saved-trials`, …).
- Because both are served from the same origin, `VITE_API_URL` is
  `https://<DOMAIN>/api` and browser CORS is effectively moot (`CORS_ORIGIN`
  stays set as a safety belt). The app services expose **no** host ports —
  reachable only through Traefik on the shared network.

Usual flow: `cp .env.example .env` → fill in `DOMAIN`, `ACME_EMAIL`,
`VITE_API_URL=https://<DOMAIN>/api`, `CORS_ORIGIN=https://<DOMAIN>` → ensure DNS
for `<DOMAIN>` points at the server → `docker compose up -d --build`. Docker is
already enabled on boot (`systemctl enable docker`).

## Acceptance status (against the brief)
Done vs. deferred as of the current chunks (12/12):

**Done (built + tested):**
- **PWA / mobile-first** — installable PWA; app shell precached by the service
  worker. _(Full offline caching of API data is a documented follow-up.)_
- **Discovery & data** — browse, search, disease filter, trial detail, and
  save/un-save persisted via the backend.
- **Community** — join/leave, create discussion, reply, edit/delete own posts;
  ownership enforced server-side.
- **Home** — matching trials + notifications from the API.
- **Safety framing** — every AI surface carries the informational-only note;
  "unlikely" verdict is neutral grey, never red.
- **Backend** — full non-AI REST API (users, trials, saved, groups,
  memberships, discussions, replies, notifications), plus an admin surface;
  69 backend tests + an e2e flow.
- **Real trial data (CTIS)** — a backend-only, production-ready synchronisation
  service (`backend/src/sync/`) imports real active European trials from the EU
  Clinical Trials Information System public API into the existing `Trial` model.
  Paginated, retried, de-duplicated, transactional (a bad fetch never wipes the
  catalogue), fully env-configurable (`IMPORT_LIMIT`/`IMPORT_DISEASES`/
  `IMPORT_STATUS`/`IMPORT_BATCH_SIZE`/`IMPORT_RETRY_COUNT`/…). Full + incremental
  modes; per-run `sync_logs`; richer CTIS fields kept in `trial_sync_meta` for
  future AI. Admin Panel → Sync tab shows status via `GET /admin/sync`. API
  endpoints + frontend unchanged; the fictional seed stays for tests/local.
  See `backend/CLAUDE.md` § Data source.
- **Admin role** — two roles (`user`/`admin`); one predefined admin (Oliwia
  Czajka, `u-admin`) seeded. Admin can create/edit/delete trials, support
  groups, and announcements, and moderate any discussion/reply. Enforced by
  `requireAdmin` on every privileged endpoint (403 for non-admins); the frontend
  shows an Admin Panel + moderation controls only when `isAdmin`. No login —
  role is keyed off the existing `x-user-id` identity.

**Deferred (each has its own later seminar — intentionally not built):**
- **LLM smart features** (self-check, plain-language criteria, trial summary,
  post enhancement) → seminar 6. Currently mocked on the client with
  `TODO: LLM API (seminar 6)`, keeping the informational-only framing.
- **RAG** ("Ask about this trial"), **MCP server**, **n8n email workflow**,
  **autonomous agent** → their own seminars. Marked with `TODO: … (seminar)`
  where they touch the app (e.g. `backend/src/app.ts`, `POST /notifications`).

## Definition of done
A change is done when:
- Tests pass (and a new/updated test covers the change).
- Lint, format, and type-check are all clean.
- The app runs (relevant flow verified, not just unit tests).
- Any AI surface it touches shows the informational-only framing and degrades
  gracefully on failure.
- The relevant `CLAUDE.md` (root, `frontend/`, `backend/`) is updated if the
  workflow, structure, an endpoint, or a feature changed.
