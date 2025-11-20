import { refreshFribbsCache } from '../../../lib/fribbs.js';

export async function GET() {
  try {
    const data = await refreshFribbsCache();
    return Response.json({ success: true, count: Object.keys(data).length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
