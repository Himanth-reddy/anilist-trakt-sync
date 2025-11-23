import { db } from '../../../utils/db.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { anilistId, traktId, tmdbId, imdbId, tvdbId } = body;
    if (!anilistId || !traktId) return Response.json({ error: 'anilistId and traktId required' }, { status: 400 });

    await db.saveMapping(anilistId, { traktId, tmdbId, imdbId, tvdbId, type: 'manual' }, true);

    return Response.json({ success: true, added: anilistId });
  } catch (err) {
    console.error('manual-map error', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
