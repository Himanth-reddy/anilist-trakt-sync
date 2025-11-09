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
    let simklIds, traktIds, showTitle;

    try {
        // --- Step 2a: Get Simkl ID ---
        const step1Url = `https://api.simkl.com/search/id?anilist=${anilistId}`;
        const step1Response = await fetch(step1Url, { headers: getSimklHeaders(), agent: ipv6Agent });
        const step1Data = await step1Response.json();
        const simklId = step1Data[0]?.ids?.simkl;
        if (!simklId) throw new Error(`Simkl (Step 1) Error: Could not find Simkl ID`);

        // --- Step 2b: Get External IDs ---
        const step2Url = `https://api.simkl.com/anime/${simklId}?extended=full`;
        const step2Response = await fetch(step2Url, { headers: getSimklHeaders(), agent: ipv6Agent });
        const step2Data = await step2Response.json();
        if (!step2Data.ids) throw new Error(`Simkl (Step 2) Error: Simkl ID ${simklId} returned no 'ids' block.`);
        simklIds = step2Data.ids;
        showTitle = step2Data.title;

        // --- Step 2c: Get Native Trakt ID ---
        const searchType = simklIds.imdb ? 'imdb' : 'tmdb';
        const searchId = simklIds.imdb ? simklIds.imdb : simklIds.tmdb;
        if (!searchId) throw new Error(`Simkl (Step 2) Error: No IMDb or TMDB ID to search Trakt.`);
        
        const step3Url = `https://api.trakt.tv/search/${searchType}/${searchId}?extended=full`;
        const step3Response = await fetch(step3Url, { headers: getTraktHeaders(), agent: ipv6Agent });
        const step3Data = await step3Response.json();
        const showResult = step3Data.find(item => item.type === 'show');
        if (!showResult || !showResult.show || !showResult.show.ids) {
            throw new Error(`Trakt (Step 3) Error: Could not find Trakt show`);
        }
        traktIds = showResult.show.ids;

        // 3. COMBINE & CACHE
        const finalIdBlock = {
            title: showTitle || showResult.show.title,
            anilist: anilistId,
            simkl: simklId,
            trakt: traktIds.trakt,
            imdb: simklIds.imdb || traktIds.imdb,
            tmdb: simklIds.tmdb || traktIds.tmdb,
            tvdb: simklIds.tvdb || traktIds.tvdb,
            trakt_slug: traktIds.slug,
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