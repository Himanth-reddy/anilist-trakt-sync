# Anilist-Trakt Sync Features

This project provides a robust solution for synchronizing anime watch progress between AniList and Trakt. Below is a point-by-point list of its features.

## 🔐 Authentication & Security
- **Trakt OAuth Integration**:
  - Securely handles Trakt access and refresh tokens.
  - **Auto-Refresh**: Automatically refreshes expired tokens using `lib/trakt-auth.js` without user intervention.
  - **Retry Mechanism**: Automatically retries failed requests with a refreshed token if a 401 Unauthorized error occurs.

## 🔄 Synchronization
- **Single Show Sync**: 
  - Endpoint: `/api/sync?anilistId={id}`
  - On-demand synchronization for individual shows.
  - Resolves AniList ID to Trakt ID automatically.
  - Fetches full season and episode data from Trakt.
  - Normalizes data and stores it in KV storage for quick access.

- **Full Account Sync**:
  - Endpoint: `/api/full-sync`
  - Triggers a synchronization process for the entire user library.
  - **Batch Processing**: Efficiently processes multiple shows in sequence.
  - **Progress Tracking**: Updates `lastSyncTimestamp` to ensure only new changes are processed in future runs.

- **Automatic ID Resolution**:
  - Uses multiple sources (Fribbs, TMDB, IMDB, TVDB) to find the correct Trakt ID for an AniList entry.
  - **Smart Caching**: Implements a multi-layer cache (In-Memory -> KV -> External Fetch) for Fribbs data to minimize latency and API calls.
  - **Fribbs Integration**: `/api/refresh-fribbs` endpoint to update the local ID mapping database.

## 🗺️ Mapping Management
- **View Mappings**:
  - Endpoint: `/api/mappings`
  - Displays all currently active mappings between AniList and Trakt.
  - Distinguishes between automatic mappings and manual overrides.

- **Manual Overrides**:
  - Endpoint: `/api/manual-map`
  - Allows users to manually correct mismatched shows.
  - Supports specifying Trakt, TMDB, IMDB, and TVDB IDs directly.
  - Updates the mapping index for persistence.

## 📊 System Monitoring & Storage
- **Persistent Logging**:
  - Endpoint: `/api/logs`
  - **KV Persistence**: Stores logs in Vercel KV/Upstash to ensure they survive server restarts and serverless function cold starts.
  - **Dual Output**: Writes to both KV (for the web UI) and Console (for Vercel runtime logs).
  - Retains the last 200 system events (sync actions, errors, warnings).

- **KV Storage**:
  - Utilizes a Key-Value store for high-performance data access.
  - Caches mappings (`map:anilist:*`), normalized show data (`trakt:show:*`), tokens, and logs.
  - **Robust Error Handling**: Gracefully handles storage failures and ensures data consistency.

- **Verification System**:
  - Includes `verify_system.js` to automate the testing of all core endpoints.
  - Checks connectivity and response status for Fribbs, Mappings, Logs, Sync, and Manual Override endpoints.
