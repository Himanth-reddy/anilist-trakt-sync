import { kv } from '../../../utils/kv.js';

export async function GET() {
  try {
    // Fetch manual and automatic mapping keys
    const manualKeys = await kv.keys('manual:map:*');
    const autoKeys = await kv.keys('map:anilist:*');

    // Helper to fetch and parse mapping data
    const fetchMappings = async (keys, keyPrefix) => {
      const mappings = [];
      for (const key of keys) {
        const raw = await kv.get(key);
        if (!raw) continue;

        let data = null;
        if (typeof raw === 'string') {
          try { data = JSON.parse(raw); } catch { data = { raw }; }
        } else if (typeof raw === 'object' && raw.value) {
          try { data = JSON.parse(raw.value); } catch { data = { raw: raw.value }; }
        } else {
          data = raw;
        }

        // Extract anilistId from key
        const anilistId = key.replace(keyPrefix, '');
        mappings.push({ anilistId, ...data });
      }
      return mappings;
    };

    const manual = await fetchMappings(manualKeys, 'manual:map:');
    const auto = await fetchMappings(autoKeys, 'map:anilist:');

    return Response.json({ manual, auto });
  } catch (err) {
    console.error('/api/mappings error', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
