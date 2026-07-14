# ClinicalMatch

**One-line description:** An AI-powered, mobile-first Progressive Web App that helps patients discover clinical trials, understand eligibility criteria in plain language, run an informational self-check, save studies, and join disease-specific support communities — supporting the whole patient journey: discover → understand → belong.

> **Not medical advice.** ClinicalMatch helps patients understand publicly available clinical-trial information and connect with others. Every AI-generated result is informational only, and final eligibility is always determined by the clinical-trial investigators. This principle is enforced throughout the design.

## Problem it solves
Clinical-trial recruitment has a two-sided gap. Researchers cannot recruit enough eligible participants, while patients cannot easily discover suitable trials, decode dense medical eligibility criteria, judge whether they might qualify, or find others going through the same experience. Existing tools mostly solve discovery and leave patients alone with jargon-heavy documents and no community. ClinicalMatch addresses the patient side of that gap: it makes trials discoverable, makes their criteria understandable, and surrounds the patient with peer support.

## Target user
- Patients searching for clinical trials relevant to their condition.
- People living with chronic diseases (Type 2 Diabetes, Rheumatoid Arthritis, Crohn's Disease, Multiple Sclerosis).
- Cancer patients (Breast Cancer).
- Patients interested in innovative or experimental treatments.
- Family members and carers looking for information on someone's behalf.

Researchers/clinicians are a recognised secondary audience for a future version but are **not** a target user of the MVP.

## How it differs from existing solutions
ClinicalMatch is positioned as more than a trial search engine. Its differentiator is combining three capabilities that are usually scattered across separate platforms into one journey — **discover → understand → belong**:
- **Discover** — a patient-friendly search over a catalogue of European clinical trials.
- **Understand** — AI plain-language explanation of eligibility plus an informational *Likely / Possibly / Unlikely* self-assessment.
- **Belong** — disease-specific support communities.

Most competitors stop at discovery. ClinicalMatch's wedge is supporting the entire journey — from finding a study, to genuinely understanding it, to not facing it alone.

## MVP features
1. **Clinical trial search & discovery** — browse, keyword-search, and filter the seeded catalogue by disease.
2. **Trial details** — full study page: description, participating centres, contact information, recruitment status.
3. **AI plain-language eligibility explanation** — rewrites inclusion/exclusion criteria into clear "you may join if… / this rules you out…" language.
4. **AI eligibility self-check** — **CORE FEATURE.** A few questions in, an informational *Likely / Possibly / Unlikely* estimate out.
5. **Save favourite trials** — save studies to a personal profile; saved trials remain available offline.
6. **Disease-specific discussion boards** — create threads and reply within condition-based communities; edit/delete your own posts.
7. **AI discussion post enhancement** *(optional if time becomes limited)* — suggests title, summary, and tags and offers an improved draft, always shown alongside the original for the user to accept or edit.
8. **RAG-powered "Ask about this trial"** — free-text questions answered from the trial's own text via Retrieval-Augmented Generation.
9. **Home dashboard** — personalised landing screen (matching trials, quick actions, notifications entry). *Built last; first UI screen to simplify or remove if time runs short.*

## Out of scope for MVP
- Live integration with European clinical-trial registries (MVP uses a seeded, curated dataset).
- Native Android and iOS app-store builds (MVP ships as an installable PWA; architecture stays native-ready via Capacitor).
- Production authentication (no signup, passwords, sessions, or account recovery).
- Admin panel (trials added via seed script or a manual request during the demo).
- PDF uploads / PDF parsing (RAG uses the trials' own structured text).
- Real push notifications (Web Push / FCM / APNs); notifications are email + in-app.
- A second user role (researchers/doctors).
- Real-time chat (communities are asynchronous discussion boards).

## Repository structure
- `frontend/` — React + TypeScript + Vite PWA (user interface).
- `backend/` — Express + TypeScript server and API, including:
  - the REST API and SQLite access,
  - the AI service (Claude calls, JSON validation),
  - the RAG module (chunking, local embeddings, in-memory vector store),
  - the MCP server (stdio, reusing the API),
  - the Telegram autonomous agent (reusing the API/tools),
  - a seed script for the trial dataset.
- `n8n/` — exported workflow JSON for the email-notification automation.
- `deploy/` — VPS deployment notes and reverse-proxy (Caddy/Nginx) config.

*(Repository layout is an assumption — confirm before building.)*

## Tech stack
- **Frontend:** React + TypeScript + Vite + TailwindCSS, packaged as a PWA via `vite-plugin-pwa` (installable, offline-capable).
- **Backend framework:** Express (TypeScript) — lightweight and fast to build for a solo three-day MVP; lower overhead than NestJS.
- **Database:** SQLite via `better-sqlite3` — one file, zero setup, synchronous API.
- **Other libraries / APIs:**
  - **Claude API** — a single Claude model for all AI features, using structured JSON output *(exact model id, e.g. a Claude Sonnet model, is an assumption — confirm before building)*.
  - **Local embeddings** — `@xenova/transformers` (all-MiniLM) for RAG, running in-process (no second API key, no cost, offline-friendly).
  - **RAG vector store** — in-memory cosine-similarity index behind a `VectorStore` interface, so it can be replaced with pgvector/LanceDB/Chroma later.
  - **MCP** — `@modelcontextprotocol/sdk`, stdio transport.
  - **Autonomous agent** — Telegraf (Telegram bot), reusing the backend tools and RAG.
  - **n8n** — self-hosted workflow automation.
  - **Reverse proxy / TLS** — Caddy or Nginx for HTTPS.

## Screens / pages
1. **Home** — greeting, trials matching the user's interests, quick actions, notifications entry.
2. **Clinical Trials** — search + disease filter + trial cards.
3. **Trial Detail** *(pushed)* — summary, plain-language criteria, "Ask about this trial", save, centres, contact, "check eligibility".
4. **Support** — communities list.
5. **Board** *(pushed)* — discussions in a community.
6. **Discussion thread** *(pushed)* — a discussion and its replies; reply box.
7. **AI Assistant** — two segments: eligibility self-check and grounded trial Q&A.
8. **Profile** — saved trials, joined groups, stats, notification/offline settings.
9. **Onboarding** — first-run: set display name, age, city, interests.

## Navigation
Five-tab bottom navigation as the primary structure: **Home · Clinical Trials · Support · AI Assistant · Profile.** Detail screens (trial detail, board, thread) are *pushed* on top of a tab with a back button, while the tab bar stays visible. Creation flows (starting a discussion) open as a bottom sheet. This is a mobile-first, native-feeling pattern suited to a PWA that can later be packaged for Android/iOS.

## Branding
- **App display name:** ClinicalMatch
- **Logo:** a wordmark plus a simple mark combining a location pin with a medical cross/pulse (discovery + care), rendered in SVG/CSS — no external asset required.
- **Tone of voice:** warm, plain-spoken, reassuring; never clinical or alarmist; careful and honest around anything medical.
- **Slogan (optional):** "Understand your options."

## Colour scheme
- **Primary:** `#0C6B60` — deep teal (trust, medical calm)
- **Secondary:** `#6E74C9` — periwinkle (the human/community side, distinct from the clinical teal)
- **Background:** `#EDF2F0` — cool pale sage (deliberately not stark white)
- **Text:** `#12312C` — deep pine
- **Accent / CTA:** `#1E9E7E` — spring green
- **Style:** mobile-first, rounded cards, generous spacing. Fraunces (headings) + Inter (body) + IBM Plex Mono (labels/data). Self-check result colours are semantic and deliberately non-alarming: **likely `#1E9E7E` (green), possibly `#C98A2B` (amber), unlikely `#8A8F8C` (neutral grey — intentionally not red**, so an informational estimate never reads as a scary medical verdict).

## Typical user flow
1. The user opens the app and sees the **Home dashboard** with trials matching their interests.
2. They open **Clinical Trials**, search/filter, and tap a study to see its **Trial Detail** page.
3. On the detail page they tap **Explain simply** to get a plain-language version of the criteria, and **Ask about this trial** to ask a free-text question answered from the trial's text (RAG).
4. They tap **Check my eligibility**, answer four short questions, and the system shows an informational **Likely / Possibly / Unlikely** result with matched criteria and gaps — clearly labelled informational only.
5. They **save** the trial, **join** the matching support community, and post an introduction (optionally using the AI post-enhancement), then later receive an **email** when a new matching trial is added.

## Authentication and users
- **Login required:** No.
- **Login method:** None. A device-based anonymous identity: on first run the app generates a `userId` and the user sets a display name; the ID is sent on every request via an `x-user-id` header. *(assumption — confirm before building)*
- **User roles:** One (patient).
- **What a logged-out visitor sees:** Everything — the app is fully usable with no gate. Identity exists only to attribute saved trials, group memberships, and posts, and to enforce "edit/delete only your own posts."
- **Known limitation:** switching device or clearing storage starts a new identity and loses attribution to previous saves, memberships, and posts. There is no account recovery in the MVP.

## Data entered by the user
- Onboarding: display name, age, city, disease interests.
- Eligibility self-check: age, gender, diagnosed condition (free text), current treatment (free text, optional).
- Free-text questions in "Ask about this trial".
- Discussion content: thread title (optional) and message; replies.
- Actions: save/unsave a trial, join/leave a group.

## Data stored by the application
- `Trial(id, title, disease, phase, city, country, status, short_description, full_description, inclusion_criteria, exclusion_criteria, centers, contact_name, contact_email, contact_phone)`
- `SupportGroup(id, name, disease, description, color)`
- `Discussion(id, group_id, author_id, title, content, tags, summary, created_at)`
- `Reply(id, discussion_id, author_id, content, created_at)`
- `User(id, display_name, age, city, interests, created_at)`
- `SavedTrial(id, user_id, trial_id, created_at)` — unique on `(user_id, trial_id)`
- `GroupMembership(id, user_id, group_id, created_at)` — unique on `(user_id, group_id)`
- `ProtocolChunk(id, trial_id, section, text, embedding)` — feeds RAG; `embedding` stored as JSON

*Fields such as `inclusion_criteria`, `exclusion_criteria`, `tags`, `interests`, and `centers` are stored as JSON strings in text columns rather than separate join tables — a deliberate simplification for the MVP that stays extensible.*

The canonical disease set (shared by trials and communities) is exactly five: **Breast Cancer, Type 2 Diabetes, Rheumatoid Arthritis, Crohn's Disease, Multiple Sclerosis.**

## External data sources
- **Claude API** — all LLM features (single model, JSON output).
- **Local embedding model** (all-MiniLM via `@xenova/transformers`) — runs in-process; not an external service.
- **n8n → Gmail** — outbound email notifications *(SMTP fallback if Gmail OAuth is slow to set up — assumption to confirm)*.
- **Seed dataset** — 8–12 fictional-but-realistic trials, generated by Claude Code as a build task and reviewed *(assumption — confirm before building)*. No live clinical-trial registries in the MVP.

## Output format for the user
- Trial list as scrollable cards; trial detail as a full page.
- AI outputs rendered from validated JSON: plain-language criteria lists, a four-part trial summary, and the self-check result shown with a **confidence meter** (Likely/Possibly/Unlikely) plus matched criteria and gaps.
- Grounded Q&A answers as short text with a cited section and an informational-only note.
- Discussion boards and threads.
- Email notification (via n8n) for new matching trials.
- Conversational replies via the Telegram agent.

## Error states
- **Invalid user input:** inline validation with specific helper text (e.g. "Age, gender and condition are needed to run the check"); the action button stays disabled until required fields are filled; no server round-trip for obviously-incomplete input.
- **External API failure:** on a Claude/embedding timeout, rate limit, or malformed JSON (after one retry), the affected feature shows a calm inline message — "The assistant couldn't complete this right now. Please try again in a moment." — and the rest of the app keeps working. Browsing and community features never depend on an AI call, so an AI outage degrades one panel, not the app.
- **Empty state (no data):** friendly, directive copy with a clear next action, never a blank screen (e.g. "No discussions yet. Be the first to introduce yourself or ask a question." + a button).
- **Slow loading:** inline spinner with an honest label on the specific control ("Reading the study…", "Checking protocol…"); never a full-screen block, so the user can navigate away.
- **Offline (PWA):** a top banner "You're offline — showing saved data"; AI/search buttons show "Unavailable offline"; cached saved trials, profile, and joined groups remain readable.

## Smart features (LLM via API)

All four features use one Claude model, return **strict JSON validated on the server before it reaches the UI**, retry once on malformed JSON then show a fallback, and carry the informational-only framing.

### Smart feature 1: Eligibility self-check (core)
- **What it does:** compares the user's answers against a trial's criteria and returns an informational eligibility estimate.
- **Input:** the trial's inclusion/exclusion text (from the DB) + user answers: age, gender, diagnosed condition, current treatment (optional). Age, gender, and condition are required.
- **Output:** JSON `{ verdict: "likely"|"possibly"|"unlikely", headline: string, matches: string[], gaps: string[], note: string }`.
- **Where it lives:** AI Assistant tab (eligibility segment); also reachable via "Check my eligibility" on Trial Detail.
- **Model and why:** single Claude model — strong enough for careful medical-text reasoning; one model keeps configuration simple.
- **Prompt strategy:** system prompt enforcing JSON-only output, never medical advice, and defaulting to `"possibly"` when key information is missing (never guessing). Structured JSON output; no few-shot needed.
- **Failure handling:** timeout/rate-limit → inline retry message; malformed JSON → one retry then fallback; the feature never blocks the rest of the app.
- **Human in the loop:** advisory only — shown with the informational-only disclaimer; never writes to the DB or makes a decision.

### Smart feature 2: Plain-language criteria
- **What it does:** rewrites inclusion/exclusion criteria into plain language.
- **Input:** a trial's inclusion/exclusion text.
- **Output:** JSON `{ canJoin: string[], cannotJoin: string[] }`.
- **Where it lives:** Trial Detail screen.
- **Model and why:** single Claude model; JSON output.
- **Prompt strategy:** system prompt for plain, non-technical language; JSON-only.
- **Failure handling:** retry once, then fallback message; read-only feature.
- **Human in the loop:** shown raw with disclaimer; read-only.

### Smart feature 3: Trial summary
- **What it does:** produces a short plain-language overview of a trial.
- **Input:** the trial's full description.
- **Output:** JSON `{ purpose, targetPatients, benefits, requirements }` — four short strings; benefits phrased non-promissory.
- **Where it lives:** Trial Detail screen.
- **Model and why:** single Claude model; JSON output.
- **Prompt strategy:** system prompt for concise, cautious, plain summaries; JSON-only.
- **Failure handling:** retry once, then fallback; read-only.
- **Human in the loop:** shown raw with disclaimer; read-only.

### Smart feature 4: Discussion post enhancement (optional)
- **What it does:** suggests a title, summary, and tags and offers an improved draft of a discussion post.
- **Input:** the user's draft (optional title + message) and the community name.
- **Output:** JSON `{ title, improvedContent, tags: string[], summary }`.
- **Where it lives:** the "start a discussion" bottom sheet.
- **Model and why:** single Claude model; JSON output.
- **Prompt strategy:** system prompt to polish grammar/readability without changing meaning or first-person voice; JSON-only.
- **Failure handling:** if the AI call fails, the user can still "publish as-is"; the community never depends on this feature.
- **Human in the loop:** strong — the original and improved versions are shown side by side; the user picks/edits before publishing; the original is never changed without confirmation.

## AI workflow (n8n)

**Goal of the workflow:** when a new trial matching a user's interests is added, automatically email that user a patient-friendly summary — a one-way system notification that reaches patients where they expect important clinical updates (email).

**Trigger:** Webhook from the app (the backend calls it after a new trial is inserted; payload includes `trial_id` and `disease`).

**Nodes, in order:**
1. **Webhook trigger** — receives `trial_id`, `disease`.
2. **HTTP request — fetch trial** — `GET /trials/:id`.
3. **HTTP request — fetch recipients** — `GET /users?interest={disease}`.
4. **AI node (Claude)** — generates a short patient-friendly summary of why the trial may matter (plain language, informational-only framing).
5. **Gmail node** — sends the summary by email to each matching user *(SMTP fallback if Gmail OAuth is slow — assumption to confirm)*.
6. **HTTP request — log** — `POST /notifications` to record the interaction.

**Connection to the app:** app → n8n (webhook in); n8n → app (fetch trial, fetch users, log back).

**Error handling:** an error branch logs the failure and continues; the workflow never crashes on an AI or email error.

**Runs:** on demand — triggered whenever a trial is added (fired manually in the demo via a seed script or a single webhook call; no admin UI).

**Optional second workflow (future extension):** a *saved-trial reminder* — a set time after a user saves a trial, n8n checks the trial is still open and emails an AI-drafted reminder. Fully designed, not required for the MVP.

## RAG assessment

**Verdict:** Recommended (minimal version).

**Reasoning:** Eligibility criteria are exactly the kind of dense, per-document text where users ask open-ended questions ("Can I join if I have hypertension?") that a structured form cannot anticipate. Grounding answers in the specific trial's text — rather than the model's general knowledge — is both safer and more accurate for a health app, so this is a genuine RAG use case, not a bolted-on one. It is kept deliberately minimal for the three-day window. *(Under time pressure this is the first feature to reduce — an acceptable MVP form is a small set of example questions.)*

**If implemented:**
- **Documents to index:** each trial's own structured text — description, inclusion criteria, exclusion criteria, additional information (no external documents, no PDFs).
- **Chunking:** small, section-aware chunks (split by section, size-bounded).
- **Embedding model:** local all-MiniLM via `@xenova/transformers`.
- **Vector store:** in-memory cosine-similarity index behind a `VectorStore` interface (upgradeable to pgvector/LanceDB/Chroma).
- **How retrieval enters the prompt:** the question is embedded, top-k chunks for that specific trial are retrieved and inserted into the prompt; Claude answers using only that context, cites the section, and appends the informational-only note.

## MCP assessment

**Verdict:** Recommended (minimal version).

**Reasoning:** ClinicalMatch is a data hub with clean, discrete verbs (search, get details, ask-protocol, save, list saved), which is the profile of an app worth exposing to an AI assistant — usable from Claude Desktop without building UI. It also provides the shared tool layer the autonomous agent reuses, so it is not wasted effort. **Honest caveat:** for an MVP whose end-user value is its mobile UI, MCP delivers the least *direct* user benefit of the three advanced building blocks — its real payoff is enabling the agent and future integrations. It is included because it is a project requirement and because it underpins the agent.

**If implemented — tools the MCP server would expose:**
- `search_trials` — find trials by condition, city, or status.
- `get_trial_details` — return full details for a specific trial.
- `ask_trial_protocol` — answer a grounded question about a trial (routes through RAG).
- `save_trial` — save a trial to a user's profile.
- `list_saved_trials` — return a user's saved trials.

The MVP uses the stdio transport. Because stdio assumes the client launches the server as a local subprocess, the demo runs the MCP server locally via Claude Desktop while it calls the **deployed VPS API** over HTTPS — so the tools operate on live data even though the MCP process is driven from the laptop. This is a documented, accepted limitation. *(assumption — confirm before building)*

## Autonomous agent assessment

**Verdict:** Recommended (minimal version) — conversational only.

**Reasoning:** Patients messaging natural-language queries from a chat app is a legitimate mobile-first access path, and the agent ties the LLM, MCP, and RAG together into one visible artifact. It reuses the MCP tools and RAG rather than reimplementing them and keeps short-term conversation context, so follow-up questions work. It is strictly a **conversational assistant and is separate from notifications** — one-way alerts are handled by the n8n email workflow (email suits one-way clinical updates; a chat agent suits interactive queries). The agent depends on the MCP tools and RAG working, so it is built last.

**If implemented — what you'd control from a chat app (Telegram):**
- "Find diabetes clinical trials near Warsaw." — searches trials (via `search_trials`).
- "Can I join this study if I have hypertension?" — answers a grounded protocol question (routes to RAG / `ask_trial_protocol`).
- "Join the Type 2 Diabetes community." — joins a support group. *(The one capability to cut first if the tool-use loop gets tight; search and RAG-Q&A are the non-negotiable core.)*

## Feature specifications

### Feature 1: Clinical trial discovery & save
- **Description:** the user browses the seeded trial catalogue, searches by keyword, filters by disease, and saves trials to their profile.
- **Input:** search text (free text, optional); disease filter (one of five diseases or "all"); a save action carrying `trial_id` + `x-user-id`.
- **Output:** a scrollable list of trial cards (title, disease, city, phase, status, short description); a saved/unsaved state per card; saved trials appear in Profile and are cached for offline.
- **Where it's used:** Clinical Trials tab (list + search/filter); save also on Trial Detail and reflected in Profile.
- **Dependencies:** SQLite (`Trial`, `SavedTrial`); the seed dataset; device identity. No LLM dependency — browsing works even if AI is down.
- **Edge cases:**
  - Empty input: empty search returns the full list; "all" is the default filter.
  - Wrong format: unknown disease filter falls back to "all"; a save with a missing/invalid `trial_id` returns 400 and the UI ignores it.
  - External service down: N/A — no external dependency, by design.
  - Duplicate data: saving an already-saved trial is idempotent (`SavedTrial` unique on `user_id + trial_id`); toggling again un-saves.

### Feature 2: Trial detail + AI comprehension (summary & plain-language criteria)
- **Description:** a full study page that also offers an AI summary and a plain-language rewrite of the eligibility criteria.
- **Input:** a `trial_id`; user taps to generate the summary and/or the plain-language criteria.
- **Output:** the study page (description, centres, contact, status) plus, on request, a four-part AI summary and plain-language "can join / cannot join" lists (from validated JSON).
- **Where it's used:** Trial Detail screen (pushed from the trial list, Home, or Profile).
- **Dependencies:** SQLite (`Trial`); Claude API for the two AI panels.
- **Edge cases:**
  - Empty input: N/A — a trial always has stored text; if a field is missing, the section is hidden rather than shown empty.
  - Wrong format: an invalid `trial_id` shows a "trial not found" state.
  - External service down: the AI panels show the calm retry message; the rest of the page (description, contact, save) still works.
  - Duplicate data: N/A — read-only display; regenerating simply replaces the shown result.

### Feature 3: AI eligibility self-check (core)
- **Description:** the user answers four short questions and receives an informational Likely/Possibly/Unlikely estimate for a chosen trial.
- **Input:** selected trial; age (required), gender (required), diagnosed condition (required, free text), current treatment (optional, free text) + `x-user-id`.
- **Output:** a confidence-meter result with headline, matched criteria, gaps, and an informational-only note (from validated JSON).
- **Where it's used:** AI Assistant tab (eligibility segment); entry point from Trial Detail.
- **Dependencies:** SQLite (`Trial`); Claude API.
- **Edge cases:**
  - Empty input: the button stays disabled and helper text names the missing required fields; no request is sent.
  - Wrong format: non-numeric age is stripped/validated client-side; free-text fields accepted as-is.
  - External service down: retry-once then a friendly fallback; result is never fabricated.
  - Duplicate data: N/A — the result is advisory and not stored; re-running replaces the previous result.

### Feature 4: Support communities (discussion boards + optional AI polish)
- **Description:** disease-specific boards where users join, create threads, and reply; users can edit/delete their own posts; an optional AI helper polishes a draft before publishing.
- **Input:** join/leave a group; a new discussion (optional title + message); replies; edits/deletes on own posts; all carrying `x-user-id`.
- **Output:** community lists, threads, and replies with author name and date; optional AI suggestions shown alongside the original for accept/edit.
- **Where it's used:** Support tab → Board → Discussion thread (pushed); compose as a bottom sheet.
- **Dependencies:** SQLite (`SupportGroup`, `Discussion`, `Reply`, `GroupMembership`); Claude API for the optional polish only.
- **Edge cases:**
  - Empty input: cannot publish an empty message; empty boards show a friendly "be the first" state.
  - Wrong format: posting/replying without membership is rejected; editing/deleting another user's post is rejected (ownership checked by `x-user-id`).
  - External service down: if the AI polish fails, "publish as-is" still works — the board is never blocked by an AI call.
  - Duplicate data: joining a group twice is idempotent (`GroupMembership` unique on `user_id + group_id`).

### Feature 5: RAG-powered "Ask about this trial"
- **Description:** the user asks a free-text question about a specific trial and gets an answer grounded in that trial's own text.
- **Input:** a `trial_id` and a free-text question.
- **Output:** a short answer citing the relevant section, plus an informational-only note (from validated JSON).
- **Where it's used:** Trial Detail screen and the AI Assistant tab (Q&A segment).
- **Dependencies:** the RAG module (chunked trial text, local embeddings, in-memory vector store); Claude API.
- **Edge cases:**
  - Empty input: the ask button stays disabled until a question is typed.
  - Wrong format: over-long input is truncated; off-topic questions get "the protocol doesn't cover this" rather than a guess.
  - External service down: retry-once then a friendly fallback; no fabricated answer.
  - Duplicate data: N/A — read-only; asking again re-runs retrieval.

## Acceptance criteria / Definition of Done

The MVP is "done" when the full **golden-path demo** runs end to end, giving every required technology at least one clear, demonstrable success path:

- [ ] **PWA / mobile-first** — the app is served over HTTPS from the VPS, installs on a real phone via "Add to Home Screen", and opens offline showing cached saved trials, profile, and joined groups.
- [ ] **Discovery & data** — the user can browse, search, and filter the seeded catalogue, open a trial's detail page, and save/un-save a trial (persisted).
- [ ] **LLM smart feature (core)** — the eligibility self-check returns a validated Likely/Possibly/Unlikely result with the informational-only disclaimer, defaulting to "Possibly" when information is insufficient.
- [ ] **LLM smart features (supporting)** — plain-language criteria and the trial summary render from validated JSON; discussion polish suggests title/tags/summary with the original preserved (or "publish as-is" works if polish is cut).
- [ ] **Community** — the user can join a group, create a discussion, reply, and edit/delete their own posts.
- [ ] **RAG** — asking "Can I join if I have hypertension?" (or a comparable question) returns an answer grounded in that trial's text, citing the section. *(Reduced form — a small set of example questions — is acceptable.)*
- [ ] **MCP** — from Claude Desktop, the MCP tools can search trials, get details, and save a trial against the deployed API (local-client demo is an accepted limitation).
- [ ] **Autonomous agent** — the Telegram agent handles a trial search and a grounded protocol question (join-group if time allows).
- [ ] **n8n workflow** — adding a trial (manual trigger) produces an AI-summarised email to interested users and a logged interaction.
- [ ] **Safety** — every AI surface shows the informational-only framing; browsing and community features remain usable when AI calls fail.

**Non-negotiable floor if time runs short:** one working path through each of LLM, RAG, MCP, agent, and n8n, plus the PWA installed on a phone — and the safety framing everywhere. The documented cut order is: Home dashboard → AI discussion polish → RAG reduced to example questions → agent "join group" capability → optional second n8n workflow.

## Deployment & mobile-first architecture

The project follows the supervisor's recommended path: **JavaScript → React → Progressive Web App → VPS deployment → installable on Android and iOS via "Add to Home Screen".** Building in TypeScript/React and packaging as a PWA yields one codebase that runs in any modern mobile/desktop browser and installs like a native app — without native builds or app-store review inside the three-day window. HTTPS on the VPS is what makes the PWA installable, satisfying "runs on a real mobile phone". The same codebase stays ready for future native packaging via Capacitor.

**What runs where:**
- **On the VPS (behind HTTPS via Caddy/Nginx):** the PWA (static build), the Express API, SQLite, n8n, and the Telegram agent (long-running process, e.g. `pm2`/systemd).
- **Documented exception — MCP:** the stdio MCP server is demonstrated from Claude Desktop on the laptop, calling the deployed VPS API, so all data and logic stay on the server while avoiding a network MCP transport. Accepted as a known limitation.

## Open questions / assumptions to confirm
- Device-based anonymous identity (`x-user-id`), no login, no account recovery. *(assumption)*
- Exact Claude model id for all AI features (a Claude Sonnet model assumed). *(assumption)*
- Seed dataset (8–12 fictional trials across the five diseases) generated by Claude Code and reviewed. *(assumption)*
- Gmail delivery in n8n; SMTP fallback if OAuth setup is slow. *(assumption)*
- MCP demonstrated locally via Claude Desktop against the deployed API. *(accepted limitation)*
- Repository structure (`frontend/`, `backend/`, `n8n/`, `deploy/`). *(assumption)*
- Colour palette, typography, and the "unlikely = grey, not red" safety-UX choice. *(confirmed)*
- Five canonical diseases: Breast Cancer, Type 2 Diabetes, Rheumatoid Arthritis, Crohn's Disease, Multiple Sclerosis. *(confirmed)*
