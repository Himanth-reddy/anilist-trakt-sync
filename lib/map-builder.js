// lib/map-builder.js
import { kv } from '../utils/kv.js';
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

const traktFetch = (endpoint) => {
    return fetch(`https://api.trakt.tv${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            'trakt-api-key': process.env.TRAKT_CLIENT_ID,
            'trakt-api-version': '2'
        },
        agent: ipv6Agent
    });
};

function createBreakpointMap(seasons) {
    const breakpointMap = [];
    const sortedSeasons = seasons.filter(s => s.number > 0).sort((a, b) => a.number - b.number);
    for (const season of sortedSeasons) {
        let startingEpisode = Infinity;
        let hasAbsoluteNumbers = false;
        if (season.episodes && season.episodes.length > 0) {
            for (const episode of season.episodes) {
                const absNum = episode.number_abs || episode.absolute_number;
                if (absNum) {
                    hasAbsoluteNumbers = true;
                    if (absNum < startingEpisode) startingEpisode = absNum;
                }
            }
            if (!hasAbsoluteNumbers) startingEpisode = season.episodes[0]?.number || 1;
        } else { startingEpisode = 1; }
        breakpointMap.push({ season: season.number, starts_at: startingEpisode });
    }
    return breakpointMap;
}

export async function getBreakpointMap(nativeTraktId) {
    const cacheKey = `map:${nativeTraktId}`;
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;

    try {
        const cachedData = await kv.get(cacheKey);
        if (cachedData) {
            console.log(`[Cache HIT] Found map for Trakt ID ${nativeTraktId}.`);
            return cachedData;
        }
    } catch (e) { console.error(`KV GET error for key ${cacheKey}:`, e.message); }

    console.log(`[Cache MISS] Fetching new map for Trakt ID ${nativeTraktId}...`);
    let fullMap;
    try {
        const response = await traktFetch(`/shows/${nativeTraktId}/seasons?extended=episodes`);
        if (!response.ok) throw new Error(`Trakt API returned status ${response.status}`);
        fullMap = await response.json();
    } catch (err) {
        console.error(`Failed to fetch Trakt map for ${nativeTraktId}: ${err.message}`);
        return null;
    }

    const breakpointMap = createBreakpointMap(fullMap);

    try {
        await kv.set(cacheKey, breakpointMap, { ex: sevenDaysInSeconds });
        console.log(`[Cache SAVE] Saved new map for Trakt ID ${nativeTraktId}.`);
    } catch (e) { console.error(`KV SET error for key ${cacheKey}:`, e.message); }

    return breakpointMap;
}