import { kv } from '../../../utils/kv.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { anilistId, traktId, tmdbId, imdbId, tvdbId } = body;
    if (!anilistId || !traktId) return Response.json({ error: 'anilistId and traktId required' }, { status: 400 });

    const mapKey = `map:anilist:${anilistId}`;
    const indexKey = 'map:anilist:index';

    await kv.set(mapKey, JSON.stringify({ traktId, tmdbId, imdbId, tvdbId }));

    let rawIndex = await kv.get(indexKey);
    let index = [];
    if (!rawIndex) index = [];
    else if (typeof rawIndex === 'string') {
      try {
        const parsed = JSON.parse(rawIndex);
        if (parsed?.value) index = JSON.parse(parsed.value);
        else index = parsed;
      } catch {
        index = [];
      }
    } else if (typeof rawIndex === 'object' && rawIndex.value) {
      try { index = JSON.parse(rawIndex.value); } catch { index = []; }
    } else if (Array.isArray(rawIndex)) index = rawIndex;

    if (!Array.isArray(index)) index = [];
    if (!index.includes(mapKey)) index.push(mapKey);

    await kv.set(indexKey, JSON.stringify(index));

    return Response.json({ success: true, added: mapKey });
  } catch (err) {
    console.error('manual-map error', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
