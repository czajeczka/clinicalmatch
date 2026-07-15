-- ClinicalMatch schema. JSON-heavy fields are stored as TEXT holding JSON
-- strings (a deliberate MVP simplification, per the brief). All statements are
-- idempotent so migrate can run repeatedly.

CREATE TABLE IF NOT EXISTS trials (
  id                 TEXT PRIMARY KEY,
  title              TEXT NOT NULL,
  disease            TEXT NOT NULL,
  phase              TEXT NOT NULL,
  city               TEXT NOT NULL,
  country            TEXT NOT NULL,
  status             TEXT NOT NULL,
  short_description  TEXT NOT NULL,
  full_description   TEXT NOT NULL,
  inclusion_criteria TEXT NOT NULL, -- json: string[]
  exclusion_criteria TEXT NOT NULL, -- json: string[]
  centers            TEXT NOT NULL, -- json: { name, city, country }[]
  contact_name       TEXT NOT NULL,
  contact_email      TEXT NOT NULL,
  contact_phone      TEXT NOT NULL,
  -- Extended CTIS fields (comprehensive-platform expansion).
  sponsor_id         INTEGER,       -- FK -> sponsors(id) (normalised, deduped)
  therapeutic_area   TEXT,
  medical_condition  TEXT,
  intervention       TEXT,
  age_range          TEXT,
  age_min            INTEGER,       -- parsed from CTIS age groups (for filtering)
  age_max            INTEGER,
  gender             TEXT,
  source_id          TEXT,          -- CTIS ctNumber
  source_url         TEXT           -- public CTIS trial page
);

-- Normalised sponsor names (deduped; referenced by trials.sponsor_id).
CREATE TABLE IF NOT EXISTS sponsors (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- A trial runs in one or more countries (many-to-many); powers country filters
-- across every recruiting country, not just the lead one on trials.country.
CREATE TABLE IF NOT EXISTS trial_countries (
  trial_id TEXT NOT NULL,
  country  TEXT NOT NULL,
  PRIMARY KEY (trial_id, country)
);

-- Single-row scheduler / synchronisation control state.
CREATE TABLE IF NOT EXISTS sync_state (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  paused         INTEGER NOT NULL DEFAULT 0,
  running        INTEGER NOT NULL DEFAULT 0,
  interval_hours INTEGER NOT NULL DEFAULT 24,
  last_run_at    TEXT,
  next_run_at    TEXT
);

CREATE TABLE IF NOT EXISTS support_groups (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  disease      TEXT NOT NULL,
  description  TEXT NOT NULL,
  color        TEXT NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  age          INTEGER,
  city         TEXT,
  interests    TEXT NOT NULL DEFAULT '[]', -- json: Disease[]
  created_at   TEXT NOT NULL,
  email        TEXT,
  role         TEXT NOT NULL DEFAULT 'user' -- 'user' | 'admin'
);

CREATE TABLE IF NOT EXISTS discussions (
  id          TEXT PRIMARY KEY,
  group_id    TEXT NOT NULL,
  author_id   TEXT NOT NULL,
  author_name TEXT NOT NULL,
  title       TEXT,
  content     TEXT NOT NULL,
  tags        TEXT NOT NULL DEFAULT '[]', -- json: string[]
  summary     TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS replies (
  id            TEXT PRIMARY KEY,
  discussion_id TEXT NOT NULL,
  author_id     TEXT NOT NULL,
  author_name   TEXT NOT NULL,
  content       TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_trials (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  trial_id   TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, trial_id)
);

CREATE TABLE IF NOT EXISTS group_memberships (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  group_id   TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, group_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  trial_id   TEXT,
  created_at TEXT NOT NULL,
  read       INTEGER NOT NULL DEFAULT 0 -- 0 | 1
);

-- Synchronisation with external trial registries (CTIS). One row per import
-- run for observability; per-trial provenance lives in trial_sync_meta.
CREATE TABLE IF NOT EXISTS sync_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  source          TEXT NOT NULL DEFAULT 'ctis',
  mode            TEXT NOT NULL,               -- 'full' | 'incremental'
  status          TEXT NOT NULL,               -- 'success' | 'partial' | 'error'
  trials_seen     INTEGER NOT NULL DEFAULT 0,
  trials_imported INTEGER NOT NULL DEFAULT 0,
  trials_updated  INTEGER NOT NULL DEFAULT 0,
  trials_skipped  INTEGER NOT NULL DEFAULT 0,
  trials_failed   INTEGER NOT NULL DEFAULT 0,
  duration_ms     INTEGER NOT NULL DEFAULT 0,
  message         TEXT,
  started_at      TEXT NOT NULL,
  finished_at     TEXT NOT NULL
);

-- Per-trial provenance + richer CTIS fields kept for future AI/RAG use. These
-- are internal (NOT returned by the trial API), so the frontend is unaffected.
CREATE TABLE IF NOT EXISTS trial_sync_meta (
  trial_id            TEXT PRIMARY KEY,
  source              TEXT NOT NULL DEFAULT 'ctis',
  source_id           TEXT,                     -- CTIS ctNumber
  source_url          TEXT,                     -- public CTIS trial page
  sponsor             TEXT,
  recruitment_status  TEXT,                     -- raw CTIS status text
  countries           TEXT,                     -- json: string[]
  ctis_last_updated   TEXT,                     -- CTIS "lastUpdated" for incremental diffing
  imported_at         TEXT NOT NULL
);

-- TODO: RAG (later seminar) — a protocol_chunks/embeddings table lives here
-- when the RAG seminar arrives. Intentionally not created now.

CREATE INDEX IF NOT EXISTS idx_trials_disease ON trials (disease);
CREATE INDEX IF NOT EXISTS idx_trials_status ON trials (status);
CREATE INDEX IF NOT EXISTS idx_trials_city ON trials (city);
CREATE INDEX IF NOT EXISTS idx_trials_country ON trials (country);
CREATE INDEX IF NOT EXISTS idx_trials_phase ON trials (phase);
-- idx_trials_sponsor (on sponsor_id) is created in applySchema AFTER the column
-- migration, since sponsor_id may not exist on pre-existing trials tables yet.
CREATE INDEX IF NOT EXISTS idx_trial_countries_country ON trial_countries (country);
CREATE INDEX IF NOT EXISTS idx_sync_logs_finished ON sync_logs (finished_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_group ON discussions (group_id);
CREATE INDEX IF NOT EXISTS idx_replies_discussion ON replies (discussion_id);
CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_trials (user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON group_memberships (user_id);
