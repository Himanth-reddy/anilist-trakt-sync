import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// We use the Service Role Key because this runs on the server and needs full access
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const kv = {
  async get(key) {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('kv_store')
        .select('value')
        .eq('key', key)
        .single();

      if (error) {
        // PGRST116 is the error code for "JSON object requested, multiple (or no) rows returned"
        // When .single() finds no rows, it throws this.
        if (error.code === 'PGRST116') return null;
        console.error('Supabase KV GET error:', error);
        return null;
      }

      return data?.value ?? null;
    } catch (err) {
      console.error('Supabase KV GET exception:', err);
      return null;
    }
  },

  async set(key, value, opts = {}) {
    if (!supabase) return null;

    try {
      // Postgres doesn't natively support "expire" (TTL) like Redis.
      // We ignore opts.ex for now, or we could implement a cleanup cron job later.

      const { error } = await supabase
        .from('kv_store')
        .upsert({
          key,
          value,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) {
        console.error('Supabase KV SET error:', error);
      } else {
        // console.log('Supabase KV SET success for key:', key);
      }
    } catch (err) {
      console.error('Supabase KV SET exception:', err);
    }
  },

  async keys(pattern) {
    if (!supabase) return [];

    try {
      // Convert Redis-style glob pattern to SQL LIKE pattern
      // Redis: map:anilist:* -> SQL: map:anilist:%
      const sqlPattern = pattern.replace(/\*/g, '%');

      const { data, error } = await supabase
        .from('kv_store')
        .select('key')
        .like('key', sqlPattern);

      if (error) {
        console.error('Supabase KV KEYS error:', error);
        return [];
      }

      return data.map(row => row.key);
    } catch (err) {
      console.error('Supabase KV KEYS exception:', err);
      return [];
    }
  }
};
