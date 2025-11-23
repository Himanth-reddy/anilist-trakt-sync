import { db } from '../../../utils/db.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { manual, auto } = await db.getAllMappings();
    return Response.json({ manual, auto });
  } catch (err) {
    console.error('/api/mappings error', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
