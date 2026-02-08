import { db } from '../../../utils/db.js';
import { getNewAnilistScrobbles } from '../../../lib/anilist.js';
import { resolveTraktId } from '../../../lib/id-translator.js';
import { getBreakpointMap } from '../../../lib/map-builder.js';
import { postToTrakt } from '../../../lib/trakt.js';
import { log } from '../../../utils/logger.js';

export const dynamic = 'force-dynamic';

/**
 * Translates an Anilist scrobble into a Trakt-ready scrobble object.
 */
function translateAnilistToTrakt(scrobble, traktShowId, breakpointMap, overrideMap = {}) {
    const anilistEpisodeNum = scrobble.episodeNumber;
    const override = overrideMap[anilistEpisodeNum];

    if (override) {
        return {
            traktShowId,
            season: override.season,
            number: override.episode,
            watchedAt: scrobble.watchedAt,
            title: scrobble.showTitle
        };
    }

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

async function runFullSync({ isAutomated = false } = {}) {
    try {
        await log('[Full Sync] Starting AniList to Trakt sync...');
        const markSyncRun = async () => {
            const nowIso = new Date().toISOString();
            if (isAutomated) {
                await db.setConfig('status:sync:last-run-auto', nowIso);
            } else {
                await db.setConfig('status:sync:last-run', nowIso);
            }
            return nowIso;
        };

        // Get last sync timestamp
        const lastSyncTimestamp = await db.getConfig('lastSyncTimestamp') || 0;
        await log(`[Full Sync] Checking for new scrobbles since: ${lastSyncTimestamp}`);

        // Get new scrobbles from AniList
        const newScrobbles = await getNewAnilistScrobbles(lastSyncTimestamp);
        const progressCache = new Map();
        const overrideCache = new Map();
        const pendingProgress = new Map();
        let skippedAlreadySynced = 0;
        let skippedUnmapped = 0;

        const getLastSyncedAbs = async (anilistId) => {
            if (progressCache.has(anilistId)) return progressCache.get(anilistId);
            const lastAbs = await db.getSyncProgress(anilistId);
            progressCache.set(anilistId, lastAbs);
            return lastAbs;
        };

        const getOverrideMap = async (traktId) => {
            if (overrideCache.has(traktId)) return overrideCache.get(traktId);
            const overrides = await db.getEpisodeOverrides(traktId);
            overrideCache.set(traktId, overrides);
            return overrides;
        };

        if (newScrobbles.length === 0) {
            await log('[Full Sync] No new scrobbles found');
            // Update last sync timestamp to now so we don't check old history again unnecessarily
            // Actually, we should only update if we successfully checked.
            // But if we found 0 new scrobbles, it means we are up to date.
            // However, getNewAnilistScrobbles uses the timestamp to query "since".
            // If we update it to NOW, we might miss scrobbles that happen between the check and NOW.
            // So we should probably leave it alone or update it to the time of the check?
            // For display purposes, we want to show "Last Synced: Now".
            // Let's store a separate key for "Last Successful Run" for display.
            const nowIso = await markSyncRun();
            await db.setConfig('lastSyncTimestamp', nowIso);
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
            const storedLastAbs = await getLastSyncedAbs(scrobble.anilistShowId);
            const runLastAbs = Math.max(storedLastAbs, pendingProgress.get(scrobble.anilistShowId) || 0);
            if (scrobble.episodeNumber <= runLastAbs) {
                skippedAlreadySynced += 1;
                continue;
            }

            // Resolve Trakt ID
            const traktId = await resolveTraktId(scrobble.anilistShowId);
            if (!traktId) {
                console.warn(`[Full Sync] SKIP: No Trakt ID for AniList ${scrobble.anilistShowId}`);
                skippedUnmapped += 1;
                continue;
            }

            // Get breakpoint map for proper season/episode mapping
            const breakpointMap = await getBreakpointMap(traktId);
            if (!breakpointMap) {
                console.warn(`[Full Sync] SKIP: No map for Trakt ID ${traktId}`);
                skippedUnmapped += 1;
                continue;
            }

            // Translate episode
            const overrideMap = await getOverrideMap(traktId);
            const traktEpisode = translateAnilistToTrakt(scrobble, traktId, breakpointMap, overrideMap);
            translatedEpisodes.push(traktEpisode);
            pendingProgress.set(scrobble.anilistShowId, Math.max(runLastAbs, scrobble.episodeNumber));
            await log(`[Full Sync] Mapped to Trakt: Show ${traktId}, S${traktEpisode.season} E${traktEpisode.number}`);
        }

        if (translatedEpisodes.length === 0) {
            if (newScrobbles.length === skippedAlreadySynced) {
                const newTimestamp = newScrobbles[newScrobbles.length - 1]?.createdAt;
                if (newTimestamp) {
                    await db.setConfig('lastSyncTimestamp', newTimestamp);
                    await log(`[Full Sync] Advanced lastSyncTimestamp to ${newTimestamp} (already synced)`);
                }
            }
            await markSyncRun();
            return Response.json({
                message: 'No episodes could be mapped to Trakt',
                found: newScrobbles.length,
                synced: 0,
                alreadySynced: skippedAlreadySynced,
                skippedUnmapped
            });
        }

        // Post to Trakt
        await log(`[Full Sync] Posting ${translatedEpisodes.length} episodes to Trakt...`);
        const postResult = await postToTrakt(translatedEpisodes);

        if (pendingProgress.size > 0) {
            await Promise.all(
                [...pendingProgress.entries()].map(([anilistId, lastAbs]) =>
                    db.setSyncProgress(anilistId, lastAbs)
                )
            );
        }

        // Update last sync timestamp
        if (newScrobbles.length > 0) {
            const newTimestamp = newScrobbles[newScrobbles.length - 1].createdAt;
            if (newTimestamp) {
                await db.setConfig('lastSyncTimestamp', newTimestamp);
                await log(`[Full Sync] Updated lastSyncTimestamp to ${newTimestamp}`);
            }
        }

        await log('[Full Sync] Complete');
        await markSyncRun();
        return Response.json({
            message: 'Sync complete!',
            found: newScrobbles.length,
            synced: translatedEpisodes.length,
            alreadySynced: skippedAlreadySynced,
            skippedUnmapped,
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

export async function GET() {
    return runFullSync({ isAutomated: false });
}

export async function runAutomatedSync() {
    return runFullSync({ isAutomated: true });
}
