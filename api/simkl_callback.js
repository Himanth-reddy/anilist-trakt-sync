// /api/simkl_callback.js
import fetch from 'node-fetch'
export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  try {
    const response = await fetch('https://api.simkl.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.SIMKL_CLIENT_ID,
        client_secret: process.env.SIMKL_CLIENT_SECRET,
        redirect_uri: process.env.SIMKL_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Simkl OAuth failed:', data);
      return res.status(500).json({ error: 'Simkl OAuth failed', details: data });
    }

    return res.status(200).json({
      message: 'Simkl authentication successful',
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in
    });
  } catch (err) {
    console.error('Simkl OAuth failed:', err);
    return res.status(500).json({ error: 'Simkl OAuth failed' });
  }
}
