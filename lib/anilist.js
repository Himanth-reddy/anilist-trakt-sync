// lib/anilist.js
// Handles all communication with the Anilist GraphQL API.

import https from 'https';
import dns from 'dns';

// --- START IPv6 FIX ---
// We'll use this for all external calls, just to be safe.
const lookupIPv6 = (hostname, options, callback) => {
    dns.lookup(hostname, { family: 6 }, (err, address, family) => {
        callback(err, address, family);
    });
};
const ipv6Agent = new https.Agent({
    lookup: lookupIPv6
});
// --- END IPv6 FIX ---

const ANILIST_API_URL = 'https://graphql.anilist.co';

/**
 * Fetches the user ID for the authenticated user.
 * This is our "health check".
 */
async function getAnilistUserId() {
    const query = `query { Viewer { id name } }`;
    
    const response = await fetch(ANILIST_API_URL, {
        method: 'POST',
        agent: ipv6Agent,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${process.env.ANILIST_ACCESS_TOKEN}`
        },
        body: JSON.stringify({ query: query })
    });

    const data = await response.json();
    if (data.data && data.data.Viewer) {
        console.log(`[Anilist] Authenticated as: ${data.data.Viewer.name} (ID: ${data.data.Viewer.id})`);
        return data.data.Viewer.id;
    } else {
        console.error("[Anilist] Error: Could not authenticate with ANILIST_ACCESS_TOKEN.");
        return null;
    }
}

/**
 * Fetches all new "watched episode" activities since the last time we synced.
 * @param {number} lastSyncTimestamp - The Unix timestamp of the last sync.
 * @returns {Promise<Array>} A list of new scrobble objects.
 */
export async function getNewAnilistScrobbles(lastSyncTimestamp) {
    const userId = await getAnilistUserId();
    if (!userId) return [];

    // This is the GraphQL query we tested in the terminal
    const query = `
    query($userId: Int, $minCreatedAt: Int) {
      Page(page: 1, perPage: 50) { # Get up to 50 new activities per sync
        activities(
          userId: $userId, 
          type: ANIME_LIST, 
          sort: ID_DESC,
          createdAt_greater: $minCreatedAt
        ) {
          ... on ListActivity {
            id
            media {
              id
              title { romaji }
            }
            status
            progress # This is the absolute episode number
            createdAt # This is the Unix timestamp
          }
        }
      }
    }`;

    const variables = {
        userId: userId,
        minCreatedAt: lastSyncTimestamp
    };

    const response = await fetch(ANILIST_API_URL, {
        method: 'POST',
        agent: ipv6Agent,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${process.env.ANILIST_ACCESS_TOKEN}`
        },
        body: JSON.stringify({ query, variables })
    });

    const data = await response.json();
    
    if (data.data && data.data.Page && data.data.Page.activities) {
        // We only care about "watched episode" actions
        const newScrobbles = data.data.Page.activities
            .filter(a => a.status === 'watched episode' && a.progress)
            .map(a => ({
                anilistShowId: a.media.id,
                showTitle: a.media.title.romaji,
                episodeNumber: parseInt(a.progress, 10),
                watchedAt: new Date(a.createdAt * 1000).toISOString(), // Convert Unix to ISO 8601 string
                createdAt: a.createdAt // <-- THE NEW, REQUIRED LINE
            }));
        
        // The API returns most recent first, so we reverse to sync oldest-to-newest
        return newScrobbles.reverse();
    }
    
    return [];
}