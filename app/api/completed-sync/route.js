import { db } from '../../../utils/db.js';
import { getCompletedEntries } from '../../../lib/anilist.js';
import { resolveTraktId } from '../../../lib/id-translator.js';
import { getBreakpointMap } from '../../../lib/map-builder.js';
import { postToTrakt } from '../../../lib/trakt.js';
import { log } from '../../../utils/logger.js';

export const dynamic = 'force-dynamic';

function translateAnilistToTrakt(scrobble, traktShowId, breakpointMap) {
  const anilistEpisodeNum = scrobble.episodeNumber;
  let traktSeason = 1;
  const reversedMap = [...breakpointMap].reverse();

  for (const entry of reversedMap) {
    if (anilistEpisodeNum >= entry.starts_at) {
      traktSeason = entry.season;
      break;
    }
  }

  const traktEpisodeNum = anilistEpisodeNum;
  return {
    traktShowId,
    season: traktSeason,
    number: traktEpisodeNum,
    watchedAt: scrobble.watchedAt,
    title: scrobble.showTitle
  };
}

function buildCompletedPreview(entries) {
  return entries.map(entry => {
    const completedAt = entry.completedAt;
    const watchedAt = (completedAt && completedAt.year && completedAt.month && completedAt.day)
      ? new Date(Date.UTC(completedAt.year, completedAt.month - 1, completedAt.day)).toISOString()
      : new Date().toISOString();

    return {
      anilistShowId: entry.anilistShowId,
      titleEnglish: entry.showTitleEnglish || entry.showTitle,
      titleRomaji: entry.showTitle,
      progress: entry.progress,
      watchedAt
    };
  });
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

    const entries = await getCompletedEntries();
    const items = buildCompletedPreview(entries);
    return Response.json({ items, count: items.length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    await log('[Library Sync] Starting completed library sync...');

    const entries = await getCompletedEntries();
    if (!entries.length) {
      return Response.json({
        message: 'No completed entries found.',
        synced: 0,
        found: 0
      });
    }

    const translatedEpisodes = [];
    const previewItems = buildCompletedPreview(entries);

    for (const item of previewItems) {
      const traktId = await resolveTraktId(item.anilistShowId);
      if (!traktId) {
        console.warn(`[Library Sync] SKIP: No Trakt ID for AniList ${item.anilistShowId}`);
        continue;
      }

      const breakpointMap = await getBreakpointMap(traktId);
      if (!breakpointMap) {
        console.warn(`[Library Sync] SKIP: No map for Trakt ID ${traktId}`);
        continue;
      }

      for (let ep = 1; ep <= item.progress; ep += 1) {
        const scrobble = {
          anilistShowId: item.anilistShowId,
          showTitle: item.titleRomaji,
          episodeNumber: ep,
          watchedAt: item.watchedAt
        };
        translatedEpisodes.push(translateAnilistToTrakt(scrobble, traktId, breakpointMap));
      }
    }

    if (translatedEpisodes.length === 0) {
      return Response.json({
        message: 'No episodes could be mapped to Trakt',
        found: entries.length,
        synced: 0
      });
    }

    const batchSize = 500;
    let totalAddedEpisodes = 0;
    let batches = 0;

    for (let i = 0; i < translatedEpisodes.length; i += batchSize) {
      const batch = translatedEpisodes.slice(i, i + batchSize);
      const result = await postToTrakt(batch);
      totalAddedEpisodes += result?.added?.episodes || 0;
      batches += 1;
    }

    const nowIso = new Date().toISOString();
    await db.setConfig('status:sync:last-run', nowIso);
    await db.setConfig('status:sync:completed:last-run', nowIso);

    return Response.json({
      message: 'Completed library sync complete!',
      found: entries.length,
      synced: translatedEpisodes.length,
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
