# Sync Guide

This guide explains how syncing works in the current codebase, how to operate each sync mode, and how to troubleshoot state.

## 1. Prerequisites

Required runtime variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANILIST_ACCESS_TOKEN`
- `TRAKT_CLIENT_ID`

Strongly recommended:
- `TRAKT_CLIENT_SECRET`
- `TRAKT_ACCESS_TOKEN`
- `TRAKT_REFRESH_TOKEN`
- `TMDB_API_KEY`

Before first sync:
1. Open `/` dashboard.
2. Click `Update` for Otaku mappings.
3. Click `Update` for Fribbs mappings.
4. Verify counts > 0.

## 2. Sync modes and exact behavior

### 2.1 Single show sync

Route: `GET /api/sync?anilistId=<id>`

What it does:
1. Resolves AniList ID to Trakt ID.
2. Fetches Trakt seasons with episodes.
3. Normalizes episode list.
4. Stores normalized episodes in `system_config` key `trakt:show:<traktId>:episodes`.

It does not post watch history by itself.

### 2.2 Full incremental sync

Route: `GET /api/full-sync`

Data source:
- AniList list activities (`type: ANIME_LIST`, status `watched episode`).

Windowing:
- Reads `lastSyncTimestamp` from `system_config`.
- Fetches only activities newer than that timestamp.

Per-activity pipeline:
1. Skip if episode is already synced according to `sync_progress` (`episodeNumber <= last_abs`).
2. Resolve Trakt ID.
3. Load breakpoint map (`map:<traktId>` cache or fetch from Trakt).
4. Apply `episode_override` if exact absolute episode override exists.
5. Add translated episode to outgoing Trakt payload.

After successful post:
- Updates `sync_progress` for each affected AniList show.
- Updates `lastSyncTimestamp` to latest processed activity timestamp.
- Updates sync status key.
- Manual call sets `status:sync:last-run`.
- Automated call sets `status:sync:last-run-auto`.

Useful response fields:
- `found`
- `synced`
- `alreadySynced`
- `skippedUnmapped`
- `added`

### 2.3 Completed library sync

Routes:
- Preview: `GET /api/completed-sync?preview=1`
- Run: `POST /api/completed-sync`

Data source:
- AniList list entries where status is `COMPLETED`.

Behavior:
- Builds episode range from `last_abs + 1` to AniList `progress`.
- Uses completion date when available; otherwise now.
- Applies episode overrides before default mapping.
- Posts batches to Trakt.
- Updates `sync_progress` and status keys (`status:sync:last-run`, `status:sync:completed:last-run`).

### 2.4 Watching library sync

Routes:
- Preview: `GET /api/watching-sync?preview=1`
- Run: `POST /api/watching-sync`

Data source:
- AniList list entries where status is `CURRENT`.

Behavior:
- Builds episode range from `last_abs + 1` to AniList `progress`.
- Uses current timestamp as watched date.
- Applies episode overrides before default mapping.
- Posts batches to Trakt.
- Updates `sync_progress` and status keys (`status:sync:last-run`, `status:sync:watching:last-run`).

## 3. Scheduling and automated sync

`/api/cron` is the scheduler target.

Behavior:
1. Reads `status:sync:last-run-auto`.
2. If older than 6 hours, calls automated full sync path.
3. Otherwise returns `Skipped sync` with `nextRun`.

Scheduling source:
- Vercel Cron is configured in `vercel.json`.
- Non-Vercel hosts need external scheduler calling `/api/cron`.

## 4. ID resolution strategy

`resolveTraktId(anilistId)` strategy:
1. `mappings` table existing row.
2. Otaku DB cache (`cache:otaku`) direct match.
3. Fribbs cache (`cache:fribbs`) fallback.
4. TMDB external IDs (if `TMDB_API_KEY` available).
5. Trakt external search by `tmdb` then `imdb` then `tvdb`.
6. Save successful resolved mapping as auto mapping.

## 5. Progress and dedupe model

`sync_progress` rows:
- Primary key: `anilist_id`
- Value tracked: `last_abs`

Meaning:
- `last_abs` is the highest absolute episode already sent to Trakt for that AniList show.

Effect:
- Prevents duplicate syncing when full/completed/watching syncs run repeatedly.

Debug endpoint:
- `GET /api/progress?limit=50`
- `GET /api/progress?anilistId=<id>`

## 6. Manual mapping and overrides

Manual mapping:
- Page: `/manual`
- API: `POST /api/manual-map`
- Required body fields: `anilistId`, `traktId`

Episode override:
- Stored in `episode_override` table.
- If row exists for `(trakt_id, abs)`, sync uses that `season, episode` directly.

## 7. Runbook operations

### 7.1 Force resync a single show from episode 1

SQL:
```sql
delete from public.sync_progress where anilist_id = <ANILIST_ID>;
```

Then run:
- Completed sync or watching sync, depending on list status.

### 7.2 Reprocess full activity window

SQL:
```sql
update public.system_config
set value = '0', updated_at = now()
where key = 'lastSyncTimestamp';
```

Then run `GET /api/full-sync`.

### 7.3 Add episode correction

SQL:
```sql
insert into public.episode_override (trakt_id, abs, season, episode)
values (<TRAKT_ID>, <ABS_EP>, <SEASON>, <EPISODE>)
on conflict (trakt_id, abs)
do update set season = excluded.season, episode = excluded.episode;
```

## 8. Troubleshooting

### 8.1 No Trakt mapping found
- Refresh Otaku and Fribbs caches on dashboard.
- Add manual mapping via `/manual`.

### 8.2 Sync says success but no new episodes posted
- Check `alreadySynced`/`alreadySyncedShows` in response.
- Inspect `sync_progress` for that AniList ID.

### 8.3 Logs page looks stale
- `/api/logs` is configured with `no-store` and client polling every 5s.
- If still stale, hard refresh browser tab and verify Supabase credentials.

### 8.4 Time display mismatch
- Schema uses `TIMESTAMPTZ`.
- UI parser normalizes old timestamps and renders local timezone with abbreviation.

### 8.5 Automated and manual timestamps look identical
- Automated full sync updates only `status:sync:last-run-auto`.
- Manual sync routes update `status:sync:last-run`.
- If both are equal, that is historical state from earlier runs, not current logic.
