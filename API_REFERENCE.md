# API Reference

All routes are implemented under Next.js App Router (`app/api/*`).

Base assumption:
- Responses are JSON.
- Most routes are dynamic (`force-dynamic`) and server-side.

## Status and observability

## `GET /api/status`
Returns latest sync timestamps from `system_config`.

Response shape:
```json
{
  "lastManualSync": "...",
  "lastAutomatedSync": "...",
  "lastCompletedSync": "...",
  "lastWatchingSync": "..."
}
```

## `GET /api/logs`
Returns up to 200 log rows ordered by newest first.

Response:
```json
[
  {
    "id": 125,
    "message": "[Otaku] Cache refreshed (22046 entries)",
    "level": "info",
    "created_at": "2026-02-08T14:56:13.144732+00:00"
  }
]
```

Notes:
- Sends no-store cache headers.

## `GET /api/progress?limit=<n>`
Returns latest `sync_progress` rows.

Query params:
- `limit` optional, clamped to `1..500`, default `50`.

Response:
```json
{
  "count": 2,
  "items": [
    { "anilistId": 1735, "lastAbs": 500, "updatedAt": "..." }
  ]
}
```

## `GET /api/progress?anilistId=<id>`
Returns progress for one AniList show.

Response:
```json
{ "anilistId": 1735, "lastAbs": 500 }
```

Error:
- `400` if `anilistId` is invalid.

## Mapping cache management

## `GET /api/refresh-otaku?check=1`
Read-only status for Otaku cache.

Response:
```json
{
  "count": 22046,
  "lastSync": "...",
  "lastActivity": "..."
}
```

## `GET /api/refresh-otaku`
Triggers cache refresh from remote Otaku SQLite DB.

Response:
```json
{ "success": true, "count": 22046, "lastSync": "..." }
```

## `POST /api/refresh-otaku`
Alias of GET behavior.

## `GET /api/refresh-fribbs?check=1`
Read-only status for Fribbs cache.

Response:
```json
{
  "count": 18000,
  "lastSync": "...",
  "lastFullSync": "..."
}
```

## `GET /api/refresh-fribbs`
Triggers Fribbs cache refresh.

Response:
```json
{ "success": true, "count": 18000, "lastSync": "..." }
```

## `POST /api/refresh-fribbs`
Alias of GET behavior.

## Mapping management

## `GET /api/mappings`
Returns manual and auto mappings from `mappings` table.

Response:
```json
{
  "manual": [
    { "anilistId": 1, "traktId": 123, "tmdbId": null, "imdbId": null, "tvdbId": null, "type": "manual" }
  ],
  "auto": []
}
```

## `POST /api/manual-map`
Upserts manual mapping row.

JSON body:
```json
{
  "anilistId": 1,
  "traktId": 123,
  "tmdbId": 456,
  "imdbId": "tt1234567",
  "tvdbId": 789
}
```

Requirements:
- `anilistId` and `traktId` are required.

Response:
```json
{ "success": true, "added": 1 }
```

## Sync execution

## `GET /api/sync?anilistId=<id>`
Single show sync.

Response:
```json
{ "success": true, "count": 26 }
```

Error:
- `400` if missing `anilistId`.

## `GET /api/full-sync`
Manual incremental full sync.

Typical response:
```json
{
  "message": "Sync complete!",
  "found": 4,
  "synced": 3,
  "alreadySynced": 1,
  "skippedUnmapped": 0,
  "added": { "episodes": 3 }
}
```

## `GET /api/cron`
Scheduled gate for automated full sync.

Behavior:
- Runs full sync only if >6 hours since `status:sync:last-run-auto`.

Skip response example:
```json
{
  "message": "Skipped sync",
  "lastRun": "...",
  "nextRun": "..."
}
```

## `GET /api/completed-sync?preview=1`
Returns preview list for completed sync.

Response:
```json
{
  "items": [
    {
      "anilistShowId": 1,
      "titleEnglish": "Cowboy Bebop",
      "titleRomaji": "Cowboy Bebop",
      "progress": 26,
      "watchedAt": "..."
    }
  ],
  "count": 1
}
```

## `POST /api/completed-sync`
Executes completed-library sync.

Typical response:
```json
{
  "message": "Completed library sync complete!",
  "found": 12,
  "synced": 140,
  "alreadySyncedShows": 5,
  "addedEpisodes": 140,
  "batches": 1
}
```

## `GET /api/watching-sync?preview=1`
Returns preview list for watching sync.

## `POST /api/watching-sync`
Executes watching-library sync.

Typical response:
```json
{
  "message": "Watching library sync complete!",
  "found": 4,
  "synced": 8,
  "alreadySyncedShows": 1,
  "addedEpisodes": 8,
  "batches": 1
}
```

## Trakt OAuth helper

## `GET /api/trakt-auth`
Returns OAuth authorization URL and redirect URI.

Response:
```json
{
  "authUrl": "https://trakt.tv/oauth/authorize?...",
  "redirectUri": "urn:ietf:wg:oauth:2.0:oob"
}
```

## `POST /api/trakt-auth`
Exchanges Trakt authorization code and stores tokens in `system_config`.

Body:
```json
{ "code": "<authorization_code>" }
```

Response:
```json
{ "message": "Trakt tokens updated", "expires_in": 7776000 }
```
