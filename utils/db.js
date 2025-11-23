import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// We use the Service Role Key because this runs on the server and needs full access
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export const db = {
    // --- LOGS ---
    async saveLog(message, level = 'info') {
        if (!supabase) return;
        try {
            await supabase.from('logs').insert({ message, level });
        } catch (error) {
            console.error('Failed to save log:', error);
        }
    },

    async getLogs(limit = 200) {
        if (!supabase) return [];
        try {
            const { data, error } = await supabase
                .from('logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Failed to get logs:', error);
            return [];
        }
    },

    // --- MAPPINGS ---
    async saveMapping(anilistId, mapping, isManual = false) {
        if (!supabase) return;
        try {
            await supabase.from('mappings').upsert({
                anilist_id: anilistId,
                trakt_id: mapping.traktId,
                tmdb_id: mapping.tmdbId,
                imdb_id: mapping.imdbId,
                tvdb_id: mapping.tvdbId,
                type: mapping.type,
                is_manual: isManual,
                updated_at: new Date().toISOString()
            });
        } catch (error) {
            console.error(`Failed to save mapping for ${anilistId}:`, error);
        }
    },

    async getMapping(anilistId) {
        if (!supabase) return null;
        try {
            const { data, error } = await supabase
                .from('mappings')
                .select('*')
                .eq('anilist_id', anilistId)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
            if (!data) return null;

            return {
                traktId: data.trakt_id,
                tmdbId: data.tmdb_id,
                imdbId: data.imdb_id,
                tvdbId: data.tvdb_id,
                type: data.type,
                isManual: data.is_manual
            };
        } catch (error) {
            console.error(`Failed to get mapping for ${anilistId}:`, error);
            return null;
        }
    },

    async getAllMappings() {
        if (!supabase) return { manual: [], auto: [] };
        try {
            const { data, error } = await supabase.from('mappings').select('*');
            if (error) throw error;
            if (!data) return { manual: [], auto: [] };

            const manual = [];
            const auto = [];

            for (const row of data) {
                const m = {
                    anilistId: row.anilist_id,
                    traktId: row.trakt_id,
                    tmdbId: row.tmdb_id,
                    imdbId: row.imdb_id,
                    tvdbId: row.tvdb_id,
                    type: row.type
                };
                if (row.is_manual) manual.push(m);
                else auto.push(m);
            }
            return { manual, auto };
        } catch (error) {
            console.error('Failed to get all mappings:', error);
            return { manual: [], auto: [] };
        }
    },

    // --- CONFIG (Tokens, Status) ---
    async setConfig(key, value) {
        if (!supabase) return;
        try {
            const valStr = typeof value === 'string' ? value : JSON.stringify(value);
            await supabase.from('system_config').upsert({
                key,
                value: valStr,
                updated_at: new Date().toISOString()
            });
        } catch (error) {
            console.error(`Failed to set config ${key}:`, error);
        }
    },

    async getConfig(key) {
        if (!supabase) return null;
        try {
            const { data, error } = await supabase
                .from('system_config')
                .select('value')
                .eq('key', key)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (!data) return null;

            // Try to parse JSON, otherwise return string
            try {
                return JSON.parse(data.value);
            } catch {
                return data.value;
            }
        } catch (error) {
            console.error(`Failed to get config ${key}:`, error);
            return null;
        }
    }
};
