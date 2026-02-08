# Deployment Guide

This guide covers production deployment with Supabase and either Vercel or Render.

## 1. Supabase setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase_schema.sql`.
4. Copy credentials from Project Settings -> API:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Important:
- Use `service_role`, not `anon`.
- Keep `service_role` server-side only.

## 2. Required environment variables

Set these in your host environment:

| Variable | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | Yes | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | DB read/write |
| `ANILIST_ACCESS_TOKEN` | Yes | AniList GraphQL token |
| `TRAKT_CLIENT_ID` | Yes | Trakt API key |
| `TRAKT_CLIENT_SECRET` | Recommended | Needed for OAuth code exchange and refresh |
| `TRAKT_ACCESS_TOKEN` | Recommended | Initial token fallback |
| `TRAKT_REFRESH_TOKEN` | Recommended | Refresh fallback |
| `TMDB_API_KEY` | Optional | Improves mapping resolution |

Optional operational variable:

| Variable | Required | Notes |
| --- | --- | --- |
| `SUPABASE_TOKEN` | No | Only needed for Supabase Management API/manual migration scripts |

## 3. Option A: Vercel deployment

This repo already includes `vercel.json` with cron:
- `path`: `/api/cron`
- `schedule`: `0 */6 * * *`

Steps:
1. Import repo into Vercel.
2. Set all environment variables.
3. Deploy.

Verify:
1. Open `/` and confirm status cards load.
2. Trigger `/api/refresh-otaku` and `/api/refresh-fribbs`.
3. Check `/logs` for refresh log entries.
4. Call `/api/cron` once manually and verify response.

## 4. Option B: Render deployment

`render.yaml` config exists for web service build/start.

Steps:
1. Create Render Web Service from this repo.
2. Set environment variables.
3. Deploy.

Cron note:
- Render cron is not configured in this repo.
- Use external scheduler (GitHub Actions, UptimeRobot, cron-job.org, etc.) to call `GET https://<your-host>/api/cron` every 6 hours.

## 5. Recommended post-deploy checks

### 5.1 Health checks

- `GET /api/status`
- `GET /api/logs`
- `GET /api/mappings`
- `GET /api/progress?limit=5`

### 5.2 Mapping cache checks

- `GET /api/refresh-otaku?check=1`
- `GET /api/refresh-fribbs?check=1`

Expected:
- non-zero count values after first refresh.

### 5.3 Trakt auth check

1. Open `/sync`.
2. Use Trakt Auth section:
- Click `Get Auth URL`.
- Authorize in Trakt.
- Paste code and save.
3. Confirm success response and new tokens in `system_config`.

## 6. Timestamp migration for old installations

If your project was created before `TIMESTAMPTZ` updates, run this one-time migration:

```sql
begin;
alter table public.logs alter column created_at type timestamptz using created_at at time zone 'UTC';
alter table public.mappings alter column updated_at type timestamptz using updated_at at time zone 'UTC';
alter table public.show_map alter column created_at type timestamptz using created_at at time zone 'UTC';
alter table public.sync_progress alter column updated_at type timestamptz using updated_at at time zone 'UTC';
alter table public.system_config alter column updated_at type timestamptz using updated_at at time zone 'UTC';
commit;
```

## 7. Security checklist

- Do not commit `.env`.
- Rotate leaked tokens immediately.
- Limit who can access deployment/project dashboards.
- Keep `SUPABASE_SERVICE_ROLE_KEY` private.
- Consider setting an auth layer in front of sync endpoints if deploying publicly.
