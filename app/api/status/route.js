import { db } from '../../../utils/db.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [lastManual, lastAuto] = await Promise.all([
      db.getConfig('status:sync:last-run'),
      db.getConfig('status:sync:last-run-auto')
    ]);

    return Response.json({
      lastManualSync: lastManual,
      lastAutomatedSync: lastAuto
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
