// lib/id-translator.js
// FINAL VERSION: Using the 'Fribb/anime-lists' database as you suggested.
// This is the correct and simplest solution.

import { kv } from './kv-client.js';
import https from 'https://';
import dns from 'dns';

// --- START IPv6 FIX ---
const lookupIPv6 = (hostname, options, callback) => {
    dns.lookup(hostname, { family: 6 }, (err, address, family) => {
        callback(err, address, family);
    });
};
const ipv6Agent = new https.Agent({ lookup: lookupIPv6 });
// --- END IPv6 FIX ---

// URL to the Fribb database
const FRIBB_DB_URL = 'https://raw.githubusercontent.com/Fribb/anime-lists/master/anidb-relations.json';
const sevenDaysInSeconds = 7 * 24 * 60 * 60; // Your weekly reload

const getTraktHeaders = () => ({
    'Content-Type': 'application/json',
    'trakt-api-key': process.env.TRAKT_CLIENT_ID,
    'trakt-api-version': '2'
});

/**
 * Loads the Fribb/anime-lists database.
 * 1. Tries to get it from Vercel KV.
 * 2. If not in KV (or > 7 days old), downloads it from GitHub and saves it to KV.
 */
async function getFribbDatabase() {
    const kvKey = 'fribb-database-v1'; // We'll use this key to store the whole DB

    // 1. Try Vercel KV (fastest cache)
    try {
        const db = await kv.get(kvKey);
        if (db) {
            console.log("[ID-Translator] Cache HIT: Using Fribb DB from Vercel KV.");
            return db; // KV stores the JSON object directly
        }
    } catch (e) { console.warn(`[ID-Translator] KV GET error: ${e.message}`); }

    // 2. Cache MISS: Fetch from GitHub
    console.log(`[ID-Translator] Cache MISS: Fetching new Fribb DB from GitHub...`);
    const response = await fetch(FRIBB_DB_URL);
    if (!response.ok) {
        throw new Error("Failed to download Fribb/anime-lists from GitHub.");
    }
    const db = await response.json();
    
    // 3. Save the new DB to Vercel KV for 7 days
    try {
        await kv.set(kvKey, db, { ex: sevenDaysInSeconds });
        console.log("[ID-Translator] Saved fresh Fribb DB to Vercel KV.");
    } catch (e) {
        console.error(`[ID-Translator] FAILED to save Fribb DB to KV: ${e.message}`);
    }
    
    return db;
}

/**
 * Recursively finds the "main" entry for an anime (e.g., finds S1 from S2)
 * @param {object} db - The Fribb database
 * @param {number} anilistId - The Anilist ID to start from
 * @returns {object} The database entry for the *main* show.
 */
function findMainShowEntry(db, anilistId) {
    const entry = db.find(item => item.anilist_id === anilistId);
    if (!entry) return null;

    // Check if this show is a "sequel" or "other" to another show
    if (entry.relation === 'sequel' || entry.relation === 'other') {
        const mainShowAnilistId = entry.related_anilist_id;
        console.log(`[ID-Translator] Found relation: ${anilistId} is a sequel to ${mainShowAnilistId}. Following relation...`);
        // Recursively call to find the *true* main show
        return findMainShowEntry(db, mainShowAnilistId);
    }
    
    // This is the main show (or we couldn't find a relation), return it
    return entry;
}

/**
 * Searches Trakt using a specific ID.
 */
