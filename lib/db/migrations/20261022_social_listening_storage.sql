-- Additive fallback for deployments that cannot initialize feature tables at runtime.
-- Run in the same database used by the application. Existing tables and records are retained.

CREATE TABLE IF NOT EXISTS public.social_mentions (
  id SERIAL PRIMARY KEY, summary TEXT NOT NULL, source TEXT, url TEXT,
  sentiment TEXT NOT NULL DEFAULT 'neutral', category TEXT NOT NULL DEFAULT 'candidate',
  topic TEXT, published_at TEXT, scanned_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.social_source_health (
  id SERIAL PRIMARY KEY, source_key TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL DEFAULT 'web_search', status TEXT NOT NULL DEFAULT 'unknown',
  last_attempt_at TIMESTAMP, last_success_at TIMESTAMP, last_item_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT, updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
