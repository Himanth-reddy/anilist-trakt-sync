import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const SIMKL_API_KEY = process.env.SIMKL_API_KEY;
    const SIMKL_ACCESS_TOKEN = process.env.SIMKL_ACCESS_TOKEN;
    const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
    const TRAKT_ACCESS_TOKEN = process.env.TRAKT_ACCESS_TOKEN;

    // Fetch latest watched items from Simkl
    const simklResponse = await fetch("https://api.simkl.com/sync/all-items", {
      headers: {
        "Authorization": `Bearer ${SIMKL_ACCESS_TOKEN}`,
        "simkl-api-key": SIMKL_API_KEY,
        "Content-Type": "application/json"
      },
    });

    if (!simklResponse.ok) {
      throw new Error(`Simkl API error: ${simklResponse.status}`);
    }

    const simklData = await simklResponse.json();

    // Example: take latest anime episode and send to Trakt
    if (simklData?.anime?.watched?.length > 0) {
      const latest = simklData.anime.watched[0];

      await fetch("https://api.trakt.tv/sync/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${TRAKT_ACCESS_TOKEN}`,
          "trakt-api-version": "2",
          "trakt-api-key": TRAKT_CLIENT_ID,
        },
        body: JSON.stringify({
          episodes: [
            {
              ids: { simkl: latest.ids?.simkl || latest.ids?.mal }
            }
          ]
        }),
      });
    }

    res.status(200).json({ success: true, message: "Sync completed" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