async function searchTrakt(idsToSearch) {
    let traktShow = null;
    
    // 1. Try IMDb (Most reliable)
    if (idsToSearch.imdb_id) {
        const res = await fetch(`https://api.trakt.tv/search/imdb/${idsToSearch.imdb_id}?extended=full`, { headers: getTraktHeaders(), agent: ipv6Agent });
        const data = await res.json();
        traktShow = data.find(item => item.type === 'show')?.show;
        if (traktShow) return traktShow.ids;
    }
    // 2. Try TMDB
    if (idsToSearch.themoviedb_id) {
        const res = await fetch(`https://api.trakt.tv/search/tmdb/${idsToSearch.themoviedb_id}?extended=full`, { headers: getTraktHeaders(), agent: ipv6Agent });
        const data = await res.json();
        traktShow = data.find(item => item.type === 'show')?.show;
        if (traktShow) return traktShow.ids;
    }
    // 3. Try TVDB
    if (idsToSearch.thetvdb_id) {
        const res = await fetch(`https://api.trakt.tv/search/tvdb/${idsToSearch.thetvdb_id}?extended=full`, { headers: getTraktHeaders(), agent: ipv6Agent });
        const data = await res.json();
        traktShow = data.find(item => item.type === 'show')?.show;
        if (traktShow) return traktShow.ids;
    }
    return null;
}

/**
 * Translates an Anilist Show ID to a Trakt ID using the Fribb database.
 */
export async function translateShowIds(anilistId) {
    const cacheKey = `id:fribb:${anilistId}`; // Use a new key format
    
    // 1. Check KV for the final, small, translated ID block
    try {
        const cachedData = await kv.get(cacheKey);
        if (cachedData) {
            console.log(`[Cache HIT] Found IDs for Anilist ID ${anilistId}.`);
            return cachedData;
        }
    } catch (e) { console.error(`KV GET error for key ${cacheKey}:`, e.message); }
    
    console.log(`[Cache MISS] Fetching new ID map for Anilist ID ${anilistId}...`);

    // 2. Load the master database (from cache or GitHub)
    let animeDB;
    try {
        animeDB = await getFribbDatabase();
    } catch (e) {
        console.error(`--- FATAL ERROR: Could not load Fribb database: ${e.message}`);
        return null;
    }

    // 3. Find the MAIN show entry (This solves the "Dandadan S2" problem)
    const mainShowEntry = findMainShowEntry(animeDB, anilistId);

    if (!mainShowEntry) {
        console.error(`--- ERROR DURING ID TRANSLATION for ${anilistId} ---`);
        console.error(`Could not find Anilist ID ${anilistId} in the Fribb database.`);
        return null;
    }

    // 4. Extract the IDs we need from the MAIN show
    const idsToSearch = {
        themoviedb_id: mainShowEntry.themoviedb_id,
        thetvdb_id: mainShowEntry.thetvdb_id,
        imdb_id: mainShowEntry.imdb_id,
    };

    if (!idsToSearch.themoviedb_id && !idsToSearch.thetvdb_id && !idsToSearch.imdb_id) {
        console.error(`--- ERROR DURING ID TRANSLATION for ${anilistId} ---`);
        console.error(`Fribb database has no TMDB/TVDB/IMDb for ${mainShowEntry.title} (Main Anilist ID: ${mainShowEntry.anilist_id}).`);
        return null;
    }

    // 5. Find the native Trakt ID
    const traktIds = await searchTrakt(idsToSearch);
    if (!traktIds) {
        console.error(`--- ERROR DURING ID TRANSLATION for ${anilistId} ---`);
        console.error(`Could not find ${mainShowEntry.title} on Trakt using its TMDB/TVDB/IMDb IDs.`);
        return null;
    }

    // 6. Save this small, perfect mapping to KV for 30 days
    const finalIdBlock = {
        title: mainShowEntry.title,
        anilist: anilistId, // The original S2 ID
        trakt: traktIds.trakt, // The S1 Trakt ID
        tmdb: traktIds.tmdb,
        imdb: traktIds.imdb,
        tvdb: traktIds.tvdb
    };
    
    const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
    await kv.set(cacheKey, finalIdBlock, { ex: thirtyDaysInSeconds });
    console.log(`[Cache SAVE] Saved new ID map for Anilist ID ${anilistId}.`);
    
    return finalIdBlock;
}