// /api/sync.js
import fetch from 'node-fetch';

/**
 * Transforms Simkl items (shows, anime, movies) into a format
 * that the Trakt API /sync/watched endpoint understands.
 */
function transformSimklToTrakt(simklData) {
  const traktPayload = {
    movies: [],
    shows: [], // Trakt treats anime as 'shows'
  };

  // Process Movies
  if (simklData.movies) {
    traktPayload.movies = simklData.movies
      .filter(item => item.status === 'watched')
      .map(item => ({
        ids: {
          imdb: item.movie.ids.imdb,
          tmdb: item.movie.ids.tmdb,
        }
      }));
  }

  // Process TV Shows
  if (simklData.shows) {
    const shows = simklData.shows
      .filter(item => item.status === 'watched')
      .map(item => ({
        ids: {
          imdb: item.show.ids.imdb,
          tvdb: item.show.ids.tvdb,
          tmdb: item.show.ids.tmdb,
        }
      }));
    traktPayload.shows.push(...shows);
  }

  // Process Anime
  if (simklData.anime) {
    const anime = simklData.anime
      .filter(item => item.status === 'watched')
      .map(item => ({
        ids: {
          tvdb: item.show.ids.tvdb,
          tmdb: item.show.ids.tmdb,
          imdb: item.show.ids.imdb,
        }
      }));
    traktPayload.shows.push(...anime);
  }

  return traktPayload;
}


export default async function handler(req, res) {
  try {
    // 1. Fetch all items from Simkl
    const simklResponse = await fetch('https://api.simkl.com/sync/all-items', {
      headers: {
        'Content-Type': 'application/json',
        'simkl-api-key': process.env.SIMKL_CLIENT_ID, 
        'Authorization': `Bearer ${process.env.SIMKL_ACCESS_TOKEN}`,
      }
    });

    if (!simklResponse.ok) {
      const errorText = await simklResponse.text();
      console.error('Simkl API error:', errorText);
      return res.status(simklResponse.status).json({ error: 'Failed to fetch from Simkl', details: errorText });
    }
    const simklData = await simklResponse.json();

    // 2. Transform the data for Trakt
    const traktBody = transformSimklToTrakt(simklData);

    if (traktBody.movies.length === 0 && traktBody.shows.length === 0) {
      return res.status(200).json({ message: 'No new watched items to sync from Simkl.' });
    }

    // 3. Push to Trakt
    const traktResponse = await fetch('https://api.trakt.tv/sync/watched', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TRAKT_ACCESS_TOKEN}`,
        'trakt-api-version': '2',
        'trakt-api-key': process.env.TRAKT_CLIENT_ID
      },
      body: JSON.stringify(traktBody)
    });

    if (!traktResponse.ok) {
      const errorText = await traktResponse.text();
      console.error('Trakt API error:', errorText);
      return res.status(traktResponse.status).json({ error: 'Failed to push to Trakt', details: errorText });
    }

    const traktData = await traktResponse.json();
    
    return res.status(200).json({
      message: 'Sync complete',
      traktResponse: traktData
    });

  } catch (err) {
    console.error('Sync failed:', err.message);
    return res.status(500).json({ error: 'Sync process failed', details: err.message });
  }
}
