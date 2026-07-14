# ClinicalMatch — Frontend Assignment

**Audience:** the frontend engineer building the UI.
**Scope:** UI only. This phase runs on **mock data**; every backend call is
marked `TODO: connect to API` with the mock shape to use meanwhile. Nothing here
describes backend internals.

**Golden rule (design constraint, not a footnote):** every AI-generated result
is **informational only — never medical advice**. Show this framing on every AI
surface. The "unlikely" eligibility verdict is deliberately **neutral grey, not
red**, so an estimate never reads as a scary verdict.

---

## Overview
ClinicalMatch is a mobile-first, installable PWA for patients (and the carers
searching on their behalf) living with one of five conditions — Breast Cancer,
Type 2 Diabetes, Rheumatoid Arthritis, Crohn's Disease, Multiple Sclerosis. It
carries them through one journey: **discover** European clinical trials,
**understand** each trial's eligibility in plain language plus an informational
Likely/Possibly/Unlikely self-check, and **belong** via disease-specific
discussion boards. The experience is warm, plain-spoken, and reassuring — never
clinical or alarmist — and stays fully usable when AI features are unavailable.

---

## Screens and pages

The app is a five-tab shell. **Home · Clinical Trials · Support · AI Assistant ·
Profile** are tabs; **Trial Detail, Board, Discussion Thread** are pushed on top
of a tab with a back button while the tab bar stays visible. **Onboarding** is a
first-run flow with no tab bar. Creating a discussion opens as a bottom sheet.

### 0. Onboarding (first run only)
- **Purpose:** create a device-based identity and personalise the app. No
  login, no password.
- **Layout:** full-screen, no tab bar. Logo + one-line welcome. A short 3–4 step
  form: **display name** (text), **age** (number), **city** (text), **disease
  interests** (multi-select chips of the five diseases). A progress indicator and
  a "Get started" primary button on the last step; "Skip for now" is available.
- **Primary actions:** fill fields → **Get started** (persists identity, routes
  to Home).

### 1. Home (dashboard)
- **Purpose:** personalised landing — matching trials, quick actions, entry to
  notifications. *(Built last; first to simplify if time is short.)*
- **Layout:** header with greeting ("Hello, {name}") + notifications bell.
  Sections: **Trials matching your interests** (horizontal scroll of trial
  cards), **Quick actions** (tiles: Search trials, Run a self-check, Your
  communities), **Recent activity / notifications** (list). Empty-friendly if a
  section has no data.
- **Primary actions:** tap a trial card → Trial Detail; tap a quick action →
  target screen; tap bell → notifications list.

### 2. Clinical Trials (search & discovery)
- **Purpose:** browse, keyword-search, and filter the trial catalogue.
- **Layout:** header title + **search input** (debounced). Below it a **disease
  filter** as a horizontal row of chips: *All · Breast Cancer · Type 2 Diabetes ·
  Rheumatoid Arthritis · Crohn's Disease · Multiple Sclerosis*. Then a scrollable
  vertical list of **trial cards** (title, disease pill, city, phase, status
  badge, short description, save toggle).
- **Primary actions:** type to search; tap a chip to filter; tap **save** on a
  card (toggles); tap a card → Trial Detail.

### 3. Trial Detail (pushed)
- **Purpose:** full study page plus AI comprehension tools.
- **Layout:** back button + trial title. **Status/phase/location** row. **Save**
  button. Body sections: **Summary** (with an "Explain simply" action producing a
  four-part AI summary), **Eligibility** (raw criteria + an "Explain simply"
  action → plain-language "You may join if… / This may rule you out…" lists),
  **Ask about this trial** (free-text input + answer area, RAG), **Participating
  centres** (list), **Contact** (name, email, phone). A sticky bottom bar with
  **Check my eligibility** (opens the self-check for this trial).
