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

## Tech stack
**Frontend**
- React 18 + TypeScript, built with Vite.
- TailwindCSS for styling; PWA via `vite-plugin-pwa` (installable, offline).
- Fonts: Fraunces (headings), Inter (body), IBM Plex Mono (labels/data).

**Backend**
- Node.js (v24, installed) + TypeScript, Express server.
- SQLite via `better-sqlite3` (single file, synchronous).
- Claude API (`@anthropic-ai/sdk`) — one model for all four AI features, strict
  JSON validated server-side. Default model `claude-sonnet-5` **(assumption —
  confirm exact id)**.
- RAG: `@xenova/transformers` (all-MiniLM) local embeddings + an in-memory
  cosine-similarity index behind a `VectorStore` interface.
- MCP: `@modelcontextprotocol/sdk` (stdio transport).
- Agent: Telegraf (Telegram), reusing the MCP tools + RAG.

**Shared tooling** (both apps, **assumption** unless noted)
- Package manager: **npm** (Node 24 / npm 11 already installed).
- Test runner: **Vitest** (fast, native ESM/TS, works in both apps).
- Linter: **ESLint** (typescript-eslint). Formatter: **Prettier**.
- Type check: **`tsc --noEmit`**.
- **n8n** workflow lives as exported JSON; reverse proxy/TLS via **Caddy**
  **(assumption — Caddy over Nginx for simpler automatic HTTPS)**.

## Repository structure
Each app is self-contained with its own `package.json`, config, and tests.

```
clinicalmatch/
├── frontend/                 # React + Vite PWA
│   ├── src/
│   │   ├── components/       # reusable UI
│   │   ├── pages/            # the 9 screens (Home, Trials, Detail, …)
│   │   ├── lib/              # api client, x-user-id identity, offline cache
│   │   └── main.tsx
│   ├── public/               # PWA icons, manifest assets
│   └── tests/ (or *.test.tsx co-located)
├── backend/                  # Express + TypeScript API
│   ├── src/
│   │   ├── routes/           # REST endpoints
│   │   ├── db/               # better-sqlite3 setup, schema, migrations
│   │   ├── ai/               # Claude calls + JSON schemas/validation
│   │   ├── rag/              # chunking, embeddings, VectorStore
│   │   ├── mcp/              # stdio MCP server (reuses routes/services)
│   │   ├── agent/            # Telegraf bot (reuses MCP tools + RAG)
│   │   └── seed/             # trial dataset seed script
│   └── tests/ (or *.test.ts co-located)
├── n8n/                      # exported workflow JSON
├── deploy/                   # VPS notes, Caddy config
├── project-brief.md
└── CLAUDE.md
```

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
7. **Safety is a feature:** every AI response is validated JSON, retried once on
   malformed output, then falls back to a calm inline message; the app stays
   usable when AI is down; the informational-only disclaimer appears on every AI
   surface. The "unlikely" verdict is neutral grey (`#8A8F8C`), never red.

## Commands
Fill exact scripts in as each app is scaffolded; these are the intended shapes.

**Backend** (`cd backend`)
- Install: `npm install`
- Dev: `npm run dev` *(tsx/nodemon watch — to define)*
- Test: `npm test` *(vitest)*
- Lint: `npm run lint` · Format: `npm run format` · Types: `npm run typecheck`
- Seed DB: `npm run seed`
- MCP server: `npm run mcp` · Agent: `npm run agent`

**Frontend** (`cd frontend`)
- Install: `npm install`
- Dev: `npm run dev` *(vite)*
- Build: `npm run build` · Preview: `npm run preview`
- Test: `npm test` *(vitest)*
- Lint: `npm run lint` · Format: `npm run format` · Types: `npm run typecheck`

## Definition of done
A change is done when:
- Tests pass (and a new/updated test covers the change).
- Lint, format, and type-check are all clean.
- The app runs (relevant flow verified, not just unit tests).
- Any AI surface it touches shows the informational-only framing and degrades
  gracefully on failure.
- `CLAUDE.md` and this file's Commands section are updated if the workflow or
  tooling changed.
