# Chunk 1 — Backend initialisation

**Description:** Stand up the `backend/` app: project structure, dependency
manifest, a runnable base Express server with a health check, environment
configuration, and ignore rules. No database or feature endpoints yet — those
come in later chunks. When this is done, `npm run dev` serves a working server.

## Tech stack (decisions for the whole backend)

- **Runtime/language:** Node.js 24 + TypeScript (ESM).
- **Framework:** Express 5.
- **Package manager:** npm.
- **Dev runner:** `tsx` (watch mode). **Build:** `tsc`. **Run:** `node dist/`.
- **Tests:** Vitest + Supertest (HTTP-level tests).
- **Validation:** Zod. *(assumption — widely used; confirm if you prefer another)*
- **Lint/format:** oxlint + Prettier (to match the frontend).
- **DB (added in chunk 3):** SQLite via `better-sqlite3`.

## Exactly what to do

1. Create `backend/` and initialise it (`npm init -y`), set `"type": "module"`.
2. Install dependencies:
   - runtime: `express cors dotenv zod`
   - dev: `typescript tsx vitest supertest @types/express @types/cors @types/node @types/supertest oxlint prettier`
3. Add `backend/tsconfig.json` (ESM, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, `"target": "ES2023"`, `"strict": true`, `"outDir": "dist"`, `"rootDir": "src"`, `noUnusedLocals`/`noUnusedParameters` on). Add a `@/*` → `src/*` path alias.
4. Create the source layout:
   - `src/config.ts` — reads and validates env with Zod: `PORT` (default `3001`), `CORS_ORIGIN` (default `http://localhost:5173`), `NODE_ENV`. Export a typed `config`.
   - `src/app.ts` — builds and returns the Express `app` (JSON body parser, `cors({ origin: config.CORS_ORIGIN })`, a `GET /health` route returning `{ status: 'ok' }`, a 404 handler, and a final error-handling middleware that returns `{ error: string }`). **Do not call `listen` here** — so tests can import the app.
   - `src/index.ts` — imports `app` and `config`, calls `app.listen(config.PORT)`, logs the URL.
   - `src/routes/` — empty for now (a `.gitkeep` is fine).
5. Add npm scripts: `dev` (`tsx watch src/index.ts`), `build` (`tsc`), `start` (`node dist/index.js`), `test` (`vitest run`), `test:watch` (`vitest`), `typecheck` (`tsc --noEmit`), `lint` (`oxlint`), `format` (`prettier --write .`), `format:check` (`prettier --check .`).
6. Add `backend/.prettierrc.json` and `.prettierignore` matching the frontend (`semi: false`, `singleQuote: true`, `trailingComma: es5`, `printWidth: 80`).
7. Create `backend/.env.example` with **empty values**:
   ```
   PORT=
   CORS_ORIGIN=
   NODE_ENV=
   ```
8. Create `backend/.gitignore` including at least: `node_modules`, `dist`, `.env`, `*.log`, and the SQLite files added later (`*.sqlite`, `*.sqlite-*`, `data/`).
9. Write a base test `src/app.test.ts` using Supertest: `GET /health` → 200 `{ status: 'ok' }`; an unknown route → 404 with an `error` field.

## Files this creates or changes

- `backend/package.json`, `backend/package-lock.json`
- `backend/tsconfig.json`, `backend/.prettierrc.json`, `backend/.prettierignore`
- `backend/.env.example`, `backend/.gitignore`
- `backend/src/config.ts`, `backend/src/app.ts`, `backend/src/index.ts`
- `backend/src/app.test.ts`

## How to verify

- `npm run typecheck`, `npm run lint`, `npm run format:check` — all clean.
- `npm test` — the health/404 tests pass.
- `npm run dev`, then `curl -s localhost:3001/health` returns `{"status":"ok"}`.
- Confirm `.env` is git-ignored (`git status` does not show it) and `.env.example` has empty values.

## Dependencies

None (first chunk).

## House rules

Follow the repo `CLAUDE.md`: work **test-driven** (write the failing test first,
then the code to pass it); keep **lint, format, and type-check clean** before
committing; use small, focused **Conventional Commits** (`feat:`, `chore:`,
`test:`…). **Never commit secrets** — only `.env.example` (empty) is committed.
Update the relevant `CLAUDE.md` if you change structure or the workflow.

Commit and push.
