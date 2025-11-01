// /api/sync.js
import fetch from 'node-fetch';

/**
 * Fetches the recent anime watch history from Simkl (last 24 hours).
 */
async function getSimklHistory() {
  // 1. Get the date from 25 hours ago to make sure we don't miss anything
  const sinceDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  
  const endpoint = `https://api.simkl.com/sync/history/anime?watched_at=${sinceDate}`;
  
  const response = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      'simkl-api-key': process.env.SIMKL_CLIENT_ID,
      'Authorization': `Bearer ${process.env.SIMKL_ACCESS_TOKEN}`,
    }
  });

  if (!response.ok) {
    console.error(`Failed to fetch ${endpoint}:`, await response.text());
    return []; // Return empty array on failure
  }
  return await response.json();
}

/**
 * Transforms Simkl history items into the Trakt history format.
 */
function transformHistoryToTrakt(items) {
  return items.map(item => ({
    watched_at: item.watched_at, // <-- This is the timestamp!
    ids: {
      imdb: item.show?.ids?.imdb,
      tmdb: item.show?.ids?.tmdb,
      tvdb: item.show?.ids?.tvdb,
    }
  }));
}

export default async function handler(req, res) {
  try {
    // 1. Fetch all RECENTLY WATCHED anime from Simkl
    const animeHistory = await getSimklHistory();

    // 2. Create a human-readable list for the response
    const syncedItemsList = animeHistory.map(item => 
      `${item.show.title} (S${item.episode.season} E${item.episode.number})`
    );

    if (syncedItemsList.length === 0) {
      return res.status(200).json({ 
        message: 'No new anime watch history found in the last 25 hours.' 
      });
    }

    // 3. Transform the data into the Trakt format
    const traktPayload = {
      shows: transformHistoryToTrakt(animeHistory),
      movies: [] // Always empty
    };
    
    // 4. Push to Trakt's HISTORY endpoint
    const traktResponse = await fetch('https://api.trakt.tv/sync/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TRAKT_ACCESS_TOKEN}`,
        'trakt-api-version': '2',
        'trakt-api-key': process.env.TRAKT_CLIENT_ID
      },
      body: JSON.stringify(traktPayload)
    });

    if (!traktResponse.ok) {
      const errorText = await traktResponse.text();
      console.error('Trakt API error:', errorText);
      return res.status(traktResponse.status).json({ error: 'Failed to push history to Trakt', details: errorText });
    }

    const traktData = await traktResponse.json();
    
    // 5. Send the final, detailed response
    return res.status(200).json({
      message: `Timestamped history sync complete! Synced ${syncedItemsList.length} anime episode(s).`,
      synced_items: syncedItemsList,
      trakt_response: traktData
    });

  } catch (err) {
    console.error('Sync failed:', err.message);
    return res.status(500).json({ error: 'Sync process failed', details: err.message });
  }
}
