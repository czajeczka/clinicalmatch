# Chunk 2 — Project context files (CLAUDE.md)

**Description:** Make the repo's standing instructions describe **both** apps.
The root `CLAUDE.md` and `frontend/CLAUDE.md` already exist. Update the root one
to cover the monorepo (frontend + backend), and create `backend/CLAUDE.md` as
the backend's standing guide. Bake in the rule that CLAUDE.md files are kept up
to date as the code changes.

## Exactly what to do

1. **Update the root `CLAUDE.md`** so it documents the whole project:
   - Note the repository is a two-app monorepo: `frontend/` (built, running on
     mock data) and `backend/` (Express + TypeScript + SQLite).
   - Keep the existing Project / engineering-rules sections; make sure the
     Commands section links to both apps' commands (frontend commands already
     filled in; add a one-line pointer to `backend/` and its `backend/CLAUDE.md`).
   - Add, under engineering rules, the explicit rule:
     **"When you add a feature, add or change an endpoint, or change project
     structure, update the relevant `CLAUDE.md` (root, `frontend/`, or
     `backend/`) in the same change."**
   - Record the deferred building blocks so nobody builds them early:
     **AI/LLM smart features → seminar 6; RAG, MCP, n8n workflow, autonomous
     agent → their own later seminars.** These are intentionally not implemented
     in the current chunks.

2. **Create `backend/CLAUDE.md`** with:
   - **Purpose & stack:** Express 5 + TypeScript (ESM), SQLite via
     `better-sqlite3`, Zod validation, Vitest + Supertest, oxlint + Prettier.
   - **How to run and test:** the exact scripts from chunk 1 (`dev`, `build`,
     `start`, `test`, `typecheck`, `lint`, `format`), plus the DB scripts added
     in chunk 3 (`migrate`, `seed`) — add them when they exist.
   - **API structure:** where routes live (`src/routes/*`), the identity model
     (device-based `x-user-id` header — no login), the JSON response and error
     conventions (`{ error: string }`, status codes 400/403/404), and CORS.
   - **Database schema:** the tables and JSON-in-TEXT columns (summarise the
     schema from chunk 3 once written; until then, describe the planned tables).
   - **How to add an endpoint:** the recommended recipe — write a failing
     Supertest test first; add a route module under `src/routes/`; validate input
     with Zod; use the DB access layer; mount it in `src/app.ts`; keep
     lint/format/type-check clean; **update this file's API section**.
   - **Deferred features:** the same AI/RAG/MCP/n8n/agent deferral note as above,
     so backend work doesn't accidentally implement them.
   - The rule: **update this file whenever you add/change an endpoint, the
     schema, or the run/test workflow.**

## Files this creates or changes

- `CLAUDE.md` (root — updated)
- `backend/CLAUDE.md` (new)

## How to verify

- Both files read cleanly and match the current code (commands actually work).
- Root `CLAUDE.md` mentions both apps and the "keep CLAUDE.md updated" rule.
- `backend/CLAUDE.md` contains: stack, run/test commands, API + identity
  conventions, schema overview, "how to add an endpoint", and the deferral note.
- No code changes needed; nothing to run beyond a quick read-through.

## Dependencies

- Chunk 1 (backend exists and runs). The schema section is easier to finalise
  after chunk 3, but write the planned version now and refine it then.

## House rules

Follow the repo `CLAUDE.md`: keep lint/format/type-check clean (docs-only here);
use a `docs:` Conventional Commit. Never commit secrets.

Commit and push.
