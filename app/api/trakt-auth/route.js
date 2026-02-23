import { db } from '../../../utils/db.js';

export const dynamic = 'force-dynamic';

const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
const TRAKT_CLIENT_SECRET = process.env.TRAKT_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

export async function GET() {
  if (!TRAKT_CLIENT_ID) {
    return Response.json({ error: 'Missing TRAKT_CLIENT_ID' }, { status: 500 });
  }

  const authUrl =
    `https://trakt.tv/oauth/authorize` +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(TRAKT_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  return Response.json({ authUrl, redirectUri: REDIRECT_URI });
}

export async function POST(request) {
  if (!TRAKT_CLIENT_ID || !TRAKT_CLIENT_SECRET) {
    return Response.json({ error: 'Missing Trakt client credentials' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const code = body?.code;
  if (!code) {
    return Response.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  const response = await fetch('https://api.trakt.tv/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Anilist-Trakt-Sync/1.0' },
    body: JSON.stringify({
      code,
      client_id: TRAKT_CLIENT_ID,
      client_secret: TRAKT_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    const err = await response.text();
    return Response.json({ error: `Token exchange failed: ${err}` }, { status: 400 });
  }

  const data = await response.json();
  await db.setConfig('trakt:token', data.access_token);
  await db.setConfig('trakt:refresh_token', data.refresh_token);

  return Response.json({
    message: 'Trakt tokens updated',
    expires_in: data.expires_in
  });
}
