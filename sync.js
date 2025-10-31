// /api/sync.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    // Fetch watched shows from Simkl
    const simklResponse = await fetch('https://api.simkl.com/sync/all-items', {
      headers: {
        'Content-Type': 'application/json',
        'simkl-api-key': process.env.SIMKL_API_KEY
      }
    });
    const simklData = await simklResponse.json();

    // Example: sync shows to Trakt (you can expand later)
    const traktResponse = await fetch('https://api.trakt.tv/sync/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TRAKT_ACCESS_TOKEN}`,
        'trakt-api-version': '2',
        'trakt-api-key': process.env.TRAKT_CLIENT_ID
      },
      body: JSON.stringify({
        shows: simklData.shows?.map(show => ({
          ids: { slug: show.show.slug },
          watched_at: new Date().toISOString()
        }))
      })
    });

    const traktData = await traktResponse.json();

    return res.status(200).json({
      message: 'Sync complete',
      traktResponse: traktData
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Sync failed', details: err.message });
  }
}
