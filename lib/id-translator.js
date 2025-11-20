import { kv } from '../utils/kv.js';
import { getFribbsMapping } from './fribbs.js';
import { getTmdbExternalIds } from './tmdb-api.js';
import { searchTraktByExternal } from './trakt-api.js';

export async function resolveTraktId(anilistId) {
  // manual mapping check
  const manualRaw = await kv.get(`manual:map:${anilistId}`);
  if (manualRaw) {
    try {
      const parsed = typeof manualRaw === 'string' ? JSON.parse(manualRaw) : manualRaw;
      if (parsed.traktId) return parsed.traktId;
    } catch { }
  }

  // cached mapping check
  const cachedRaw = await kv.get(`map:anilist:${anilistId}`);
  if (cachedRaw) {
    try {
      const parsed = typeof cachedRaw === 'string' ? JSON.parse(cachedRaw) : cachedRaw;
      if (parsed.traktId) return parsed.traktId;
    } catch { }
  }

  // fribbs mapping
  const fribbs = await getFribbsMapping(anilistId);
  let ids = { ...(fribbs || {}) };

  // if we have a tmdb id, expand
  if (ids.tmdbId) {
    try {
      const ext = await getTmdbExternalIds(ids.tmdbId);
      ids = { ...ids, ...ext };
    } catch (err) {
      console.error('TMDB fetch failed, continuing with existing IDs:', err.message);
    }
  }

  // try trakt searches
  const traktId = (await searchTraktByExternal('tmdb', ids.tmdbId)) ||
    (await searchTraktByExternal('imdb', ids.imdbId)) ||
    (await searchTraktByExternal('tvdb', ids.tvdbId));

  if (traktId) {
    await kv.set(`map:anilist:${anilistId}`, JSON.stringify({ ...ids, traktId }));
    return traktId;
  }

  return null;
}
