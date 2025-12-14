-- Show mapping (AniList → Trakt)
CREATE TABLE IF NOT EXISTS show_map (
  anilist_id INTEGER PRIMARY KEY,
  trakt_id INTEGER NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
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
  updated_at TIMESTAMP DEFAULT NOW()
);
