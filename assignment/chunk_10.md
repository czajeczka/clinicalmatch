# Chunk 10 — Notifications endpoints

**Description:** Back the Home "Recent" section: list notifications and record
(log) a notification. These are plain REST endpoints. The **AI-written email
summary and the n8n workflow that sends it are deferred** — this chunk only
stores and serves notification records.

## Exactly what to do

1. Create `src/routes/notifications.ts`:
   - `GET /notifications` — returns `Notification[]` (id, title, body, trial_id?,
     created_at, read), newest first. (Global demo list — matches the frontend
     `getNotifications()`, which is not user-scoped.)
   - `POST /notifications` — body `{ title, body, trial_id? }`. Creates a record
     with `created_at = now`, `read = false`. Returns 201 with the record.
     *(This is the endpoint a future n8n workflow will call to "log the
     interaction" — but it is an ordinary write endpoint and is built now.)*
   - Optionally `PATCH /notifications/:id` to mark read (nice-to-have; only if
     quick).
2. Mount in `src/app.ts`.

## Deferred (do NOT build here)

- The AI-generated patient-friendly **email summary** → LLM feature, seminar 6.
- The **n8n email workflow** (webhook → fetch → AI → Gmail → log) → its own
  later seminar. Leave a `TODO: n8n workflow (later seminar)` comment near the
  `POST /notifications` handler noting it will be the workflow's log target.

## Files this creates or changes

- `backend/src/routes/notifications.ts`
- `backend/src/app.ts` (mount)
- Test: `backend/src/routes/notifications.test.ts`
- `backend/CLAUDE.md` (document endpoints + the deferral note)

## How to verify

- Supertest: `GET /notifications` returns the two seeded records newest-first;
  `POST /notifications` creates one (201) and it then appears in the list;
  invalid body → 400.
- `npm run typecheck`, `npm run lint`, `npm test` clean.

## Dependencies

- Chunks 1 and 3.

## House rules

Follow the repo `CLAUDE.md`: test-driven; lint/format/type-check clean;
Conventional Commits. **Update `backend/CLAUDE.md`** (notifications endpoints).

Commit and push.
