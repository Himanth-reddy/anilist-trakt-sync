// lib/id-translator.js
// This script is our "Rosetta Stone" translator.
// It's called when our sync finds an Anilist show that isn't in our cache.

import { redis } from './redis-client.js';
import https from 'https';
import dns from 'dns';

// --- START IPv6 FIX ---
// As we discovered, your environment needs to force IPv6 for Simkl/Trakt.
const lookupIPv6 = (hostname, options, callback) => {
    dns.lookup(hostname, { family: 6 }, (err, address, family) => {
        callback(err, address, family);
    });
};
const ipv6Agent = new https.Agent({
    lookup: lookupIPv6
});
// --- END IPv6 FIX ---


// --- API Client Helpers ---

const getSimklHeaders = () => ({
    'Content-Type': 'application/json',
    'simkl-api-key': process.env.SIMKL_CLIENT_ID
});

const getTraktHeaders = () => ({
    'Content-Type': 'application/json',
    'trakt-api-key': process.env.TRAKT_CLIENT_ID,
    'trakt-api-version': '2'
});

// --- Main Translation Function ---

/**
 * Translates an Anilist Show ID to a comprehensive block of all related IDs
 * from Simkl and Trakt. Caches the result in Upstash Redis.
 *
 * @param {string} anilistId - The show's ID from anilist.co (e.g., "21" for One Piece).
 * @returns {Promise<object | null>} The full, combined ID block, or null on failure.
 */
export async function translateShowIds(anilistId) {
    const cacheKey = `id:${anilistId}`;
    
    // 1. CHECK CACHE FIRST (Your "Just-in-Time" plan)
    try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log(`[Cache HIT] Found IDs for Anilist ID ${anilistId}.`);
            return cachedData; // Redis stores objects, no parse needed
        }
    } catch (e) {
        console.error(`Redis GET error for key ${cacheKey}:`, e.message);
    }

    // 2. CACHE MISS: Start the full 3-step API translation
    console.log(`[Cache MISS] Fetching new ID map for Anilist ID ${anilistId}...`);
    let simklIds, traktIds, showTitle;

    try {
        // --- Step 2a: Get Simkl ID from Anilist ID ---
        const step1Url = `https://api.simkl.com/search/id?anilist=${anilistId}`;
        const step1Response = await fetch(step1Url, { 
            headers: getSimklHeaders(),
            agent: ipv6Agent 
        });
        const step1Data = await step1Response.json();
        const simklId = step1Data[0]?.ids?.simkl;
        if (!simklId) {
            throw new Error(`Simkl (Step 1) Error: Could not find Simkl ID for Anilist ID ${anilistId}`);
        }

        // --- Step 2b: Get External IDs (TMDB/IMDb) from Simkl ID ---
        const step2Url = `https://api.simkl.com/anime/${simklId}?extended=full`;
        const step2Response = await fetch(step2Url, { 
            headers: getSimklHeaders(),
            agent: ipv6Agent 
        });
        const step2Data = await step2Response.json();
        if (!step2Data.ids) {
            throw new Error(`Simkl (Step 2) Error: Simkl ID ${simklId} returned no 'ids' block.`);
        }
        simklIds = step2Data.ids;
        showTitle = step2Data.title;

        // Use the fallback logic: IMDb first, then TMDB
        const searchType = simklIds.imdb ? 'imdb' : 'tmdb';
        const searchId = simklIds.imdb ? simklIds.imdb : simklIds.tmdb;
        if (!searchId) {
             throw new Error(`Simkl (Step 2) Error: Simkl ID ${simklId} has no IMDb or TMDB ID to search Trakt with.`);
        }
        
        // --- Step 2c: Get Native Trakt ID from IMDb/TMDB ID ---
        const step3Url = `https://api.trakt.tv/search/${searchType}/${searchId}?extended=full`;
        const step3Response = await fetch(step3Url, { 
            headers: getTraktHeaders(),
            agent: ipv6Agent 
        });
        const step3Data = await step3Response.json();
        const showResult = step3Data.find(item => item.type === 'show');
        if (!showResult || !showResult.show || !showResult.show.ids) {
            throw new Error(`Trakt (Step 3) Error: Could not find Trakt show for ${searchType} ID ${searchId}`);
        }
        traktIds = showResult.show.ids;

        // 3. COMBINE & CACHE
        // This is the perfect object you wanted to build
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

        // Save to Redis. We'll set it to expire in 30 days.
        const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
        await redis.set(cacheKey, finalIdBlock, { ex: thirtyDaysInSeconds });
        console.log(`[Cache SAVE] Saved new ID map for Anilist ID ${anilistId}.`);

        return finalIdBlock;

    } catch (error) {
        console.error(`--- ERROR DURING ID TRANSLATION for ${anilistId} ---`);
        console.error(error.message);
        console.error("--------------------------------------------------");
        return null; // Return null so the sync can skip this item
    }
}