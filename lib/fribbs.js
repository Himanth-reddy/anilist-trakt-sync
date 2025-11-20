import { kv } from '../utils/kv.js';

const FRIBBS_URL = 'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json';

export async function refreshFribbsCache() {
  console.log('Refreshing Fribbs JSON cache...');
  try {
    const res = await fetch(FRIBBS_URL, { headers: { Accept: 'application/json, text/plain' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (text.trim().startsWith('<')) throw new Error('Received HTML instead of JSON');
    const data = JSON.parse(text);
    const db = {};
    for (const item of data) {
      if (!item.anilist_id) continue;
      db[String(item.anilist_id)] = {
        tmdbId: item.themoviedb_id || null,
        imdbId: item.imdb_id || null,
        tvdbId: item.thetvdb_id || null,
        malId: item.mal_id || null,
        kitsuId: item.kitsu_id || null,
        type: item.type || null
      };
    }
    await kv.set('cache:fribbs', JSON.stringify(db), { ex: 604800 });
    return db;
  } catch (err) {
    console.error('Failed to fetch/parse Fribbs JSON:', err.message);
    await kv.set('cache:fribbs', JSON.stringify({}), { ex: 3600 });
    return {};
  }
}

export async function loadFribbsCache() {
  const raw = await kv.get('cache:fribbs');
  if (!raw) return await refreshFribbsCache();
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return await refreshFribbsCache();
  }
}

export async function getFribbsMapping(anilistId) {
  const db = await loadFribbsCache();
  return db[String(anilistId)] || null;
}
