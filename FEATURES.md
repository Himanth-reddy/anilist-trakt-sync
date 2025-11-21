# Anilist-Trakt Sync Features

This project provides a robust solution for synchronizing anime watch progress between AniList and Trakt. Below is a point-by-point list of its features.

## 🔄 Synchronization
- **Single Show Sync**: 
  - Endpoint: `/api/sync?anilistId={id}`
  - On-demand synchronization for individual shows.
  - Resolves AniList ID to Trakt ID automatically.
  - Fetches full season and episode data from Trakt.
  - Normalizes data and stores it in KV storage for quick access.

- **Full Account Sync**:
  - Endpoint: `/api/full-sync`
  - Triggers a synchronization process for the entire user library (implied functionality).

- **Automatic ID Resolution**:
  - Uses multiple sources (Fribbs, TMDB, IMDB, TVDB) to find the correct Trakt ID for an AniList entry.
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
- **Activity Logging**:
  - Endpoint: `/api/logs`
  - Retains the last 200 system events (sync actions, errors, warnings).
  - Provides a chronological view of system health.

- **KV Storage**:
  - Utilizes a Key-Value store for high-performance data access.
  - Caches mappings (`map:anilist:*`), normalized show data (`trakt:show:*`), and logs.

- **Verification System**:
  - Includes `verify_system.js` to automate the testing of all core endpoints.
  - Checks connectivity and response status for Fribbs, Mappings, Logs, and Sync endpoints.
