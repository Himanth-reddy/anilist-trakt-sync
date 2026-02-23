import { getTraktToken } from './trakt-auth.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, retries = 3) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return res;
    } catch (err) {
      clearTimeout(timeout);
      lastErr = err;
      if (attempt < retries) {
        await sleep(500 * Math.pow(2, attempt));
        continue;
      }
    }
  }
  throw lastErr;
}

const TRAKT_HEADERS = async () => ({
  'trakt-api-key': process.env.TRAKT_CLIENT_ID,
  'Content-Type': 'application/json',
  Authorization: `Bearer ${await getTraktToken()}`,
  'User-Agent': 'Anilist-Trakt-Sync/1.0'
});

export async function searchTraktByExternal(type, id) {
  if (!id) return null;
  const url = `https://api.trakt.tv/search/${type}/${encodeURIComponent(id)}?type=show`;
  try {
    const res = await fetchWithRetry(url, { headers: await TRAKT_HEADERS() }, 2);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0]?.show?.ids?.trakt ?? null;
  } catch (err) {
    console.error('[Trakt API] searchTraktByExternal failed:', err.message);
    return null;
  }
}

export async function getFullShow(traktId) {
  if (!traktId) return [];
  const url = `https://api.trakt.tv/shows/${encodeURIComponent(traktId)}/seasons?extended=episodes`;
  try {
    const res = await fetchWithRetry(url, { headers: await TRAKT_HEADERS() }, 2);
    if (!res.ok) throw new Error('Failed to fetch trakt show');
    return await res.json();
  } catch (err) {
    console.error('[Trakt API] getFullShow failed:', err.message);
    throw err;
  }
}
