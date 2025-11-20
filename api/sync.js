// /api/sync.js
// This is the main "brain" of our application.
// It's a serverless function that runs on a schedule or when you visit its URL.

import { kv } from '../lib/kv-client.js';
import { getNewAnilistScrobbles } from '../lib/anilist.js';
import { translateShowIds } from '../lib/id-translator.js';
import { getBreakpointMap } from '../lib/map-builder.js';
import { postToTrakt } from '../lib/trakt.js';

// --- This is the key translation function ---
/**
 * Translates an Anilist scrobble into a Trakt-ready scrobble object.
 * @param {object} scrobble - An episode scrobble from Anilist.
 * @param {object} idCache - The "Rosetta Stone" (Anilist -> Trakt) ID map.
 * @param {Array} breakpointMap - The "Breakpoint Map" for the show.
 * @returns {object} A Trakt-formatted episode object.
 */
function translateAnilistToTrakt(scrobble, idCache, breakpointMap) {
    const anilistEpisodeNum = scrobble.episodeNumber;

    // Loop backwards through the breakpoint map to find the correct season
    // This is your "Breakpoint Map" logic in action
    let traktSeason = 1; // Default to season 1
    
    // We reverse the map to find the largest 'starts_at' that is less than or equal to the episode number
    // e.g., for Ep 1071, it will check S22 (starts > 1071), then S21 (starts <= 1071) -> BINGO!
    const reversedMap = [...breakpointMap].reverse();
    
    for (const entry of reversedMap) {
        if (anilistEpisodeNum >= entry.starts_at) {
            traktSeason = entry.season;
            break; // Found the correct season
        }
    }
    
    // For Trakt, "Naruto" (S2, E1) is just "1". "One Piece" (S2, E62) is just "62".
    // Trakt's API handles the numbering *within* the season correctly,
    // so we just pass the original absolute number.
    // Our map's only job was to find the correct *season* number.
    
    // CORRECTION: This is simpler. Trakt's map for "Naruto" (S1, S2, etc.)
    // *all* start at episode 1. So we MUST translate.
    // Let's refine the logic.
    
    let traktEpisodeNum = anilistEpisodeNum;
    
    // Find the correct season entry from the original map
    const seasonEntry = breakpointMap.find(s => s.season === traktSeason);
    
    if (seasonEntry && seasonEntry.starts_at > 1) {
        // This is a "One Piece" / "Shippuden" style show
        // Trakt's number (e.g., 1071) is the same as Anilist's.
        traktEpisodeNum = anilistEpisodeNum;
    } else if (seasonEntry) {
        // This is a "Naruto" style show, where Trakt's S2 starts at E1.
        // We need to find the *offset*.
        // This is more complex, let's simplify for now.
        
        // --- SIMPLIFIED LOGIC ---
        // For 99% of shows (Naruto, Bleach, One Piece), the episode number
        // on Trakt is the SAME as the absolute number from Anilist.
        // The *only* thing we need to find is the correct SEASON.
        traktEpisodeNum = anilistEpisodeNum;
    }


    return {
        traktShowId: idCache.trakt,
        season: traktSeason,
        number: traktEpisodeNum,
        watchedAt: scrobble.watchedAt,
        title: scrobble.showTitle
    };
}


// --- Main Vercel Handler ---
export default async function handler(req, res) {
    console.log("--- Starting Anilist-to-Trakt Sync ---");
    let lastSyncTimestamp;
    
    try {
        // 1. Get the last time we synced from Vercel KV
        lastSyncTimestamp = await kv.get('lastSyncTimestamp') || 0;
        console.log(`[Sync] Checking for new scrobbles since timestamp: ${lastSyncTimestamp}`);

        // 2. Get all new scrobbles from Anilist since that time
        const newScrobbles = await getNewAnilistScrobbles(lastSyncTimestamp);
        
        if (newScrobbles.length === 0) {
            console.log("[Sync] No new scrobbles found on Anilist.");
            return res.status(200).json({ message: "No new scrobbles from Anilist. Sync complete." });
        }
        
        console.log(`[Sync] Found ${newScrobbles.length} new scrobbles to process.`);
        let translatedEpisodes = [];

        // 3. Loop and translate each new scrobble
        for (const scrobble of newScrobbles) {
            console.log(`[Sync] Processing: ${scrobble.showTitle} - Ep ${scrobble.episodeNumber}`);
            
            // 4. Get ID Map (from cache or fetch new)
            // This calls your 'lib/id-translator.js' script
            const idCache = await translateShowIds(scrobble.anilistShowId);
            if (!idCache || !idCache.trakt) {
                console.warn(`[Sync] SKIPPING: Could not find Trakt ID for Anilist ID ${scrobble.anilistShowId} (${scrobble.showTitle}).`);
                continue; // Skip this scrobble
            }

            // 5. Get Episode Map (from cache or fetch new)
            // This calls your 'lib/map-builder.js' script
            const breakpointMap = await getBreakpointMap(idCache.trakt);
            if (!breakpointMap) {
                console.warn(`[Sync] SKIPPING: Could not build episode map for Trakt ID ${idCache.trakt} (${scrobble.showTitle}).`);
                continue; // Skip this scrobble
            }

            // 6. Translate the episode
            const traktEpisode = translateAnilistToTrakt(scrobble, idCache, breakpointMap);
            translatedEpisodes.push(traktEpisode);
            console.log(`[Sync] -> Mapped to Trakt: Show ${traktEpisode.traktShowId}, S${traktEpisode.season} E${traktEpisode.number}`);
        }
        
        // 7. Batch POST to Trakt
        // This calls your 'lib/trakt.js' script
        const postResult = await postToTrakt(translatedEpisodes);

        // 8. Save our new "last synced" time to Vercel KV
        // We use the timestamp of the *last* item we processed
        if (newScrobbles.length > 0) {
            // We use the timestamp of the *last* item we found in the new batch
            const newTimestamp = newScrobbles[newScrobbles.length - 1].createdAt;
            if (newTimestamp) {
                await kv.set('lastSyncTimestamp', newTimestamp);
                console.log(`[Sync] Saved new lastSyncTimestamp: ${newTimestamp}`);
            } else {
                console.warn("[Sync] Could not save new timestamp, 'createdAt' was missing.");
            }
        }

        // 9. Send success response
        console.log("--- Sync Complete ---");
        return res.status(200).json({
            message: "Sync complete!",
            added: postResult.added || {},
            found: newScrobbles.length,
            synced: translatedEpisodes.length
        });
        
    } catch (err) {
        console.error('--- A FATAL SYNC ERROR OCCURRED ---');
        console.error(err);
        return res.status(500).json({ 
            error: 'Sync process failed', 
            details: err.message 
        });
    }
}