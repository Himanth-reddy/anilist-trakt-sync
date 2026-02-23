import { db } from '../utils/db.js';

const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
const TRAKT_CLIENT_SECRET = process.env.TRAKT_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'; // Standard for manual auth

/**
 * Retrieves the current valid access token.
 * Checks DB first, falls back to env.
 */
export async function getTraktToken() {
    // Try to get from DB
    const token = await db.getConfig('trakt:token');
    if (token) return token;

    // Fallback to env
    return process.env.TRAKT_ACCESS_TOKEN;
}

/**
 * Refreshes the access token using the refresh token.
 * Updates DB with new tokens.
 */
export async function refreshTraktToken() {
    console.log('[Trakt Auth] Attempting to refresh token...');

    // Get refresh token from DB or env
    let refreshToken = await db.getConfig('trakt:refresh_token');
    if (!refreshToken) {
        refreshToken = process.env.TRAKT_REFRESH_TOKEN;
    }

    if (!refreshToken) {
        throw new Error('No refresh token available. Cannot refresh Trakt session.');
    }

    const response = await fetch('https://api.trakt.tv/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Anilist-Trakt-Sync/1.0' },
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

    // Save new tokens to DB
    await db.setConfig('trakt:token', data.access_token);
    await db.setConfig('trakt:refresh_token', data.refresh_token);

    console.log('[Trakt Auth] Token refreshed successfully.');
    return data.access_token;
}
