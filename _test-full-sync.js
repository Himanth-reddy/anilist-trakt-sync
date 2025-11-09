// _test-full-sync.js
// This is our main end-to-end test script.
// It simulates a single "Naruto" scrobble from Anilist.

import { kv } from './lib/kv-client.js';
import { translateShowIds } from './lib/id-translator.js';
import { getBreakpointMap } from './lib/map-builder.js';
import { postToTrakt } from './lib/trakt.js';

// --- This is our translation logic ---
// We've copied this from our plan for api/sync.js
function translateEpisode(scrobble, breakpointMap) {
    const anilistEpisodeNum = scrobble.episodeNumber;

    let traktSeason = 1; // Default
    const reversedMap = [...breakpointMap].reverse();
    
    for (const entry of reversedMap) {
        if (anilistEpisodeNum >= entry.starts_at) {
            traktSeason = entry.season;
            break; 
        }
    }
    
    // As we discovered, for all major anime, the 'number' Trakt expects
    // is the same as the Anilist 'absolute' number.
    // Our map's ONLY job is to find the correct 'season'.
    const traktEpisodeNum = anilistEpisodeNum;

    console.log(`[TRANSLATE] Anilist Ep ${anilistEpisodeNum} -> Trakt S${traktSeason} E${traktEpisodeNum}`);
    
    return {
        traktShowId: scrobble.traktShowId, // We'll add this to the scrobble
        season: traktSeason,
        number: traktEpisodeNum,
        watchedAt: scrobble.watchedAt,
        title: scrobble.showTitle
    };
}


// --- Our Main Test Function ---
async function runFullTest() {
    console.log("--- STARTING FULL END-TO-END TEST ---");

    // 1. DEFINE OUR FAKE SCROBBLE
    // This is the data we would normally get from Anilist
    // We'll use the final episode of "Naruto" (Classic)
    const fakeAnilistScrobble = {
        anilistShowId: 20, // Anilist ID for "Naruto"
        showTitle: "Naruto",
        episodeNumber: 220, // The final episode
        watchedAt: new Date().toISOString() // Set watch time to "now"
    };
    console.log(`[TEST] Simulating scrobble: ${fakeAnilistScrobble.showTitle} - Ep ${fakeAnilistScrobble.episodeNumber}`);

    // 2. STEP 1: TRANSLATE SHOW ID
    // This will call 'lib/id-translator.js'
    // It will hit the cache (if it exists) or fetch from Simkl/Trakt.
    const idMap = await translateShowIds(fakeAnilistScrobble.anilistShowId);
    if (!idMap || !idMap.trakt) {
        console.error("[TEST FAILED] Could not get ID map from id-translator.js");
        return;
    }
    console.log(`[TEST] Found Trakt ID: ${idMap.trakt}`);
    // Add the Trakt ID to our scrobble object for the next steps
    fakeAnilistScrobble.traktShowId = idMap.trakt;
    
    // 3. STEP 2: GET EPISODE MAP
    // This will call 'lib/map-builder.js'
    // It will hit the cache (if it exists) or fetch from Trakt.
    const breakpointMap = await getBreakpointMap(idMap.trakt);
    if (!breakpointMap) {
        console.error("[TEST FAILED] Could not get Breakpoint Map from map-builder.js");
        return;
    }
    console.log(`[TEST] Found Breakpoint Map (Seasons: ${breakpointMap.length})`);

    // 4. STEP 3: TRANSLATE EPISODE
    // This uses the logic from this file to find the season.
    const translatedEpisode = translateEpisode(fakeAnilistScrobble, breakpointMap);

    // 5. STEP 4: POST TO TRAKT
    // This will call 'lib/trakt.js'
    // This sends the *real* scrobble to your Trakt account.
    console.log("[TEST] Sending translated scrobble to Trakt...");
    const postResult = await postToTrakt([translatedEpisode]); // postToTrakt expects an array

    if (postResult.error) {
        console.error("[TEST FAILED] Error posting to Trakt:", postResult);
    } else if (postResult.added && postResult.added.episodes === 1) {
        console.log("\n--- ✅ FULL SYNC TEST SUCCESSFUL! ---");
        console.log("Successfully posted 'Naruto - Episode 220' to your Trakt account.");
        console.log("Check your Trakt profile!");
    } else {
        console.warn("[TEST] Trakt did not report an error, but didn't add the episode.", postResult);
    }
}

// Run the test
runFullTest();