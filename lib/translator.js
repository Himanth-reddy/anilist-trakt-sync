/**
 * Translates an Anilist scrobble into a Trakt-ready scrobble object.
 *
 * @param {object} scrobble - The Anilist scrobble (e.g., { episodeNumber, watchedAt, showTitle }).
 * @param {string} traktShowId - The Trakt show ID (e.g., "123").
 * @param {Array} breakpointMap - Array of { season, starts_at } objects.
 * @param {object} overrideMap - Optional map of episode number to { season, episode }.
 * @returns {object} The Trakt scrobble object.
 */
export function translateAnilistToTrakt(scrobble, traktShowId, breakpointMap, overrideMap = {}) {
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

    // --- OPTIMIZATION: Use a single O(N) linear scan instead of O(N log N) sort per call ---
    // This function is called in hot loops during full syncs, translating many scrobbles at a time.
    let bestSeason = -Infinity;
    let bestStart = -Infinity;

    for (let i = 0; i < breakpointMap.length; i++) {
        const entry = breakpointMap[i];
        if (entry.starts_at <= anilistEpisodeNum) {
            // Pick the breakpoint if it's closer to the episode number (higher starts_at).
            // Tie-breaker: if starts_at is equal, pick the highest season number.
            if (entry.starts_at > bestStart || (entry.starts_at === bestStart && entry.season > bestSeason)) {
                bestStart = entry.starts_at;
                bestSeason = entry.season;
            }
        }
    }

    // Default to Season 1, Episode 1 if no map provided or episode < map[0].starts_at
    const traktSeason = bestSeason !== -Infinity ? bestSeason : 1;
    const seasonStart = bestStart !== -Infinity ? bestStart : 1;

    // Calculate relative episode number
    // e.g. AniList Ep 26, Season 2 starts at 26 -> Trakt Ep 1 (26 - 26 + 1)
    const traktEpisodeNum = Math.max(1, anilistEpisodeNum - seasonStart + 1);

    return {
        traktShowId,
        season: traktSeason,
        number: traktEpisodeNum,
        watchedAt: scrobble.watchedAt,
        title: scrobble.showTitle
    };
}
