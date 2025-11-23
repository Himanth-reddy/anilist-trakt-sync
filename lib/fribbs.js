import { db } from '../utils/db.js';

const FRIBBS_URL = 'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json';

let inMemoryCache = null;

export async function refreshFribbsCache() {
  console.log('Refreshing Fribbs JSON cache...');
  try {
    // Use no-store to prevent Next.js from caching the large response
    const res = await fetch(FRIBBS_URL, {
      headers: { Accept: 'application/json, text/plain' },
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    if (text.trim().startsWith('<')) throw new Error('Received HTML instead of JSON');

    const data = JSON.parse(text);
    const fribbsDb = {};
    for (const item of data) {
      if (!item.anilist_id) continue;
      fribbsDb[String(item.anilist_id)] = {
        tmdbId: item.themoviedb_id || null,
        imdbId: item.imdb_id || null,
        tvdbId: item.thetvdb_id || null,
        malId: item.mal_id || null,
        kitsuId: item.kitsu_id || null,
        type: item.type || null
      };
    }

    // Update in-memory cache immediately
    inMemoryCache = fribbsDb;

    // Try to cache in DB, but don't fail if it's too big
    try {
      await db.setConfig('cache:fribbs', JSON.stringify(fribbsDb));
      await db.setConfig('status:fribbs:last-sync', new Date().toISOString());
    } catch (dbErr) {
      console.warn('Failed to cache Fribbs in DB (likely too large), using in-memory only:', dbErr.message);
    }

    return fribbsDb;
  } catch (err) {
    console.error('Failed to fetch/parse Fribbs JSON:', err.message);
    // Do NOT cache empty object on error
    return {};
  }
}

export async function loadFribbsCache() {
  // 1. Check in-memory cache first (fastest)
  if (inMemoryCache && Object.keys(inMemoryCache).length > 0) {
    return inMemoryCache;
  }

  // 2. Check DB
  try {
    const raw = await db.getConfig('cache:fribbs');
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      // Only use if valid and not empty
      if (parsed && Object.keys(parsed).length > 0) {
        inMemoryCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error loading Fribbs from DB:', err.message);
  }

  // 3. Fallback to fresh fetch
  return await refreshFribbsCache();
}

export async function getFribbsMapping(anilistId) {
  const fribbsDb = await loadFribbsCache();
  return fribbsDb[String(anilistId)] || null;
}
