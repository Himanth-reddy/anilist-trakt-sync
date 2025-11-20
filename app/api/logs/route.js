import { kv } from '../../../utils/kv.js';

export async function GET() {
  try {
    const raw = await kv.get('logs');
    let logs = [];
    if (!raw) logs = [];
    else if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        logs = Array.isArray(parsed) ? parsed : [raw];
      } catch { logs = [raw]; }
    } else if (Array.isArray(raw)) {
      logs = raw;
    } else if (typeof raw === 'object') {
      // Handle potential wrapped object
      logs = raw.value ? (Array.isArray(raw.value) ? raw.value : [JSON.stringify(raw)]) : [JSON.stringify(raw)];
    }

    return Response.json(logs.slice(-200).reverse());
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
