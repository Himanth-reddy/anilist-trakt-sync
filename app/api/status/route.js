import { db } from '../../../utils/db.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [lastManual, lastAuto, lastCompleted, lastWatching] = await Promise.all([
      db.getConfig('status:sync:last-run'),
      db.getConfig('status:sync:last-run-auto'),
      db.getConfig('status:sync:completed:last-run'),
      db.getConfig('status:sync:watching:last-run')
    ]);

    return Response.json({
      lastManualSync: lastManual,
      lastAutomatedSync: lastAuto,
      lastCompletedSync: lastCompleted,
      lastWatchingSync: lastWatching
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
