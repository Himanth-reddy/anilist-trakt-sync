import { refreshFribbsCache } from '../../../lib/fribbs.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    console.log('[API] Refresh Fribbs called. URL:', request.url);
    const { searchParams } = new URL(request.url);
    if (searchParams.get('check')) {
      const { kv } = await import('../../../utils/kv.js');
      const lastSync = await kv.get('status:fribbs:last-sync');
      const cache = await kv.get('cache:fribbs');
      let count = 0;
      if (cache) {
        try { count = Object.keys(typeof cache === 'string' ? JSON.parse(cache) : cache).length; } catch { }
      }
      return Response.json({ count, lastSync });
    }

    const data = await refreshFribbsCache();
    return Response.json({ success: true, count: Object.keys(data).length, lastSync: new Date().toISOString() });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  // Allow checking status without refreshing
  // The 'check' functionality has been moved to the GET handler.
  // POST now solely triggers a refresh.
  return GET(request);
}