- **AI surfaces** (Summary, Plain-language criteria, Ask): each shows an
  inline loading label, an informational-only note under the result, and a calm
  retry message on failure. Hide a section entirely if its source field is empty
  rather than showing a blank block.
- **Primary actions:** Save; Explain simply (summary); Explain simply
  (criteria); Ask a question; Check my eligibility.

### 4. AI Assistant
- **Purpose:** two AI tools in one tab. A segmented control switches between:
  - **Eligibility self-check (core):** pick a trial (selector), then four short
    inputs — **age** (required), **gender** (required, select), **diagnosed
    condition** (required, free text), **current treatment** (optional, free
    text). A **Run check** button (disabled until required fields are filled).
    Result renders as a **confidence meter** (Likely / Possibly / Unlikely) with a
    headline, **matched criteria** list, **gaps** list, and the informational-only
    note.
  - **Ask about a trial (grounded Q&A):** trial selector + free-text question →
    short answer with a cited section + informational-only note.
- **Layout:** header + segmented control + the active tool's form and result.
- **Primary actions:** Run check; Ask.

### 5. Support (communities list)
- **Purpose:** browse and join disease-specific communities.
- **Layout:** header + list of **community cards** (name, disease colour accent,
  short description, member count, **Join/Joined** toggle).
- **Primary actions:** Join/Leave; tap a card → Board.

### 6. Board (pushed)
- **Purpose:** the discussions inside one community.
- **Layout:** back button + community name + description. A list of **discussion
  cards** (title or first line, author name, date, reply count, tags). A floating
  **+ New discussion** button that opens the compose bottom sheet.
- **Primary actions:** tap a discussion → Thread; **+ New discussion**.

### 7. Discussion Thread (pushed)
- **Purpose:** one discussion and its replies.
- **Layout:** back button; the original post (author, date, title, content,
  tags); a list of **replies** (author, date, content); a **reply input** pinned
  at the bottom. Own posts show **edit/delete** affordances.
- **Primary actions:** post a reply; edit/delete own post or reply.

### 8. Compose discussion (bottom sheet)
- **Purpose:** create a new discussion, optionally polished by AI.
- **Layout:** sheet with optional **title** + **message** fields, a **Enhance
  with AI** button, and **Publish**. When enhancement runs, show the AI
  suggestion (title, improved draft, tags, summary) **side by side with the
  original**; the user accepts, edits, or ignores. "Publish as-is" always works.
- **Primary actions:** Enhance with AI; Publish (as-is or enhanced).

### 9. Profile
- **Purpose:** the user's saved trials, joined groups, stats, settings.
- **Layout:** header with display name + a small stats row (saved count, groups
  count). Sections: **Saved trials** (cards, available offline), **Your
  communities** (list), **Settings** (display name/interests editor,
  offline/notification toggles).
- **Primary actions:** open a saved trial; leave a group; edit profile.

---

## Navigation and user flows

**Structure:** persistent five-tab bottom bar. Detail screens push over the
active tab (back button returns to it); the tab bar stays visible. Compose opens
as a bottom sheet over the current screen. Onboarding is a gated first-run flow.

**Flow A — Discover & save a trial**
1. Open **Clinical Trials**.
2. Type a keyword and/or tap a disease chip; the list filters.
3. Tap a card → **Trial Detail**.
4. Tap **Save** (card/detail reflects saved state; also appears in Profile).

**Flow B — Understand & self-check (core)**
1. On **Trial Detail**, tap **Explain simply** on Eligibility → plain-language
   can/can't-join lists appear.
2. Tap **Check my eligibility** → self-check pre-loaded with this trial.
3. Enter age, gender, condition (+ optional treatment) → **Run check**.
4. Read the **Likely/Possibly/Unlikely** meter with matches, gaps, and the
   informational-only note.

**Flow C — Ask a grounded question**
1. On **Trial Detail** (or AI Assistant → Ask), type a question e.g. "Can I join
   if I have hypertension?"
2. Tap **Ask** → short answer with the cited section + informational-only note.

