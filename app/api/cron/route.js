import { GET as syncAll } from '../full-sync/route.js';
import { db } from '../../../utils/db.js';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const lastRunRaw = await db.getConfig('status:sync:last-run');
        const lastRun = lastRunRaw ? new Date(lastRunRaw).getTime() : 0;
        const now = Date.now();
        const sixHours = 6 * 60 * 60 * 1000;

        if (now - lastRun > sixHours) {
            console.log('[Cron] Triggering scheduled sync...');
            return await syncAll();
        }

        return Response.json({ message: 'Skipped sync', lastRun: new Date(lastRun).toISOString(), nextRun: new Date(lastRun + sixHours).toISOString() });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
