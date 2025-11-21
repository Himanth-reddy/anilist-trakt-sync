import { kv } from '../utils/kv.js';

const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
const TRAKT_CLIENT_SECRET = process.env.TRAKT_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'; // Standard for manual auth

/**
 * Retrieves the current valid access token.
 * Checks KV first, falls back to env.
 */
export async function getTraktToken() {
    // Try to get from KV
    const token = await kv.get('trakt:token');
    if (token) return token;

    // Fallback to env
    return process.env.TRAKT_ACCESS_TOKEN;
}

/**
 * Refreshes the access token using the refresh token.
 * Updates KV with new tokens.
 */
export async function refreshTraktToken() {
    console.log('[Trakt Auth] Attempting to refresh token...');

    // Get refresh token from KV or env
    let refreshToken = await kv.get('trakt:refresh_token');
    if (!refreshToken) {
        refreshToken = process.env.TRAKT_REFRESH_TOKEN;
    }

    if (!refreshToken) {
        throw new Error('No refresh token available. Cannot refresh Trakt session.');
    }

    const response = await fetch('https://api.trakt.tv/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            refresh_token: refreshToken,
            client_id: TRAKT_CLIENT_ID,
            client_secret: TRAKT_CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: 'refresh_token'
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to refresh token: ${response.status} ${err}`);
    }

    const data = await response.json();

    // Save new tokens to KV
    // Access token expires in 3 months (approx), but we can just store it indefinitely and refresh when needed
    await kv.set('trakt:token', data.access_token);
    await kv.set('trakt:refresh_token', data.refresh_token);

    console.log('[Trakt Auth] Token refreshed successfully.');
    return data.access_token;
}
