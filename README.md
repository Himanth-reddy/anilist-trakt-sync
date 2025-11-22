# AniList ↔ Trakt Sync

A robust, serverless automation tool to synchronize your anime watch progress from **AniList** to **Trakt**.

## 🚀 Features
- **Automatic Sync**: Periodically checks for new episodes on AniList and marks them as watched on Trakt.
- **Smart ID Resolution**: Uses Fribbs, TMDB, IMDB, and TVDB to correctly map anime to Trakt shows.
- **Manual Mapping**: Easily fix incorrect matches via a web interface.
- **Persistent Logging**: View sync history and errors directly on the dashboard.
- **Self-Hosted**: Runs on **Render** (Free Tier) with **Supabase** (PostgreSQL) for storage.

## 🛠️ Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Render (Web Service)
- **Styling**: Tailwind CSS

## 📦 Deployment

See [DEPLOY.md](DEPLOY.md) for a step-by-step guide on how to deploy this for free.

## 🔧 Environment Variables

| Variable | Description |
| :--- | :--- |
| `ANILIST_ACCESS_TOKEN` | Your AniList API token |
| `TRAKT_CLIENT_ID` | Trakt API Client ID |
| `TRAKT_CLIENT_SECRET` | Trakt API Client Secret |
| `TRAKT_ACCESS_TOKEN` | Trakt OAuth Access Token |
| `TRAKT_REFRESH_TOKEN` | Trakt OAuth Refresh Token |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key |

## 📝 Usage

1.  **Dashboard**: View system status and "Last Synced" time.
2.  **Sync**: Trigger a manual sync for a specific show.
3.  **Mappings**: View and manage auto/manual ID mappings.
4.  **Logs**: Check system activity and debug issues.stId=<id>
