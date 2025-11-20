import { syncShow } from '../../../lib/sync-engine.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const anilistId = searchParams.get('anilistId');
    if (!anilistId) return Response.json({ error: 'Missing anilistId' }, { status: 400 });
    const result = await syncShow(anilistId);
    return Response.json({ success: true, count: result.length });
  } catch (err) {
    console.error('/api/sync error', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
