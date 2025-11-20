# AniList ↔ Trakt Sync (Complete)

Ready-to-run Next.js (App Router) project that syncs AniList -> Trakt using Fribbs mappings,
TMDB/IMDB/TVDB fallbacks, and Upstash KV for storage.

## Quickstart (local)
1. Copy `.env.example` to `.env.local` and fill in your keys.
2. Install deps: `npm install`
3. Run dev server: `npm run dev`
4. Open http://localhost:3000

API routes:
- GET /api/refresh-fribbs
- GET /api/mappings
- POST /api/manual-map
- GET /api/logs
- GET /api/sync?anilistId=<id>
