# AniList to Trakt Sync Guide

This guide explains how to set up and use the AniList to Trakt sync functionality.

## Prerequisites

You need API tokens from both AniList and Trakt:

### 1. Get AniList Access Token

1. Go to [AniList Settings > Developer](https://anilist.co/settings/developer)
2. Create a new Client
3. Set the Redirect URI to: `https://anilist.co/api/v2/oauth/pin`
4. Note your Client ID and Client Secret
5. Visit this URL (replace `YOUR_CLIENT_ID`):
   ```
   https://anilist.co/api/v2/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=token
   ```
6. Authorize the app and copy the access token from the URL

### 2. Get Trakt API Credentials

1. Go to [Trakt API Apps](https://trakt.tv/oauth/applications)
2. Create a new application
3. Set the Redirect URI to: `urn:ietf:wg:oauth:2.0:oob`
4. Note your **Client ID** and **Client Secret**
5. To get your **Access Token**, you need to complete OAuth flow:
   - Visit: `https://trakt.tv/oauth/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob`
   - Authorize the app
   - Exchange the code for an access token using the Trakt API

   **Easy method**: Use a tool like Postman or curl:
   ```bash
   curl -X POST https://api.trakt.tv/oauth/token \
     -H "Content-Type: application/json" \
     -d '{
       "code": "AUTHORIZATION_CODE_FROM_URL",
       "client_id": "YOUR_CLIENT_ID",
       "client_secret": "YOUR_CLIENT_SECRET",
       "redirect_uri": "urn:ietf:wg:oauth:2.0:oob",
       "grant_type": "authorization_code"
     }'
   ```

### 3. Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:
   - `ANILIST_ACCESS_TOKEN` - Your AniList access token
   - `TRAKT_CLIENT_ID` - Your Trakt client ID
   - `TRAKT_ACCESS_TOKEN` - Your Trakt access token
   - `KV_REST_API_URL` - Your Upstash KV REST URL
   - `KV_REST_API_TOKEN` - Your Upstash KV REST token

4. Redeploy your application for changes to take effect

## Using the Sync Feature

### Method 1: Web UI

1. Navigate to the **Sync** page in the app
2. **Sync Single Show**:
   - Enter an AniList ID (e.g., `1` for Cowboy Bebop)
   - Click "Sync Show"
   - This fetches and stores the show's metadata
   
3. **Sync All Watched**:
   - Click "Sync All Watched"
   - This syncs all your watched episodes from AniList to Trakt

### Method 2: API Endpoints

You can also trigger syncs via direct API calls:

**Sync Single Show:**
```bash
curl "https://anilist-trakt-sync.vercel.app/api/sync?anilistId=1"
```

**Full Sync:**
```bash
curl "https://anilist-trakt-sync.vercel.app/api/full-sync"
```

## How It Works

1. **ID Translation**: The app uses the Fribbs anime list + TMDB to translate AniList IDs to Trakt IDs
2. **Episode Mapping**: It creates a "breakpoint map" to correctly map absolute episode numbers to Trakt's season/episode format
3. **History Sync**: It fetches your watch history from AniList and posts it to Trakt

## Troubleshooting

### "No Trakt mapping found"
- The show might not be in the Fribbs database
- Try using **Manual Map** to create a mapping

### "Authentication Error"
- Check that your `ANILIST_ACCESS_TOKEN` is valid
- Tokens may expire - regenerate if needed

### "Trakt API Error"
- Verify your `TRAKT_ACCESS_TOKEN` is correct
- Check that your Trakt app has the necessary permissions

### "No new scrobbles found"
- This is normal if you haven't watched anything new since the last sync
- The app tracks the last sync timestamp in KV storage

## Automation

To automatically sync on a schedule, you can:
1. Use Vercel Cron Jobs (Pro plan required)
2. Use GitHub Actions to call the API endpoint
3. Use any external scheduler (Zapier, IFTTT, etc.)

Example GitHub Action:
```yaml
name: Sync AniList to Trakt
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Sync
        run: curl "https://anilist-trakt-sync.vercel.app/api/full-sync"
```

## Support

For issues or questions, please open an issue on the [GitHub repository](https://github.com/Himanth-reddy/anilist-trakt-sync).
