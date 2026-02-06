import { db } from '../../../utils/db.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const hasSupabase =
      process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!hasSupabase) {
      return Response.json(
        { error: 'Supabase environment variables are not configured.' },
        { status: 500 }
      );
    }
    const logs = await db.getLogs(200);
    return Response.json(logs);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
