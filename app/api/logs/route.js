import { kv } from '../../../utils/kv.js';

export async function GET() {
  try {
    const raw = await kv.get('logs');
    let logs = [];
    if (!raw) logs = [];
    else if (typeof raw === 'string') {
      try { logs = JSON.parse(raw); } catch { logs = [raw]; }
    } else if (typeof raw === 'object' && raw.value) {
      try { logs = JSON.parse(raw.value); } catch { logs = []; }
    } else if (Array.isArray(raw)) logs = raw;

    return Response.json(logs.slice(-200).reverse());
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
