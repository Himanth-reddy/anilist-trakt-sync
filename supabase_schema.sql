-- Show mapping (AniList → Trakt)
CREATE TABLE IF NOT EXISTS show_map (
  anilist_id INTEGER PRIMARY KEY,
  trakt_id INTEGER NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Canonical episode mapping (Trakt authoritative)
CREATE TABLE IF NOT EXISTS episode_map (
  trakt_id INTEGER NOT NULL,
  abs INTEGER NOT NULL,
  season INTEGER NOT NULL,
  episode INTEGER NOT NULL,
  PRIMARY KEY (trakt_id, abs)
);

-- Manual overrides (always win)
CREATE TABLE IF NOT EXISTS episode_override (
  trakt_id INTEGER NOT NULL,
  abs INTEGER NOT NULL,
  season INTEGER NOT NULL,
  episode INTEGER NOT NULL,
  PRIMARY KEY (trakt_id, abs)
);

-- Progress tracking
CREATE TABLE IF NOT EXISTS sync_progress (
  anilist_id INTEGER PRIMARY KEY,
  last_abs INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System config / key-value storage (tokens, cache, status)
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mappings (AniList -> external IDs)
CREATE TABLE IF NOT EXISTS mappings (
  anilist_id INTEGER PRIMARY KEY,
  trakt_id INTEGER,
  tmdb_id INTEGER,
  imdb_id TEXT,
  tvdb_id INTEGER,
  type TEXT,
  is_manual BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs
CREATE TABLE IF NOT EXISTS logs (
  id BIGSERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  level TEXT DEFAULT 'info',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
