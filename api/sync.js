// /api/sync.js
import fetch from 'node-fetch';

// --- Reusable API Helpers ---

const SIMKL_HEADERS = {
  'Content-Type': 'application/json',
  'simkl-api-key': process.env.SIMKL_CLIENT_ID,
  'Authorization': `Bearer ${process.env.SIMKL_ACCESS_TOKEN}`,
};

const TRAKT_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.TRAKT_ACCESS_TOKEN}`,
  'trakt-api-version': '2',
  'trakt-api-key': process.env.TRAKT_CLIENT_ID,
};

/**
 * A robust helper to get data from Simkl.
 * Always returns an array, even on failure.
 */
async function getSimklData(endpoint) {
  try {
    const response = await fetch(`https://api.simkl.com${endpoint}`, { headers: SIMKL_HEADERS });
    if (!response.ok) {
      console.error(`Simkl GET Error ${endpoint}:`, await response.text());
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`Simkl Fetch Error ${endpoint}:`, err.message);
    return [];
  }
}

/**
 * A robust helper to post data to Trakt.
 */
async function postToTrakt(endpoint, payload) {
  try {
    const response = await fetch(`https://api.trakt.tv${endpoint}`, {
      method: 'POST',
      headers: TRAKT_HEADERS,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error(`Trakt POST Error ${endpoint}:`, await response.text());
      return { error: 'Failed to post to Trakt' };
    }
    return await response.json();
  } catch (err) {
    console.error(`Trakt Fetch Error ${endpoint}:`, err.message);
    return { error: err.message };
  }
}

// --- Sync Function 1: HISTORY (Scrobbles) ---
async function runHistorySync() {
  const sinceDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const history = await getSimklData(`/sync/history/anime?watched_at=${sinceDate}`);

  if (history.length === 0) {
    return 'No new anime history in the last 25 hours.';
  }

  const traktPayload = {
    shows: history.map(item => ({
      watched_at: item.watched_at,
      ids: {
        tvdb: item.show.ids.tvdb,
        imdb: item.show.ids.imdb,
        tmdb: item.show.ids.tmdb,
      },
      seasons: [{
        number: item.episode.season,
        episodes: [{ number: item.episode.number }]
      }]
    })),
  };
  
  const result = await postToTrakt('/sync/history', traktPayload);
  const count = result?.added?.episodes || 0;
  return `Synced ${count} new history scrobbles.`;
}

// --- Sync Function 2: COLLECTION (Watched/Completed Episodes) ---
async function runCollectionSync() {
  // Get all shows that are 'watching' or 'completed'
  const [watching, completed] = await Promise.all([
    getSimklData('/sync/all-items/anime/watching'),
    getSimklData('/sync/all-items/anime/completed')
  ]);
  const allItems = [...watching, ...completed];

  if (allItems.length === 0) {
    return 'No "watching" or "completed" items to sync.';
  }

  const traktPayload = {
    shows: allItems.map(item => ({
      ids: {
        tvdb: item.show.ids.tvdb,
        imdb: item.show.ids.imdb,
        tmdb: item.show.ids.tmdb,
      },
      // This groups all watched episodes by season for Trakt
      seasons: Object.values(
        item.episodes.reduce((acc, ep) => {
          const season = ep.season;
          if (!acc[season]) {
            acc[season] = { number: season, episodes: [] };
          }
          acc[season].episodes.push({ number: ep.number });
          return acc;
        }, {})
      ),
    })),
  };

  const result = await postToTrakt('/sync/collection', traktPayload);
  const count = result?.added?.episodes || 0;
  return `Synced ${count} episodes to collection.`;
}

// --- Sync Function 3: RATINGS ---
async function runRatingsSync() {
  const ratings = await getSimklData('/sync/ratings/anime');
  
  if (ratings.length === 0) {
    return 'No anime ratings to sync.';
  }

  const traktPayload = {
    shows: ratings.map(item => ({
      rating: item.rating, // Simkl is 1-10, Trakt is 1-10. Perfect match.
      rated_at: item.rated_at,
      ids: {
        tvdb: item.show.ids.tvdb,
        imdb: item.show.ids.imdb,
        tmdb: item.show.ids.tmdb,
      },
    })),
  };

  const result = await postToTrakt('/sync/ratings', traktPayload);
  const count = result?.added?.shows || 0;
  return `Synced ${count} ratings.`;
}

// --- Sync Function 4: WATCHLIST (Plan to Watch) ---
async function runWatchlistSync() {
  const watchlist = await getSimklData('/sync/all-items/anime/plantowatch');
  
  if (watchlist.length === 0) {
    return 'No "plan to watch" items to sync.';
  }
  
  const traktPayload = {
    shows: watchlist.map(item => ({
      ids: {
        tvdb: item.show.ids.tvdb,
        imdb: item.show.ids.imdb,
        tmdb: item.show.ids.tmdb,
      },
    })),
  };
  
  const result = await postToTrakt('/sync/watchlist', traktPayload);
  const count = result?.added?.shows || 0;
  return `Synced ${count} items to watchlist.`;
}


// --- Main Handler ---
export default async function handler(req, res) {
  try {
    // Run all syncs at the same time
    const [
      historyResult,
      collectionResult,
      ratingsResult,
      watchlistResult
    ] = await Promise.all([
      runHistorySync(),
      runCollectionSync(),
      runRatingsSync(),
      runWatchlistSync()
    ]);

    // Return the detailed report you wanted
    return res.status(200).json({
      message: 'Full Simkl-to-Trakt sync complete.',
      details: {
        history: historyResult,
        collection: collectionResult,
        ratings: ratingsResult,
        watchlist: watchlistResult,
      },
    });

  } catch (err) {
    console.error('Full sync process failed:', err.message);
    return res.status(500).json({ 
      error: 'Full sync process failed', 
      details: err.message 
    });
  }
}
