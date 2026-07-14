# CLAUDE.md — ClinicalMatch frontend

Standing guide for the `frontend/` app. Read the root `CLAUDE.md` for the whole
project and its engineering rules; this file is the frontend-specific contract.
`README.md` has the fuller tour; this file is the working rules.

**Keep this file current:** when you add a screen, change data flow, or change
the run/test workflow, update this file in the **same** change.

## Stack

React 19 + TypeScript, Vite 8, TailwindCSS v4 (tokens in `src/index.css`),
react-router 7, vite-plugin-pwa. Vitest + Testing Library, oxlint, Prettier.
Self-hosted fonts (Fraunces / Inter / IBM Plex Mono).

## Commands

```bash
npm install
npm run dev          # vite dev server, http://localhost:5173
npm run build        # tsc -b + vite build (generates the PWA service worker)
npm run preview
npm test             # vitest run
npm run typecheck    # tsc -b --noEmit
npm run lint         # oxlint
npm run format       # prettier --write .
```

Env: copy `.env.example` → `.env` and set `VITE_API_URL` (defaults to
`http://localhost:3001` if unset). Never commit `.env`.

## Backend integration (chunk 11)

The app now calls the real backend for all **non-AI** data:

- `src/lib/apiClient.ts` — typed `fetch` wrapper. Reads `VITE_API_URL`, attaches
  the device identity as the **`x-user-id`** header on every request, and throws
  `ApiError` on non-2xx (so `useAsync` / `useAiAction` error states light up).
- `src/mock/mockApi.ts` (the `api` object) is the single call site. Its non-AI
  methods (trials, groups, discussions, replies, saved trials, memberships,
  users, notifications) call `apiClient`. Screens/store import `api` — they do
  not call `fetch` directly.
- `src/store/store.tsx` holds identity + **saved-trial ids** and **joined-group
  ids** (backend-hydrated when a user is known; optimistic on toggle with revert
  on failure; mirrored to localStorage for offline resilience). Community
  content (discussions/replies) is **not** cached in the store — Board and
  Thread fetch it per-screen via `useAsync` and reload after mutations.
- Onboarding `POST /users` (fire-and-forget) persists the device identity so the
  backend can resolve `author_name`; Profile interest edits `PATCH /users/:id`.

### Still mocked — deferred (do NOT wire to the backend here)

The four AI features stay implemented in `src/mock/mockApi.ts`:
`summariseTrial`, `explainCriteria`, `selfCheck`, `enhancePost`
→ `TODO: LLM API (seminar 6)`; `askTrial` (grounded Q&A) also
→ `TODO: RAG (later seminar)`. They keep the informational-only framing, the
retry-once-then-fallback behaviour, and the `FAILTEST` escape hatch for demoing
errors. Community posting works fully without the AI enhancement.

## Conventions

- **Safety UX (from the brief):** every AI surface shows the informational-only
  disclaimer; the "unlikely" verdict is neutral grey (`#8A8F8C`), never red.
- **States:** every data screen handles loading (skeletons), empty (directive
  copy), and error (calm retry). Offline shows a banner; AI/search controls read
  "Unavailable offline". _(Runtime caching of API GETs for full offline data is
  a known follow-up — the service worker currently precaches the app shell.)_
- **Structure:** `pages/` (10 screens), `components/` (design system + domain),
  `layout/` (shell, nav, header), `store/`, `hooks/`, `lib/`, `mock/`.
