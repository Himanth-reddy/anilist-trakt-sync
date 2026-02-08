# Database and State Model

This document describes tables, active usage, and key-value state used by the app.

## Public tables

## `mappings` (active)
Purpose:
- Stores AniList-to-external ID mappings.

Important columns:
- `anilist_id` (PK)
- `trakt_id`, `tmdb_id`, `imdb_id`, `tvdb_id`
- `type` (`manual` or `auto`)
- `is_manual`
- `updated_at` (`TIMESTAMPTZ`)

Writers:
- Auto resolver (`lib/id-translator.js`)
- Manual mapping endpoint (`/api/manual-map`)

Readers:
- Resolver and mappings UI/API

## `logs` (active)
Purpose:
- Persistent operational log stream for `/logs` UI.

Columns:
- `id` (PK)
- `message`
- `level`
- `created_at` (`TIMESTAMPTZ`)

Writers:
- `utils/logger.js` used across sync/cache routes

Reader:
- `/api/logs`

## `system_config` (active)
Purpose:
- Generic key/value storage for tokens, status timestamps, and caches.

Columns:
- `key` (PK)
- `value` (text JSON/string)
- `updated_at` (`TIMESTAMPTZ`)

Common keys in use:
- `trakt:token`
- `trakt:refresh_token`
- `cache:fribbs`
- `cache:otaku`
- `status:fribbs:last-sync`
- `status:otaku:last-sync`
- `status:otaku:last-activity`
- `status:sync:last-run`
- `status:sync:last-run-auto`
- `status:sync:watching:last-run`
- `status:sync:completed:last-run`
- `lastSyncTimestamp`
- `map:<traktId>` (breakpoint map cache)
- `trakt:show:<traktId>:episodes` (single-show sync cache)

## `sync_progress` (active)
Purpose:
- Dedupe protection for episode sync by tracking per-show max absolute episode already posted.

Columns:
- `anilist_id` (PK)
- `last_abs`
- `updated_at` (`TIMESTAMPTZ`)

Writers:
- Full sync, completed sync, watching sync (after successful post)

Readers:
- Full sync, completed sync, watching sync
- `/api/progress`

## `episode_override` (active)
Purpose:
- Manual correction of episode mapping per `(trakt_id, abs)`.

Columns:
- `trakt_id`, `abs` (composite PK)
- `season`, `episode`

Readers:
- Full sync, completed sync, watching sync

Behavior:
- If override row exists, it is used before breakpoint map logic.

## `episode_map` (legacy/not used by current runtime)
Purpose in old flow:
- Precomputed absolute episode mapping table.

Current status:
- Present in schema.
- Not read/written by current sync routes.

## `show_map` (legacy/not used by current runtime)
Purpose in old flow:
- AniList-to-Trakt mapping table by source.

Current status:
- Present in schema.
- Current runtime uses `mappings` instead.

## Timestamp policy

Current schema uses `TIMESTAMPTZ` for:
- `logs.created_at`
- `mappings.updated_at`
- `show_map.created_at`
- `sync_progress.updated_at`
- `system_config.updated_at`

Reason:
- Prevent timezone ambiguity in UI and API consumers.

## Operational SQL snippets

## Check latest sync status keys
```sql
select key, value, updated_at
from public.system_config
where key like 'status:sync:%'
order by key;
```

## Check progress for a show
```sql
select *
from public.sync_progress
where anilist_id = <ANILIST_ID>;
```

## Reset progress for one show (force re-sync)
```sql
delete from public.sync_progress
where anilist_id = <ANILIST_ID>;
```

## Add/update manual episode override
```sql
insert into public.episode_override (trakt_id, abs, season, episode)
values (<TRAKT_ID>, <ABS_EP>, <SEASON>, <EPISODE>)
on conflict (trakt_id, abs)
do update set season = excluded.season, episode = excluded.episode;
```

## Inspect recent logs
```sql
select id, level, message, created_at
from public.logs
order by created_at desc
limit 100;
```
