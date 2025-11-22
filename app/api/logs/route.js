import { db } from '../../../utils/kv.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs = await db.getLogs(200);
    return Response.json(logs);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