**Flow D — Belong (join & post)**
1. Open **Support** → tap **Join** on a community.
2. Tap the community → **Board** → **+ New discussion**.
3. Write a post, optionally **Enhance with AI** (accept/edit), then **Publish**.
4. Open the thread and reply; edit/delete your own posts.

---

## Visual design

Palette and type are **taken from the brief** (confirmed). Where the brief is
silent (states, borders, dark mode) a modern, clean, accessible system is
**proposed** and labelled as such.

### Colour palette (from brief)
| Token | Hex | Use |
|---|---|---|
| `--primary` | `#0C6B60` | deep teal — trust, primary brand |
| `--secondary` | `#6E74C9` | periwinkle — community/human side |
| `--accent` | `#1E9E7E` | spring green — CTAs |
| `--bg` | `#EDF2F0` | cool pale sage — app background (not stark white) |
| `--text` | `#12312C` | deep pine — body text |
| Verdict · likely | `#1E9E7E` | green |
| Verdict · possibly | `#C98A2B` | amber |
| Verdict · unlikely | `#8A8F8C` | **neutral grey — intentionally not red** |

**Proposed supporting tokens** (not in brief, chosen for contrast/state work):
surface/card `#FFFFFF`; subtle border `#D6E0DC`; muted text `#5A6B65`;
success `#1E9E7E`; warning `#C98A2B`; error `#B4453C` (used only for genuine
input/system errors — **never** for the "unlikely" verdict); focus ring
`#6E74C9`.

### Typography (from brief)
- **Fraunces** — headings/display. **Inter** — body/UI. **IBM Plex Mono** —
  labels, data, badges (e.g. phase, IDs, stats).
- **Scale (proposed):** Display 32/40 · H1 28/36 · H2 22/30 · H3 18/26 ·
  Body 16/24 · Small 14/20 · Caption/mono 12/16. Weights: 600 headings, 400/500
  body.

### Spacing, radius, elevation (proposed)
- **Spacing:** 4px base scale — 4 · 8 · 12 · 16 · 24 · 32. Generous card padding
  (16–20). Screen gutter 16.
- **Radius:** cards/sheets 16, buttons/inputs 12, pills/chips 999 (full).
- **Elevation:** flat by default; cards use a soft shadow
  `0 1px 3px rgba(18,49,44,.08)`; bottom sheet a larger `0 -8px 24px
  rgba(18,49,44,.12)`. Rounded cards, generous spacing (brief).

### Light / dark
- **Light is primary** (the palette above). **Dark mode is proposed**: background
  `#0F1B18`, surface `#16241F`, text `#EAF1EE`, borders `#2A3A34`; keep
  primary/accent/verdict hues, nudged lighter to hold AA on dark. Drive both via
  CSS variables and `prefers-color-scheme`, overridable by a manual toggle.

---

## Components

Reusable inventory. Every interactive component defines **default / hover /
focus / active / disabled / loading** where applicable; focus is always a
visible ring (`--focus`, 2px, offset).

- **Button** — variants: primary (accent fill), secondary (teal outline), ghost
  (text), destructive (error, e.g. delete post). States incl. `loading`
  (spinner + label, disabled) and `disabled` (reduced opacity, no pointer).
- **Icon button** — for bell, back, save/heart, overflow menu.
- **Input / Textarea** — label, placeholder, helper text, error text; states:
  default, focus, error, disabled. Numeric input for age.
- **Select** — gender, trial selector; native-friendly, styled.
- **Chip / Filter chip** — disease filters and interest multi-select; states:
  unselected, selected, disabled.
- **Segmented control** — AI Assistant (self-check / ask), Profile subviews.
- **Trial card** — title, disease pill, city, phase (mono), status badge, short
  description, save toggle.
- **Community card** — name, disease colour accent, description, member count,
  Join/Joined toggle.
