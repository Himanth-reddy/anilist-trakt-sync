import { db } from '../utils/db.js';
import { getFribbsMapping } from './fribbs.js';
import { getTmdbExternalIds } from './tmdb-api.js';
import { searchTraktByExternal } from './trakt-api.js';

export async function resolveTraktId(anilistId) {
  console.log(`[ID Resolution] Starting for AniList ${anilistId}`);

  // Check DB for existing mapping
  const mapping = await db.getMapping(anilistId);
  if (mapping && mapping.traktId) {
    console.log(`[ID Resolution] Found mapping in DB: ${mapping.traktId}`);
    return mapping.traktId;
  }

  // fribbs mapping
  console.log(`[ID Resolution] Checking Fribbs for AniList ${anilistId}...`);
  const fribbs = await getFribbsMapping(anilistId);
  if (!fribbs) {
    console.warn(`[ID Resolution] No Fribbs entry for AniList ${anilistId}`);
    return null;
  }

  let ids = { ...fribbs };
  console.log(`[ID Resolution] Fribbs IDs:`, ids);

  // if we have a tmdb id, expand
  if (ids.tmdbId) {
    try {
      console.log(`[ID Resolution] Fetching external IDs from TMDB ${ids.tmdbId}...`);
      const ext = await getTmdbExternalIds(ids.tmdbId);
      ids = { ...ids, ...ext };
      console.log(`[ID Resolution] Extended IDs:`, ids);
    } catch (err) {
      console.error('[ID Resolution] TMDB fetch failed, continuing with existing IDs:', err.message);
    }
  }

  // try trakt searches
  console.log(`[ID Resolution] Searching Trakt with IDs:`, ids);

  let traktId = null;
  if (ids.tmdbId) {
    traktId = await searchTraktByExternal('tmdb', ids.tmdbId);
    if (traktId) console.log(`[ID Resolution] Found via TMDB: ${traktId}`);
  }

  if (!traktId && ids.imdbId) {
    traktId = await searchTraktByExternal('imdb', ids.imdbId);
    if (traktId) console.log(`[ID Resolution] Found via IMDB: ${traktId}`);
  }

  if (!traktId && ids.tvdbId) {
    traktId = await searchTraktByExternal('tvdb', ids.tvdbId);
    if (traktId) console.log(`[ID Resolution] Found via TVDB: ${traktId}`);
  }

  if (traktId) {
    console.log(`[ID Resolution] SUCCESS! Trakt ID ${traktId} for AniList ${anilistId}`);
    await db.saveMapping(anilistId, { ...ids, traktId, type: 'auto' });
    return traktId;
  }

  console.warn(`[ID Resolution] FAILED - No Trakt ID found for AniList ${anilistId}`);
  return null;
}
