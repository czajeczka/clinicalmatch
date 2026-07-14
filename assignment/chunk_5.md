# Chunk 5 — Trials endpoints (search, filter, detail)

**Description:** The core discovery API: list trials with optional keyword search
and disease filter, and fetch a single trial's full detail. Public (no identity
required). Response shapes must match the frontend `Trial` type exactly.

## Exactly what to do

1. Create `src/routes/trials.ts`:
   - `GET /trials?query=<text>&disease=<Disease|all>` — returns `Trial[]`.
     - `query` matches (case-insensitive, trimmed) against title,
       short_description, city, and disease.
     - `disease` filters to one of the five canonical diseases; missing or
       `all` (or an unknown value) returns all diseases.
     - JSON TEXT columns are parsed to arrays (`inclusion_criteria`,
       `exclusion_criteria`, `centers`) via the chunk-3 serialise helper.
   - `GET /trials/:id` — returns one `Trial`, or **404** `{ error: 'Trial not
     found' }`.
2. Mount the router in `src/app.ts`.
3. Keep the search/filter logic in a small pure function (e.g.
   `src/routes/trials.query.ts` or a `lib` helper) so it can be unit-tested
   without HTTP — mirrors the frontend's `filterTrials`.

## Files this creates or changes

- `backend/src/routes/trials.ts` (+ a pure query helper)
- `backend/src/app.ts` (mount)
- Test: `backend/src/routes/trials.test.ts`
- `backend/CLAUDE.md` (document the trials endpoints)

## How to verify

- Supertest: `GET /trials` returns all seeded trials; `?disease=Multiple
  Sclerosis` returns only MS trials; `?query=warsaw` narrows by city;
  `?query=zzz` returns `[]`; `GET /trials/:id` returns the trial and unknown id
  → 404. Assert `inclusion_criteria` is an array in the JSON.
- `npm run typecheck`, `npm run lint`, `npm test` clean.

## Dependencies

- Chunks 1 and 3.

## House rules

Follow the repo `CLAUDE.md`: test-driven; lint/format/type-check clean;
Conventional Commits. **Update `backend/CLAUDE.md`** (trials endpoints).

Commit and push.
