import { resolveTraktId } from './id-translator.js';
import { getFullShow } from './trakt-api.js';
import { flattenTraktEpisodes } from './episode-normalizer.js';
import { kv } from '../utils/kv.js';

async function log(msg) {
  const raw = await kv.get('logs');
  let logs = [];
  if (!raw) logs = [];
  else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      logs = Array.isArray(parsed) ? parsed : [];
    } catch { logs = []; }
  } else if (Array.isArray(raw)) {
    logs = raw;
  } else {
    logs = [];
  }
  logs.push(`[${new Date().toISOString()}] ${msg}`);
  await kv.set('logs', JSON.stringify(logs.slice(-200)));
}

export async function syncShow(anilistId) {
  const traktId = await resolveTraktId(anilistId);
  if (!traktId) {
    await log(`No mapping for AniList ${anilistId}`);
    throw new Error(`No Trakt mapping for AniList ${anilistId}`);
  }
  const seasons = await getFullShow(traktId);
  const normalized = flattenTraktEpisodes(seasons);
  await kv.set(`trakt:show:${traktId}:episodes`, JSON.stringify(normalized));
  await log(`Synced AniList ${anilistId} -> Trakt ${traktId} (${normalized.length} eps)`);
  return normalized;
}
