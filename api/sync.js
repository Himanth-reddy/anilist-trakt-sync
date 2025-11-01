// sync.js
const fetch = require('node-fetch');
require('dotenv').config(); // Load all variables from your .env file

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

async function getSimklData(endpoint) {
  try {
    const response = await fetch(`https://api.simkl.com${endpoint}`, { headers: SIMKL_HEADERS });
    if (!response.ok) {
      console.error(`🔴 Simkl GET Error ${endpoint}:`, await response.text());
      return [];
    }
    const data = await response.json();
    // This check is the fix for the ".map is not a function" error
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`🔴 Simkl Fetch Error ${endpoint}:`, err.message);
    return [];
  }
}

async function postToTrakt(endpoint, payload) {
  try {
    const response = await fetch(`https://api.trakt.tv${endpoint}`, {
      method: 'POST',
      headers: TRAKT_HEADERS,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error(`🔴 Trakt POST Error ${endpoint}:`, await response.text());
      return { error: 'Failed to post to Trakt', details: await response.text() };
    }
    return await response.json();
  } catch (err) {
    console.error(`🔴 Trakt Fetch Error ${endpoint}:`, err.message);
    return { error: err.message };
  }
}

// --- Sync Function 1: HISTORY (Recent Scrobbles) ---
async function runHistorySync() {
  // Look back 73 hours (3 days) to find recent items like "One Punch Man"
  const sinceDate = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString();
  
  const history = await getSimklData(`/sync/history/anime?watched_at=${sinceDate}`);

  if (history.length === 0) {
    return 'No new anime history in the last 73 hours.';
  }

  const traktPayload = {
    shows: history.map(item => ({
      watched_at: item.watched_at,
      ids: {
        tvdb: item.show.ids.tvdb,
        imdb: item.show.ids.imdb,
        tmdb: item.show.ids.tmdb,
      },
    })),
  };
  
  const result = await postToTrakt('/sync/history', traktPayload);
  if (result.error) return `History sync failed: ${result.details}`;
  
  const count = result?.added?.episodes || 0;
  return `Synced ${count} new history scrobbles.`;
}

// --- Sync Function 2: RATINGS ---
async function runRatingsSync() {
  const ratings = await getSimklData('/sync/ratings/anime');
  
  if (ratings.length === 0) {
    return 'No anime ratings to sync.';
  }

  const traktPayload = {
    shows: ratings.map(item => ({
      rating: item.rating, // Simkl is 1-10, Trakt is 1-10.
      rated_at: item.rated_at,
      ids: {
        tvdb: item.show.ids.tvdb,
        imdb: item.show.ids.imdb,
        tmdb: item.show.ids.tmdb,
      },
    })),
  };

  const result = await postToTrakt('/sync/ratings', traktPayload);
  if (result.error) return `Ratings sync failed: ${result.details}`;

  const count = result?.added?.shows || 0;
  return `Synced ${count} ratings.`;
}

// --- Sync Function 3: WATCHLIST (Plan to Watch) ---
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
  if (result.error) return `Watchlist sync failed: ${result.details}`;

  const count = result?.added?.shows || 0;
  return `Synced ${count} items to watchlist.`;
}


// --- Main Handler ---
async function main() {
  console.log('--- Starting Simkl-to-Trakt Sync (History, Ratings, Watchlist) ---');
  try {
    // Run all syncs at the same time
    const [
      historyResult,
      ratingsResult,
      watchlistResult
    ] = await Promise.all([
      runHistorySync(),
      runRatingsSync(),
      runWatchlistSync()
    ]);

    // Return the detailed report
    console.log('✅ Full sync complete. See report below:');
    console.log(JSON.stringify({
      history: historyResult,
      ratings: ratingsResult,
      watchlist: watchlistResult,
    }, null, 2));

  } catch (err) {
    console.error('🔴 A fatal error occurred:');
    console.error(err.message);
  }
}

main();
