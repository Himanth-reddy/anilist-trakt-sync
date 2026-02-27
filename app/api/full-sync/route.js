import { db } from '../../../utils/db.js';
import { getNewAnilistScrobbles } from '../../../lib/anilist.js';
import { resolveTraktId } from '../../../lib/id-translator.js';
import { getBreakpointMap } from '../../../lib/map-builder.js';
import { postToTrakt } from '../../../lib/trakt.js';
import { log } from '../../../utils/logger.js';
import { translateAnilistToTrakt } from '../../../lib/translator.js';

export const dynamic = 'force-dynamic';

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
        const mappingCache = new Map();
        const breakpointMapCache = new Map();

        let skippedAlreadySynced = 0;
        let skippedUnmapped = 0;

        if (newScrobbles.length === 0) {
            await log('[Full Sync] No new scrobbles found');
            await markSyncRun();
            await db.setConfig('lastSyncTimestamp', Math.floor(Date.now() / 1000));
            return Response.json({
                message: 'No new scrobbles from AniList. Sync complete.',
                synced: 0
            });
        }

        await log(`[Full Sync] Found ${newScrobbles.length} new scrobbles`);
        const translatedEpisodes = [];

        // --- STEP 1: Batch fetch sync progress and mappings ---
        const uniqueAnilistIds = [...new Set(newScrobbles.map(s => s.anilistShowId))];
        await log(`[Full Sync] Batch fetching data for ${uniqueAnilistIds.length} shows...`);

        const [batchProgress, batchMappings] = await Promise.all([
            db.getBatchSyncProgress(uniqueAnilistIds),
            db.getBatchMappings(uniqueAnilistIds)
        ]);

        // Populate caches
        for (const [id, val] of Object.entries(batchProgress)) {
            progressCache.set(Number(id), val);
        }
        for (const [id, val] of Object.entries(batchMappings)) {
            mappingCache.set(Number(id), val);
        }

        // --- STEP 2: Resolve Trakt IDs (use cache, fallback to resolveTraktId) ---
        const resolvedTraktIds = new Set();
        const anilistToTraktMap = new Map(); // Local map for this run

        // We can process this sequentially or in parallel.
        // Since we have batchMappings, many will be hits. Misses will be slow.
        // Let's do a simple loop, as misses are expected to be rare after initial runs.
        for (const anilistId of uniqueAnilistIds) {
            let traktId = null;
            const cachedMapping = mappingCache.get(anilistId);
            if (cachedMapping && cachedMapping.traktId) {
                traktId = cachedMapping.traktId;
            } else {
                // Fallback to individual resolution (API calls)
                traktId = await resolveTraktId(anilistId);
            }

            if (traktId) {
                anilistToTraktMap.set(anilistId, traktId);
                resolvedTraktIds.add(traktId);
            }
        }

        // --- STEP 3: Batch fetch configs (maps) and overrides ---
        const uniqueTraktIds = [...resolvedTraktIds];
        if (uniqueTraktIds.length > 0) {
            await log(`[Full Sync] Batch fetching secondary data for ${uniqueTraktIds.length} Trakt IDs...`);
            const mapKeys = uniqueTraktIds.map(id => `map:${id}`);

            const [batchConfigs, batchOverrides] = await Promise.all([
                db.getBatchConfigs(mapKeys),
                db.getBatchEpisodeOverrides(uniqueTraktIds)
            ]);

            // Populate breakpoint cache (from configs)
            for (const [key, val] of Object.entries(batchConfigs)) {
                // key is "map:12345"
                const traktId = key.split(':')[1];
                if (traktId) {
                    breakpointMapCache.set(Number(traktId), val);
                    // Also handle string keys if they come back as strings
                    breakpointMapCache.set(traktId, val);
                }
            }

            // Populate override cache
            for (const [id, val] of Object.entries(batchOverrides)) {
                overrideCache.set(Number(id), val);
                overrideCache.set(String(id), val);
            }
        }

        const getLastSyncedAbs = (anilistId) => {
            // If it was in the batch, it's in the cache. If not, it's 0.
            return progressCache.get(anilistId) || 0;
        };

        const getOverrideMap = (traktId) => {
            return overrideCache.get(traktId) || {};
        };

        // --- STEP 4: Process Scrobbles ---
        // Process each scrobble
        for (const scrobble of newScrobbles) {
            await log(`[Full Sync] Processing: ${scrobble.showTitle} - Ep ${scrobble.episodeNumber}`);
            const storedLastAbs = getLastSyncedAbs(scrobble.anilistShowId);
            const runLastAbs = Math.max(storedLastAbs, pendingProgress.get(scrobble.anilistShowId) || 0);
            if (scrobble.episodeNumber <= runLastAbs) {
                skippedAlreadySynced += 1;
                continue;
            }

            // Get Trakt ID from our pre-resolved map
            const traktId = anilistToTraktMap.get(scrobble.anilistShowId);
            if (!traktId) {
                console.warn(`[Full Sync] SKIP: No Trakt ID for AniList ${scrobble.anilistShowId}`);
                skippedUnmapped += 1;
                continue;
            }

            // Get breakpoint map (check cache, fallback to fetch)
            let breakpointMap = breakpointMapCache.get(traktId) || breakpointMapCache.get(String(traktId));
            if (!breakpointMap) {
                // Fallback: If not in batch config, fetch it (this will save to DB too)
                breakpointMap = await getBreakpointMap(traktId);
                // Update cache for subsequent items of same show in this loop
                if (breakpointMap) {
                    breakpointMapCache.set(traktId, breakpointMap);
                }
            }

            if (!breakpointMap) {
                console.warn(`[Full Sync] SKIP: No map for Trakt ID ${traktId}`);
                skippedUnmapped += 1;
                continue;
            }

            // Translate episode
            const overrideMap = getOverrideMap(traktId);
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
