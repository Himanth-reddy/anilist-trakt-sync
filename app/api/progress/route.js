import { db } from '../../../utils/db.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const anilistIdRaw = searchParams.get('anilistId');
    const limitRaw = searchParams.get('limit');

    if (anilistIdRaw) {
      const anilistId = Number(anilistIdRaw);
      if (!Number.isInteger(anilistId) || anilistId <= 0) {
        return Response.json({ error: 'Invalid anilistId' }, { status: 400 });
      }
      const lastAbs = await db.getSyncProgress(anilistId);
      return Response.json({ anilistId, lastAbs });
    }

    const limit = limitRaw ? Number(limitRaw) : 50;
    const items = await db.getSyncProgressRows(limit);
    return Response.json({ count: items.length, items });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
