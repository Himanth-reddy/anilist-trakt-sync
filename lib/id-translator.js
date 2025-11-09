// lib/id-translator.js
import { kv } from './kv-client.js';
import https from 'https';
import dns from 'dns';

// --- START IPv6 FIX ---
const lookupIPv6 = (hostname, options, callback) => {
    dns.lookup(hostname, { family: 6 }, (err, address, family) => {
        callback(err, address, family);
    });
};
const ipv6Agent = new https.Agent({ lookup: lookupIPv6 });
// --- END IPv6 FIX ---

const getSimklHeaders = () => ({
    'Content-Type': 'application/json',
    'simkl-api-key': process.env.SIMKL_CLIENT_ID
});

const getTraktHeaders = () => ({
    'Content-Type': 'application/json',
    'trakt-api-key': process.env.TRAKT_CLIENT_ID,
    'trakt-api-version': '2'
});

/**
 * NEW: A helper to search Trakt using a specific ID type.
 * Returns the show object if found, or null if not.
 */
async function searchTrakt(searchType, searchId) {
    if (!searchId) return null; // Don't search if the ID is null

    console.log(`[ID-Translator] Step 3: Trying to find Trakt show with ${searchType.toUpperCase()}: ${searchId}`);
    
    // Trakt's search for 'slugs' uses the 'trakt' ID type.
    const effectiveSearchType = (searchType === 'slug' || searchType === 'trakttvslug') ? 'trakt' : searchType;
    
    const step3Url = `https://api.trakt.tv/search/${effectiveSearchType}/${searchId}?extended=full`;
    
    const response = await fetch(step3Url, { 
        headers: getTraktHeaders(), 
        agent: ipv6Agent 
    });

    if (!response.ok) {
        console.warn(`[ID-Translator] Trakt search for ${searchType} ${searchId} failed with status ${response.status}`);
        return null; // Don't crash, just report failure
    }

    const data = await response.json();
    const showResult = data.find(item => item.type === 'show');
    
    if (showResult && showResult.show && showResult.show.ids) {
        return showResult.show; // Success!
    }
    return null; // Found nothing
}


export async function translateShowIds(anilistId) {
    const cacheKey = `id:${anilistId}`;
    try {
        const cachedData = await kv.get(cacheKey);
        if (cachedData) {
            console.log(`[Cache HIT] Found IDs for Anilist ID ${anilistId}.`);
            return cachedData;
        }
    } catch (e) { console.error(`KV GET error for key ${cacheKey}:`, e.message); }

    console.log(`[Cache MISS] Fetching new ID map for Anilist ID ${anilistId}...`);
    let simklIds, showTitle;

    try {
        // --- Step 1: Get Simkl ID from Anilist ID ---
        const step1Url = `https://api.simkl.com/search/id?anilist=${anilistId}`;
        const step1Response = await fetch(step1Url, { headers: getSimklHeaders(), agent: ipv6Agent });
        const step1Data = await step1Response.json();
        const simklId = step1Data[0]?.ids?.simkl;
        if (!simklId) throw new Error(`Simkl (Step 1) Error: Could not find Simkl ID`);

        // --- Step 2: Get External IDs ---
        const step2Url = `https://api.simkl.com/anime/${simklId}?extended=full`;
        const step2Response = await fetch(step2Url, { headers: getSimklHeaders(), agent: ipv6Agent });
        const step2Data = await step2Response.json();
        if (!step2Data.ids) throw new Error(`Simkl (Step 2) Error: Simkl ID ${simklId} returned no 'ids' block.`);
        simklIds = step2Data.ids;
        showTitle = step2Data.title;

        // --- Step 3: Get Native Trakt ID (Your Full Incremental Plan) ---
        let traktShow = null;

        // 1. Try IMDb (Most reliable)
        traktShow = await searchTrakt('imdb', simklIds.imdb);

        // 2. Try TMDB (Second most reliable)
        if (!traktShow) {
            traktShow = await searchTrakt('tmdb', simklIds.tmdb);
        }

        // 3. Try TVDB
        if (!traktShow) {
            traktShow = await searchTrakt('tvdb', simklIds.tvdb);
        }

        // 4. Try Simkl's specific 'trakttvslug'
        if (!traktShow) {
            traktShow = await searchTrakt('trakttvslug', simklIds.trakttvslug);
        }
        
        // 5. Try Simkl's *own* 'slug' (Your final fallback)
        if (!traktShow) {
            traktShow = await searchTrakt('slug', simklIds.slug);
        }

        // If all 5 fallbacks fail, we must skip.
        if (!traktShow) {
            throw new Error(`Trakt (Step 3) Error: Could not find Trakt show using any ID (IMDb, TMDB, TVDB, Trakt Slug, or Simkl Slug).`);
        }
        
        const traktIds = traktShow.ids;
        console.log(`[ID-Translator] Success! Found native Trakt ID: ${traktIds.trakt} ("${traktShow.title}")`);

        // 3. COMBINE & CACHE
        const finalIdBlock = {
            title: showTitle || traktShow.title,
            anilist: anilistId,
            simkl: simklId,
            trakt: traktIds.trakt, // The native Trakt ID
            imdb: simklIds.imdb || traktIds.imdb,
            tmdb: simklIds.tmdb || traktIds.tmdb,
            tvdb: simklIds.tvdb || traktIds.tvdb,
            trakt_slug: traktIds.slug,
            simkl_slug: simklIds.slug, // Simkl's own slug
            tvdbslug: simklIds.tvdbslug 
        };

        const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
        await kv.set(cacheKey, finalIdBlock, { ex: thirtyDaysInSeconds });
        console.log(`[Cache SAVE] Saved new ID map for Anilist ID ${anilistId}.`);
        return finalIdBlock;

    } catch (error) {
        console.error(`--- ERROR DURING ID TRANSLATION for ${anilistId} ---`);
        console.error(error.message);
        return null;
    }
}