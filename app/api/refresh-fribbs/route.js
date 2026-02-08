import { refreshFribbsCache } from '../../../lib/fribbs.js';
import { log } from '../../../utils/logger.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    console.log('[API] Refresh Fribbs called. URL:', request.url);
    const { searchParams } = new URL(request.url);
    if (searchParams.get('check')) {
      const { db } = await import('../../../utils/db.js');
      const lastSync = await db.getConfig('status:fribbs:last-sync');
      const lastFullSync = await db.getConfig('status:sync:last-run-auto');
      const cache = await db.getConfig('cache:fribbs');
      let count = 0;
      if (cache) {
        try { count = Object.keys(typeof cache === 'string' ? JSON.parse(cache) : cache).length; } catch { }
      }
      return Response.json({ count, lastSync, lastFullSync });
    }

    const data = await refreshFribbsCache();
    await log(`[Fribbs] Cache refreshed (${Object.keys(data).length} entries)`);
    return Response.json({ success: true, count: Object.keys(data).length, lastSync: new Date().toISOString() });
  } catch (err) {
    await log(`[Fribbs] Refresh failed: ${err.message}`, 'error');
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  // Allow checking status without refreshing
  // The 'check' functionality has been moved to the GET handler.
  // POST now solely triggers a refresh.
  return GET(request);
}
