# ClinicalMatch — Frontend

Mobile-first, installable PWA for ClinicalMatch. Built from
[`assignment/frontend.md`](../assignment/frontend.md).

> **Connected to the backend (chunk 11).** All non-AI data now flows through
> `src/lib/apiClient.ts` (sends the `x-user-id` header) via the `api` object in
> `src/mock/mockApi.ts`. The four **AI features stay mocked** pending their
> seminars (`TODO: LLM API (seminar 6)`; grounded Q&A also `TODO: RAG (later
seminar)`). Set `VITE_API_URL` in `.env` (defaults to `http://localhost:3001`)
> and run the backend (`cd ../backend && npm run seed && npm run dev`).

## Stack

- React 19 + TypeScript, Vite 8
- TailwindCSS v4 (design tokens in `src/index.css`, `@theme`)
- react-router-dom 7
- vite-plugin-pwa (installable, offline service worker)
- Self-hosted fonts: Fraunces / Inter / IBM Plex Mono (`@fontsource`)
- Vitest + Testing Library; oxlint; Prettier

## Commands

```bash
npm install        # install deps
npm run dev        # dev server (http://localhost:5173)
npm run build      # typecheck + production build (also generates the SW)
npm run preview    # serve the production build
npm test           # run tests once
npm run typecheck  # tsc --noEmit
npm run lint       # oxlint
npm run format     # prettier --write .
```

## Layout

```
src/
  types.ts            domain types (mirror the future API)
  lib/                diseases, formatters, device identity, cn
  mock/               seed data + mockApi (the only "server" this phase)
  hooks/              useAsync, useAiAction, useOnline, useDialog, …
  store/              app store (identity, saved trials, memberships, community, toasts)
  components/         design-system + domain components
  layout/             Header, BottomNav, AppShell
  pages/              the 10 screens
  App.tsx             router
```

## Notes for the demo

- **First run** shows onboarding (creates a device-based `userId`; no login).
- **AI features** simulate latency and validated JSON. To demo the calm error
  fallback, include the token `FAILTEST` in any AI input (self-check condition,
  a question, or a post draft) — the call fails after one retry.
- **Offline:** toggle the browser offline; the banner appears and AI/search
  controls show "Unavailable offline" while saved data stays readable.
- **Safety framing** ("informational only — not medical advice") appears on
  every AI surface, and the "unlikely" verdict is neutral grey, never red.
