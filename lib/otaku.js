import { db } from '../utils/db.js';
import initSqlJs from 'sql.js/dist/sql-asm.js';

const OTAKU_URL = 'https://github.com/Goldenfreddy0703/Otaku-Mappings/raw/refs/heads/main/anime_mappings.db';

let inMemoryCache = null;
let sqlInitPromise = null;

async function getSqlJs() {
  if (!sqlInitPromise) {
    sqlInitPromise = initSqlJs();
  }
  return sqlInitPromise;
}

export async function refreshOtakuCache() {
  console.log('Refreshing Otaku DB cache...');
  try {
    const res = await fetch(OTAKU_URL, {
      headers: { Accept: 'application/octet-stream' },
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buffer = await res.arrayBuffer();
    if (!buffer || buffer.byteLength < 1024) throw new Error('Downloaded DB too small');

    const SQL = await getSqlJs();
    const dbFile = new SQL.Database(new Uint8Array(buffer));
    const result = dbFile.exec(
      'SELECT anilist_id, thetvdb_id, themoviedb_id, imdb_id, trakt_id, anime_media_type FROM anime WHERE anilist_id IS NOT NULL'
    );

    const otakuDb = {};
    if (result && result[0] && result[0].values) {
      for (const row of result[0].values) {
        const [anilistId, tvdbId, tmdbId, imdbId, traktId, mediaType] = row;
        if (!anilistId) continue;
        otakuDb[String(anilistId)] = {
          tmdbId: tmdbId || null,
          imdbId: imdbId || null,
          tvdbId: tvdbId || null,
          traktId: traktId || null,
          type: mediaType ? String(mediaType).toLowerCase() : null
        };
      }
    }

    inMemoryCache = otakuDb;

    try {
      await db.setConfig('cache:otaku', JSON.stringify(otakuDb));
      await db.setConfig('status:otaku:last-sync', new Date().toISOString());
      await db.setConfig('status:otaku:last-activity', extractLastActivity(dbFile));
    } catch (dbErr) {
      console.warn('Failed to cache Otaku in DB (likely too large), using in-memory only:', dbErr.message);
    }

    return otakuDb;
  } catch (err) {
    console.error('Failed to fetch/parse Otaku DB:', err.message);
    return {};
  }
}

function extractLastActivity(dbFile) {
  try {
    const res = dbFile.exec('SELECT last_updated FROM activities WHERE sync_id = 1 LIMIT 1');
    if (res && res[0] && res[0].values && res[0].values[0]) {
      const raw = res[0].values[0][0];
      if (!raw) return null;
      const ts = Number(raw);
      if (Number.isFinite(ts)) return new Date(ts * 1000).toISOString();
      return String(raw);
    }
  } catch {
    // ignore
  }
  return null;
}

export async function loadOtakuCache() {
  if (inMemoryCache && Object.keys(inMemoryCache).length > 0) return inMemoryCache;

  try {
    const raw = await db.getConfig('cache:otaku');
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed && Object.keys(parsed).length > 0) {
        inMemoryCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error loading Otaku from DB:', err.message);
  }

  return await refreshOtakuCache();
}

export async function getOtakuMapping(anilistId) {
  const otakuDb = await loadOtakuCache();
  return otakuDb[String(anilistId)] || null;
}
