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

    // Find the correct season based on breakpoint map
    // Default to Season 1, Episode 1 if no map provided or episode < map[0].starts_at
    let traktSeason = 1;
    let seasonStart = 1;

    // Sort map by starts_at descending (or just use reverse if it's already sorted ascending)
    // Assuming breakpointMap is sorted by starts_at ascending (which createBreakpointMap does)
    const reversedMap = [...breakpointMap].sort((a, b) => {
        if (b.starts_at !== a.starts_at) {
            return b.starts_at - a.starts_at;
        }
        // Tie-breaker: season descending (latest season chosen)
        return b.season - a.season;
    });

    for (const entry of reversedMap) {
        if (anilistEpisodeNum >= entry.starts_at) {
            traktSeason = entry.season;
            seasonStart = entry.starts_at;
            break;
        }
    }

    // Calculate relative episode number
    // e.g. AniList Ep 26, Season 2 starts at 26 -> Trakt Ep 1 (26 - 26 + 1)
    const traktEpisodeNum = anilistEpisodeNum - seasonStart + 1;

    return {
        traktShowId,
        season: traktSeason,
        number: traktEpisodeNum,
        watchedAt: scrobble.watchedAt,
        title: scrobble.showTitle
    };
}
