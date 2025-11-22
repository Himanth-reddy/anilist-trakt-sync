import { kv } from '../../../utils/kv.js';
import { getNewAnilistScrobbles } from '../../../lib/anilist.js';
import { resolveTraktId } from '../../../lib/id-translator.js';
import { getBreakpointMap } from '../../../lib/map-builder.js';
import { postToTrakt } from '../../../lib/trakt.js';
import { log } from '../../../utils/logger.js';

export const dynamic = 'force-dynamic';

/**
 * Translates an Anilist scrobble into a Trakt-ready scrobble object.
 */
function translateAnilistToTrakt(scrobble, traktShowId, breakpointMap) {
    const anilistEpisodeNum = scrobble.episodeNumber;

    // Find the correct season based on breakpoint map
    let traktSeason = 1;
    const reversedMap = [...breakpointMap].reverse();

    for (const entry of reversedMap) {
        if (anilistEpisodeNum >= entry.starts_at) {
            traktSeason = entry.season;
            break;
        }
    }

    // For most anime, absolute episode number = Trakt episode number
    const traktEpisodeNum = anilistEpisodeNum;

    return {
        traktShowId,
        season: traktSeason,
        number: traktEpisodeNum,
        watchedAt: scrobble.watchedAt,
        title: scrobble.showTitle
    };
}

export async function GET() {
    try {
        await log('[Full Sync] Starting AniList to Trakt sync...');

        // Get last sync timestamp
        const lastSyncTimestamp = await kv.get('lastSyncTimestamp') || 0;
        await log(`[Full Sync] Checking for new scrobbles since: ${lastSyncTimestamp}`);

        // Get new scrobbles from AniList
        const newScrobbles = await getNewAnilistScrobbles(lastSyncTimestamp);

        if (newScrobbles.length === 0) {
            await log('[Full Sync] No new scrobbles found');
            return Response.json({
                message: 'No new scrobbles from AniList. Sync complete.',
                synced: 0
            });
        }

        await log(`[Full Sync] Found ${newScrobbles.length} new scrobbles`);
        const translatedEpisodes = [];

        // Process each scrobble
        for (const scrobble of newScrobbles) {
            await log(`[Full Sync] Processing: ${scrobble.showTitle} - Ep ${scrobble.episodeNumber}`);

            // Resolve Trakt ID
            const traktId = await resolveTraktId(scrobble.anilistShowId);
            if (!traktId) {
                console.warn(`[Full Sync] SKIP: No Trakt ID for AniList ${scrobble.anilistShowId}`);
                continue;
            }

            // Get breakpoint map for proper season/episode mapping
            const breakpointMap = await getBreakpointMap(traktId);
            if (!breakpointMap) {
                console.warn(`[Full Sync] SKIP: No map for Trakt ID ${traktId}`);
                continue;
            }

            // Translate episode
            const traktEpisode = translateAnilistToTrakt(scrobble, traktId, breakpointMap);
            translatedEpisodes.push(traktEpisode);
            await log(`[Full Sync] Mapped to Trakt: Show ${traktId}, S${traktEpisode.season} E${traktEpisode.number}`);
        }

        if (translatedEpisodes.length === 0) {
            return Response.json({
                message: 'No episodes could be mapped to Trakt',
                found: newScrobbles.length,
                synced: 0
            });
        }

        // Post to Trakt
        await log(`[Full Sync] Posting ${translatedEpisodes.length} episodes to Trakt...`);
        const postResult = await postToTrakt(translatedEpisodes);

        // Update last sync timestamp
        if (newScrobbles.length > 0) {
            const newTimestamp = newScrobbles[newScrobbles.length - 1].createdAt;
            if (newTimestamp) {
                await kv.set('lastSyncTimestamp', newTimestamp);
                await log(`[Full Sync] Updated lastSyncTimestamp to ${newTimestamp}`);
            }
        }

        await log('[Full Sync] Complete');
        await kv.set('status:sync:last-run', new Date().toISOString());
        return Response.json({
            message: 'Sync complete!',
            found: newScrobbles.length,
            synced: translatedEpisodes.length,
            added: postResult.added || {},
            traktResponse: postResult
        });

    } catch (err) {
        console.error('[Full Sync] ERROR:', err);
        await log(`[Full Sync] ERROR: ${err.message}`);
        return Response.json({
            error: 'Sync process failed',
            details: err.message
        }, { status: 500 });
    }
}
