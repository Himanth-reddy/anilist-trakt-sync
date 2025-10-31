export default async function handler(req, res) {
  try {
    // 1️⃣ Fetch watched shows from Simkl
    const simklResponse = await fetch('https://api.simkl.com/sync/all-items', {
      headers: {
        'Content-Type': 'application/json',
        'simkl-api-key': process.env.SIMKL_API_KEY,
        'Authorization': `Bearer ${process.env.SIMKL_ACCESS_TOKEN || ''}`,
      }
    });

    const simklText = await simklResponse.text(); // log raw response
    console.log('Simkl response:', simklText);

    let simklData;
    try {
      simklData = JSON.parse(simklText);
    } catch (err) {
      return res.status(500).json({
        error: 'Failed to parse Simkl JSON',
        details: simklText,
      });
    }

    // 2️⃣ Push to Trakt
    const traktResponse = await fetch('https://api.trakt.tv/sync/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TRAKT_ACCESS_TOKEN}`,
        'trakt-api-version': '2',
        'trakt-api-key': process.env.TRAKT_CLIENT_ID
      },
      body: JSON.stringify({
        shows: simklData?.shows?.map(show => ({
          ids: { slug: show.show?.slug },
          watched_at: new Date().toISOString()
        })) || []
      })
    });

    const traktText = await traktResponse.text();
    console.log('Trakt response:', traktText);

    return res.status(200).json({
      message: 'Sync complete',
      traktResponse: traktText
    });
  } catch (err