- **Discussion card** — title/first line, author, date, reply count, tags.
- **Status badge** — recruiting / not yet recruiting / closed (semantic colours).
- **Disease pill** — one consistent colour per disease across trials + groups.
- **Confidence meter** — three-stop meter (likely/possibly/unlikely) using the
  verdict colours; the label is the source of truth, colour is secondary
  (accessibility).
- **AI result panel** — wraps summary / criteria / answer output; always carries
  the **informational-only note** and a loading/error slot.
- **Disclaimer note** — small, calm, reusable "Informational only — not medical
  advice. Final eligibility is decided by the trial investigators."
- **Bottom navigation bar** — five tabs with icon + label; active state uses
  primary; stays visible on pushed screens.
- **Header / app bar** — title, optional back button, optional actions (bell).
- **Bottom sheet** — compose discussion; drag handle, scrollable content.
- **Modal / confirm dialog** — destructive confirmations (delete post).
- **Toast / inline alert** — success, info, error; auto-dismiss for success.
- **Empty state** — icon, headline, directive copy, primary action button.
- **Skeleton** — card / list / text-line placeholders for loading.
- **Spinner + label** — inline, control-scoped ("Reading the study…").
- **Offline banner** — top banner "You're offline — showing saved data".
- **Tag** — mono, small, for discussion tags.

---

## States

Every data-driven screen defines three states. **Loading uses skeletons**, not
full-screen blockers, so the user can still navigate.

| Screen | Empty | Loading | Error |
|---|---|---|---|
| Home | "Set your interests to see matching trials" + CTA to Profile | skeleton cards in each section | section-scoped inline retry; other sections still render |
| Clinical Trials | "No trials match your search" + Clear filters | skeleton trial cards | "Couldn't load trials" + Retry |
| Trial Detail | missing field → hide that section | skeleton for header + section spinners for AI panels | AI panel: calm retry ("The assistant couldn't complete this right now."); page core still works |
| AI Assistant · self-check | pre-run helper text; button disabled until required fields set | "Checking protocol…" spinner on the button | retry-once then friendly fallback; result never fabricated |
| AI Assistant · ask | ask disabled until a question typed | "Reading the study…" | retry-once then fallback; off-topic → "the protocol doesn't cover this" |
| Support | "No communities yet" (unlikely — seeded) | skeleton community cards | "Couldn't load communities" + Retry |
| Board | "No discussions yet. Be the first to introduce yourself." + New discussion | skeleton discussion cards | "Couldn't load this board" + Retry |
| Thread | "No replies yet — start the conversation." | skeleton replies | "Couldn't load this discussion" + Retry |
| Profile | "No saved trials yet — save one to see it here." / "You haven't joined any communities." | skeleton lists | cached data shown; banner if offline |

**Offline (PWA):** top banner "You're offline — showing saved data"; AI/search
controls show **"Unavailable offline"**; cached saved trials, profile, and
joined groups stay readable.

---

## Responsiveness

**Mobile-first.** Design at 360–414px width first; the bottom tab bar and pushed
detail screens are the native pattern.

- **Trial / community / discussion lists:** single column on mobile → 2 columns
  ≥600px → 3 columns ≥1024px.
- **Home horizontal scrollers** become full grids on wider screens.
- **Trial Detail:** stacked sections on mobile → two-column (content + a sticky
  contact/centres sidebar) ≥1024px; the "Check my eligibility" bar stays
  reachable.
- **Bottom nav** stays as a bottom bar on mobile; on ≥1024px it may become a left
  rail (proposed) — keep the same five destinations.
- **Bottom sheet (compose)** becomes a centered modal ≥768px.
- Content max-width ~720px for reading comfort on desktop; images/cards scale
  with `max-width:100%`.

---

## Accessibility (targets, not aspirations)

- **Contrast:** meet **WCAG 2.1 AA** — 4.5:1 for text, 3:1 for large text and UI
  boundaries. Verify accent/teal on the sage background and on white cards.
