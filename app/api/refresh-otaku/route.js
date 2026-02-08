import { refreshOtakuCache } from '../../../lib/otaku.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    console.log('[API] Refresh Otaku called. URL:', request.url);
    const { searchParams } = new URL(request.url);
    if (searchParams.get('check')) {
      const { db } = await import('../../../utils/db.js');
      const lastSync = await db.getConfig('status:otaku:last-sync');
      const lastActivity = await db.getConfig('status:otaku:last-activity');
      const cache = await db.getConfig('cache:otaku');
      let count = 0;
      if (cache) {
        try { count = Object.keys(typeof cache === 'string' ? JSON.parse(cache) : cache).length; } catch { }
      }
      return Response.json({ count, lastSync, lastActivity });
    }

    const data = await refreshOtakuCache();
    return Response.json({ success: true, count: Object.keys(data).length, lastSync: new Date().toISOString() });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}
