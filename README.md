# AniList to Trakt Sync

Synchronize anime watch progress from AniList to Trakt with a Next.js web app, scheduled automation, and Supabase-backed persistence.

## What this project does

This app reads your AniList activity/list data, resolves AniList IDs to Trakt IDs, converts AniList episode numbers to Trakt season/episode entries, and posts watch history to Trakt.

It includes:
- A dashboard for system state and mapping cache refresh.
- Multiple sync modes (single show, incremental full sync, completed-library sync, watching-library sync).
- Mapping management (automatic + manual overrides).
- Persistent logs and sync progress tracking in Supabase.

## Current architecture

Core runtime pieces:
- Frontend: Next.js App Router pages under `app/`.
- API routes: server routes under `app/api/*`.
- Persistence: Supabase tables (`mappings`, `logs`, `system_config`, `sync_progress`, `episode_override`).
- Primary mapping source: Otaku mappings SQLite DB (`anime_mappings.db` from GitHub).
- Secondary mapping source: Fribbs anime list JSON.

ID resolution order:
1. Existing saved mapping in `mappings`.
2. Otaku mapping cache (`cache:otaku`) and direct `trakt_id` if available.
3. Fribbs mapping cache (`cache:fribbs`) merged with Otaku IDs.
4. TMDB external ID expansion (`TMDB_API_KEY`) and Trakt external search (`tmdb`, `imdb`, `tvdb`).

## Sync modes

- `GET /api/sync?anilistId=<id>`: single-show metadata sync.
- `GET /api/full-sync`: incremental sync based on AniList list activities (`watched episode`) since `lastSyncTimestamp`.
- `POST /api/completed-sync`: sync all AniList completed entries.
- `POST /api/watching-sync`: sync all AniList currently watching entries.

Progress dedupe:
- `sync_progress` stores highest absolute episode synced per AniList show (`last_abs`).
- Full/completed/watching sync only sends episodes above stored progress.
- `episode_override` (if present) overrides breakpoint mapping on a per-episode basis.

## Web pages

- `/`: dashboard (Fribbs status, Otaku status, sync status, sync progress table).
- `/sync`: sync operations and Trakt OAuth helper.
- `/mappings`: manual and automatic mapping tables.
- `/manual`: add/update manual mapping.
- `/logs`: live log viewer with polling.

## Environment variables

Runtime-required:

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side DB access |
| `ANILIST_ACCESS_TOKEN` | Yes | AniList GraphQL authentication |
| `TRAKT_CLIENT_ID` | Yes | Trakt API key for search/sync requests |

Strongly recommended for reliable Trakt auth:

| Variable | Required | Purpose |
| --- | --- | --- |
| `TRAKT_CLIENT_SECRET` | Recommended | Needed for token exchange/refresh flows |
| `TRAKT_ACCESS_TOKEN` | Recommended | Initial bearer token fallback |
| `TRAKT_REFRESH_TOKEN` | Recommended | Token refresh fallback |

Optional:

| Variable | Required | Purpose |
| --- | --- | --- |
| `TMDB_API_KEY` | Optional | Expands ID matching via TMDB external IDs |
| `SUPABASE_TOKEN` | Optional | Supabase Management API (manual SQL/migrations) |
| `SIMKL_CLIENT_ID` | Optional/unused | Currently not used in runtime code |

## Local development

1. Install dependencies:
```bash
npm install
```
2. Add `.env` with required variables.
3. Start dev server:
```bash
npm run dev
```
4. Run tests:
```bash
npm test
```
5. Build production bundle:
```bash
npm run build
```

## Scheduling

- Vercel: `vercel.json` config calls `GET /api/cron` every 6 hours (`0 */6 * * *`).
- Render/self-host: there is no native cron config in this repo for Render. Use an external scheduler to call `/api/cron`.

`/api/cron` behavior:
- Reads `status:sync:last-run-auto`.
- Runs automated full sync only if more than 6 hours have passed.
- Otherwise returns skipped response with `nextRun`.

## Documentation index

- Feature details: [`FEATURES.md`](FEATURES.md)
- Sync behavior/runbook: [`SYNC_GUIDE.md`](SYNC_GUIDE.md)
- Deployment (Vercel and Render): [`DEPLOY.md`](DEPLOY.md)
- API contracts: [`API_REFERENCE.md`](API_REFERENCE.md)
- Database schema and operational notes: [`DATABASE.md`](DATABASE.md)

## Security notes

- Never commit `.env`.
- `SUPABASE_SERVICE_ROLE_KEY` is highly privileged; keep it server-only.
- Rotate Trakt and Supabase secrets if they are ever exposed.
