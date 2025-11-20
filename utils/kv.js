export const kv = {
  async get(key) {
    if (!process.env.KV_REST_API_URL) return null;
    const url = `${process.env.KV_REST_API_URL}/get/${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j.result ?? null;
  },
  async set(key, value, opts = {}) {
    if (!process.env.KV_REST_API_URL) return null;
    const valStr = typeof value === 'string' ? value : JSON.stringify(value);
    const command = ["SET", key, valStr];
    if (opts.ex) {
      command.push("EX", opts.ex);
    }
    const url = `${process.env.KV_REST_API_URL}/`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
      body: JSON.stringify(command)
    });
  }
};
