# Feature Reference

This document reflects the current implemented behavior.

## 1) Sync modes

### 1.1 Incremental full sync (`GET /api/full-sync`)

- Reads AniList list activities (`watched episode`) newer than `lastSyncTimestamp`.
- Resolves AniList IDs to Trakt IDs.
- Maps AniList absolute episode numbers to Trakt season/episode.
- Applies episode-level overrides from `episode_override` when present.
- Uses `sync_progress` to skip already synced episodes.
- Posts grouped history payloads to Trakt.

### 1.2 Completed library sync (`GET ...?preview=1`, `POST /api/completed-sync`)

- Pulls AniList `COMPLETED` entries.
- Supports preview before execution.
- Syncs only episode range above `sync_progress.last_abs`.
- Uses AniList completion date when available.
- Updates `sync_progress` and completed status timestamps.

### 1.3 Watching library sync (`GET ...?preview=1`, `POST /api/watching-sync`)

- Pulls AniList `CURRENT` entries.
- Supports preview before execution.
- Syncs only episode range above `sync_progress.last_abs`.
- Uses current timestamp for watch date.
- Updates `sync_progress` and watching status timestamps.

### 1.4 Single show sync (`GET /api/sync?anilistId=<id>`)

- Resolves show mapping.
- Fetches Trakt seasons/episodes.
- Stores normalized episode data in `system_config`.

## 2) ID resolution and mapping

### 2.1 Resolution priority

1. Existing `mappings` row.
2. Otaku cache (`cache:otaku`) including direct `trakt_id`.
3. Fribbs cache (`cache:fribbs`) fallback.
4. TMDB external IDs + Trakt external search (`tmdb`, `imdb`, `tvdb`).

### 2.2 Cache refresh

- `/api/refresh-otaku` refreshes Otaku DB-derived cache.
- `/api/refresh-fribbs` refreshes Fribbs JSON-derived cache.

### 2.3 Manual mapping

- `/api/manual-map` upserts manual mappings.
- `/api/mappings` returns manual and auto mapping groups.

## 3) Progress, dedupe, and overrides

- `sync_progress` tracks highest synced absolute episode per AniList show.
- Full/completed/watching syncs all use `sync_progress` before posting.
- `episode_override` overrides default episode mapping by `(trakt_id, abs)`.

## 4) Trakt auth and token flow

- `/api/trakt-auth` `GET` returns OAuth URL.
- `/api/trakt-auth` `POST` exchanges auth code and stores tokens.
- Runtime token strategy:
- Reads token from `system_config` first.
- Falls back to environment variables.
- On 401 from Trakt, attempts token refresh and retries once.

## 5) UI features

### 5.1 Dashboard (`/`)

- Otaku cache status + refresh.
- Fribbs cache status + refresh.
- Sync status timestamps (manual/automated/completed/watching).
- Sync progress table powered by `/api/progress`.

### 5.2 Sync page (`/sync`)

- Single-show sync trigger.
- Full sync trigger.
- Completed/watching preview and execution flow.
- Trakt auth helper.

### 5.3 Logs page (`/logs`)

- Polls every 5 seconds.
- Uses cache-busting and `no-store` server headers.
- Renders readable local timestamps with timezone.

### 5.4 Mappings and manual pages

- `/mappings`: shows manual and automatic mappings.
- `/manual`: writes manual mapping rows.

## 6) Scheduling

- Vercel cron (from `vercel.json`) calls `/api/cron` every 6 hours.
- `/api/cron` enforces 6-hour gating using `status:sync:last-run-auto`.
- Non-Vercel deployments need an external scheduler calling `/api/cron`.
