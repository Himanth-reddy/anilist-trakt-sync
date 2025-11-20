import { kv } from '../../../utils/kv.js';

export async function GET() {
  try {
    const indexKey = 'map:anilist:index';
    const rawIndex = await kv.get(indexKey);
    let list = [];
    if (!rawIndex) list = [];
    else if (typeof rawIndex === 'string') {
      try {
        const parsed = JSON.parse(rawIndex);
        if (parsed?.value) list = JSON.parse(parsed.value);
        else list = parsed;
      } catch { list = [rawIndex]; }
    } else if (typeof rawIndex === 'object' && rawIndex.value) {
      try { list = JSON.parse(rawIndex.value); } catch { list = []; }
    } else if (Array.isArray(rawIndex)) list = rawIndex;

    if (!Array.isArray(list)) list = [];

    const out = [];
    for (const key of list) {
      const entryRaw = await kv.get(key);
      if (!entryRaw) continue;
      let data = null;
      if (typeof entryRaw === 'string') {
        try { data = JSON.parse(entryRaw); } catch { data = { raw: entryRaw }; }
      } else if (typeof entryRaw === 'object' && entryRaw.value) {
        try { data = JSON.parse(entryRaw.value); } catch { data = { raw: entryRaw.value }; }
      } else data = entryRaw;

      out.push({ anilistId: key.split(':')[2], ...data });
    }

    return Response.json(out);
  } catch (err) {
    console.error('/api/mappings error', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
