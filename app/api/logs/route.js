import { db } from '../../../utils/db.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0'
};

export async function GET() {
  try {
    const hasSupabase =
      process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!hasSupabase) {
      return Response.json(
        { error: 'Supabase environment variables are not configured.' },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }
    const logs = await db.getLogs(200);
    return Response.json(logs, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
