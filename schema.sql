-- AI Roundtable — D1 schema
-- The Worker uses kv for auth/admin/config documents and discussions for
-- public History metadata. Full discussion details live in R2.
-- Keys are namespaced: user:<id>, useremail:<email>, sess:<token>,
--   provider:<id>, model:<id>, usage:<id>, audit:<id>
CREATE TABLE IF NOT EXISTS kv (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_kv_prefix ON kv (k);

CREATE TABLE IF NOT EXISTS discussions (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  question TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'vote',
  answer_type TEXT NOT NULL DEFAULT 'open',
  category TEXT NOT NULL DEFAULT 'Other',
  lang TEXT NOT NULL DEFAULT 'en',
  source TEXT NOT NULL DEFAULT 'user_public',
  status TEXT NOT NULL DEFAULT 'published',
  author_id TEXT NOT NULL DEFAULT '',
  model_count INTEGER NOT NULL DEFAULT 0,
  model_names_json TEXT NOT NULL DEFAULT '[]',
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  published_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT 0,
  detail_r2_key TEXT NOT NULL,
  vote_stats_json TEXT NOT NULL DEFAULT 'null',
  votes_json TEXT NOT NULL DEFAULT '[]',
  imported INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_discussions_status_published ON discussions (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_status_hot ON discussions (status, upvotes DESC, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_category ON discussions (category, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_mode ON discussions (mode, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_lang ON discussions (lang, status, published_at DESC);