- **Colour is never the only signal:** the confidence meter and status badges
  always pair colour with a text label (critical for the verdict, where grey is
  intentional).
- **Focus:** every interactive element has a visible focus ring (`--focus`,
  never `outline:none` without a replacement).
- **Keyboard:** full operability — tab order follows reading order; sheets and
  modals trap focus and close on Esc; the bottom nav is reachable and
  arrow/tab-navigable.
- **Labels:** all inputs have associated `<label>`s; icon-only buttons (bell,
  save, back, overflow) have `aria-label`s; the save toggle announces its state.
- **Alt text / roles:** the logo and any meaningful graphics have text
  alternatives; decorative marks are `aria-hidden`. AI result panels use a live
  region so results are announced when they arrive.
- **Targets:** minimum 44×44px touch targets.
- **Motion:** respect `prefers-reduced-motion` for sheet/transition animations.

---

## Backend touchpoints

**This phase is mock-data only.** Wire the UI to a local mock layer (e.g. a
`mockApi` module or MSW handlers) so screens are fully interactive; mark each
real call site with `TODO: connect to API`. Shapes below match the brief's data
model closely enough to swap in the real API later without UI changes.

- **List / search / filter trials** — `TODO: connect to API`
  ```ts
  Trial = { id, title, disease, phase, city, country, status,
            short_description, full_description,
            inclusion_criteria: string[], exclusion_criteria: string[],
            centers: { name, city, country }[],
            contact_name, contact_email, contact_phone }
  // mock: array of 8–12 Trials across the five diseases
  ```
- **Get one trial** — `TODO: connect to API` → a single `Trial`.
- **Save / unsave trial** — `TODO: connect to API`
  ```ts
  // mock: toggle in local state; SavedTrial = { trial_id, saved_at }
  ```
- **AI: trial summary** — `TODO: connect to API`
  `{ purpose, targetPatients, benefits, requirements }` (four strings).
- **AI: plain-language criteria** — `TODO: connect to API`
  `{ canJoin: string[], cannotJoin: string[] }`.
- **AI: eligibility self-check (core)** — `TODO: connect to API`
  ```ts
  // input: { trial_id, age, gender, condition, treatment? }
  // output:
  { verdict: "likely"|"possibly"|"unlikely", headline: string,
    matches: string[], gaps: string[], note: string }
  // mock: return "possibly" when inputs are thin, to mirror real behaviour
  ```
- **AI: grounded Q&A (RAG)** — `TODO: connect to API`
  ```ts
  // input: { trial_id, question }
  // output: { answer: string, citedSection: string, note: string }
  ```
- **AI: discussion enhancement (optional)** — `TODO: connect to API`
  `{ title, improvedContent, tags: string[], summary }`.
- **Communities: list / join / leave** — `TODO: connect to API`
  ```ts
  SupportGroup = { id, name, disease, description, color, member_count }
  // join/leave: toggle membership in local state (idempotent)
  ```
- **Discussions & replies: list / create / edit / delete** — `TODO: connect to API`
  ```ts
  Discussion = { id, group_id, author_id, author_name, title?, content,
                 tags: string[], summary?, created_at, reply_count }
  Reply      = { id, discussion_id, author_id, author_name, content, created_at }
  // ownership: only author_id === current userId may edit/delete
  ```
- **Identity (device-based, no login)** — `TODO: connect to API`
  ```ts
  User = { id, display_name, age, city, interests: string[], created_at }
  // mock: generate/persist a userId locally; send as x-user-id later
  ```
- **Notifications (Home/bell)** — `TODO: connect to API`
  ```ts
  Notification = { id, title, body, trial_id?, created_at, read: boolean }
  // mock: a small static list
  ```

**Canonical disease set** (shared by trials, filters, communities, interests):
Breast Cancer · Type 2 Diabetes · Rheumatoid Arthritis · Crohn's Disease ·
Multiple Sclerosis.
