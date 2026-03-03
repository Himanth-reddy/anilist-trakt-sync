import { db } from '../../../utils/db.js';
import { getWatchingEntries } from '../../../lib/anilist.js';
import { resolveTraktId } from '../../../lib/id-translator.js';
import { getBreakpointMap } from '../../../lib/map-builder.js';
import { postToTrakt } from '../../../lib/trakt.js';
import { log } from '../../../utils/logger.js';
import { translateAnilistToTrakt } from '../../../lib/translator.js';

export const dynamic = 'force-dynamic';

function buildWatchingPreview(entries) {
  const watchedAt = new Date().toISOString();
  return entries.map(entry => ({
    anilistShowId: entry.anilistShowId,
    titleEnglish: entry.showTitleEnglish || entry.showTitle,
    titleRomaji: entry.showTitle,
    progress: entry.progress,
    totalEpisodes: entry.totalEpisodes,
    watchedAt
  }));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const previewOnly = searchParams.get('preview') === '1';

    if (!previewOnly) {
      return Response.json(
        { error: 'Use preview=1 for listing or POST to run sync.' },
        { status: 400 }
      );
    }

    const entries = await getWatchingEntries();
    const items = buildWatchingPreview(entries);
    return Response.json({ items, count: items.length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    await log('[Library Sync] Starting watching library sync...');

    const entries = await getWatchingEntries();
    if (!entries.length) {
      return Response.json({
        message: 'No watching entries found.',
        synced: 0,
        found: 0
      });
    }

    const translatedEpisodes = [];
    const previewItems = buildWatchingPreview(entries);
    const pendingProgress = new Map();
    let skippedAlreadySynced = 0;

    // --- STEP 1: Batch fetch sync progress and mappings ---
    const uniqueAnilistIds = [...new Set(previewItems.map(item => item.anilistShowId))];
    await log(`[Library Sync] Batch fetching data for ${uniqueAnilistIds.length} shows...`);

    const [batchProgress, batchMappings] = await Promise.all([
      db.getBatchSyncProgress(uniqueAnilistIds),
      db.getBatchMappings(uniqueAnilistIds)
    ]);

    const progressCache = new Map();
    const mappingCache = new Map();

    for (const [id, val] of Object.entries(batchProgress)) {
      progressCache.set(Number(id), val);
    }
    for (const [id, val] of Object.entries(batchMappings)) {
      mappingCache.set(Number(id), val);
    }

    // --- STEP 2: Resolve Trakt IDs ---
    const resolvedTraktIds = new Set();
    const anilistToTraktMap = new Map();

    for (const anilistId of uniqueAnilistIds) {
      let traktId = null;
      const cachedMapping = mappingCache.get(anilistId);
      if (cachedMapping && cachedMapping.traktId) {
        traktId = cachedMapping.traktId;
      } else {
        traktId = await resolveTraktId(anilistId);
      }

      if (traktId) {
        anilistToTraktMap.set(anilistId, traktId);
        resolvedTraktIds.add(traktId);
      }
    }

    // --- STEP 3: Batch fetch configs (maps) and overrides ---
    const uniqueTraktIds = [...resolvedTraktIds];
    const breakpointMapCache = new Map();
    const overrideCache = new Map();

    if (uniqueTraktIds.length > 0) {
      await log(`[Library Sync] Batch fetching secondary data for ${uniqueTraktIds.length} Trakt IDs...`);
      const mapKeys = uniqueTraktIds.map(id => `map:${id}`);

      const [batchConfigs, batchOverrides] = await Promise.all([
        db.getBatchConfigs(mapKeys),
        db.getBatchEpisodeOverrides(uniqueTraktIds)
      ]);

      for (const [key, val] of Object.entries(batchConfigs)) {
        const traktId = key.split(':')[1];
        if (traktId) {
          breakpointMapCache.set(Number(traktId), val);
          breakpointMapCache.set(traktId, val);
        }
      }

      for (const [id, val] of Object.entries(batchOverrides)) {
        overrideCache.set(Number(id), val);
        overrideCache.set(String(id), val);
      }
    }

    const getLastSyncedAbs = (anilistId) => progressCache.get(anilistId) || 0;
    const getOverrideMap = (traktId) => overrideCache.get(traktId) || {};

    // --- STEP 4: Process Items ---
    for (const item of previewItems) {
      const storedLastAbs = getLastSyncedAbs(item.anilistShowId);
      const lastSyncedAbs = Math.max(storedLastAbs, pendingProgress.get(item.anilistShowId) || 0);
      if (item.progress <= lastSyncedAbs) {
        skippedAlreadySynced += 1;
        continue;
      }

      const traktId = anilistToTraktMap.get(item.anilistShowId);
      if (!traktId) {
        console.warn(`[Library Sync] SKIP: No Trakt ID for AniList ${item.anilistShowId}`);
        continue;
      }

      let breakpointMap = breakpointMapCache.get(traktId) || breakpointMapCache.get(String(traktId));
      if (!breakpointMap) {
        breakpointMap = await getBreakpointMap(traktId);
        if (breakpointMap) {
          breakpointMapCache.set(traktId, breakpointMap);
        }
      }

      if (!breakpointMap) {
        console.warn(`[Library Sync] SKIP: No map for Trakt ID ${traktId}`);
        continue;
      }

      const overrideMap = getOverrideMap(traktId);
      for (let ep = lastSyncedAbs + 1; ep <= item.progress; ep += 1) {
        const scrobble = {
          anilistShowId: item.anilistShowId,
          showTitle: item.titleRomaji,
          episodeNumber: ep,
          watchedAt: item.watchedAt
        };
        translatedEpisodes.push(translateAnilistToTrakt(scrobble, traktId, breakpointMap, overrideMap));
      }
      pendingProgress.set(item.anilistShowId, item.progress);
    }

    if (translatedEpisodes.length === 0) {
      return Response.json({
        message: 'No episodes could be mapped to Trakt',
        found: entries.length,
        synced: 0,
        alreadySyncedShows: skippedAlreadySynced
      });
    }

    const batchSize = 500;
    let totalAddedEpisodes = 0;
    let batches = 0;

    for (let i = 0; i < translatedEpisodes.length; i += batchSize) {
      const batch = translatedEpisodes.slice(i, i + batchSize);
      const result = await postToTrakt(batch);
      if (result.error) {
        throw new Error(`Trakt sync failed: ${result.error}`);
      }
      totalAddedEpisodes += result?.added?.episodes || 0;
      batches += 1;
    }

    if (pendingProgress.size > 0) {
      await Promise.all(
        [...pendingProgress.entries()].map(([anilistId, lastAbs]) =>
          db.setSyncProgress(anilistId, lastAbs)
        )
      );
    }

    const nowIso = new Date().toISOString();
    await db.setConfig('status:sync:last-run', nowIso);
    await db.setConfig('status:sync:watching:last-run', nowIso);

    return Response.json({
      message: 'Watching library sync complete!',
      found: entries.length,
      synced: translatedEpisodes.length,
      alreadySyncedShows: skippedAlreadySynced,
      addedEpisodes: totalAddedEpisodes,
      batches
    });
  } catch (err) {
    console.error('[Library Sync] ERROR:', err);
    await log(`[Library Sync] ERROR: ${err.message}`);
    return Response.json(
      { error: 'Library sync failed', details: err.message },
      { status: 500 }
    );
  }
}
