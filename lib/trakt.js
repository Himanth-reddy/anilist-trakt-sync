// lib/trakt.js
// Handles all communication *to* the Trakt API.

import https from 'https';
import dns from 'dns';

// --- START IPv6 FIX ---
const lookupIPv6 = (hostname, options, callback) => {
    dns.lookup(hostname, { family: 6 }, (err, address, family) => {
        callback(err, address, family);
    });
};
const ipv6Agent = new https.Agent({
    lookup: lookupIPv6
});
// --- END IPv6 FIX ---

/**
 * Posts a batch of translated episodes to your Trakt history.
 * @param {Array} translatedEpisodes - The array of scrobbles to add.
 * @returns {Promise<object>} The JSON response from Trakt.
 */
export async function postToTrakt(translatedEpisodes) {
    if (!translatedEpisodes || translatedEpisodes.length === 0) {
        return { message: "Nothing to post to Trakt." };
    }

    // We must build the complex, nested JSON payload that Trakt loves
    const payload = {
        shows: []
    };

    // This loop groups all episodes by their show
    for (const ep of translatedEpisodes) {
        // Find if we've already added this show to the batch
        let showEntry = payload.shows.find(s => s.ids.trakt === ep.traktShowId);

        // If not, create the show entry
        if (!showEntry) {
            showEntry = {
                ids: { trakt: ep.traktShowId },
                seasons: []
            };
            payload.shows.push(showEntry);
        }

        // Find if we've already added this season
        let seasonEntry = showEntry.seasons.find(s => s.number === ep.season);

        // If not, create the season entry
        if (!seasonEntry) {
            seasonEntry = {
                number: ep.season,
                episodes: []
            };
            showEntry.seasons.push(seasonEntry);
        }

        // Add the episode to the season
        seasonEntry.episodes.push({
            number: ep.number,
            watched_at: ep.watchedAt
        });
    }

    // Now, send the final compiled payload to Trakt
    console.log(`[Trakt] Posting ${translatedEpisodes.length} new scrobbles to Trakt...`);
    
    try {
        const response = await fetch("https://api.trakt.tv/sync/history", {
            method: 'POST',
            agent: ipv6Agent,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.TRAKT_ACCESS_TOKEN}`,
                'trakt-api-key': process.env.TRAKT_CLIENT_ID,
                'trakt-api-version': '2'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Trakt API POST failed with status ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        console.log(`[Trakt] Successfully added: ${data.added?.episodes || 0} episodes.`);
        return data;

    } catch (err) {
        console.error("[Trakt] Error posting to Trakt:", err.message);
        return { error: err.message };
    }
}