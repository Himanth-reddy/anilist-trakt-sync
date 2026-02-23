import { describe, it, expect } from 'vitest';
import { translateAnilistToTrakt } from './translator.js';

describe('translateAnilistToTrakt', () => {
    it('should map standard season 1 episode', () => {
        const scrobble = { episodeNumber: 5, watchedAt: '2023-01-01', showTitle: 'Test Show' };
        const breakpointMap = [{ season: 1, starts_at: 1 }];
        const result = translateAnilistToTrakt(scrobble, '123', breakpointMap);

        expect(result).toEqual({
            traktShowId: '123',
            season: 1,
            number: 5,
            watchedAt: '2023-01-01',
            title: 'Test Show'
        });
    });

    it('should map multi-season episode (Season 2)', () => {
        const scrobble = { episodeNumber: 26, watchedAt: '2023-01-01', showTitle: 'Test Show' };
        const breakpointMap = [
            { season: 1, starts_at: 1 },
            { season: 2, starts_at: 26 }
        ];
        const result = translateAnilistToTrakt(scrobble, '123', breakpointMap);

        expect(result).toEqual({
            traktShowId: '123',
            season: 2,
            number: 1, // 26 - 26 + 1
            watchedAt: '2023-01-01',
            title: 'Test Show'
        });
    });

    it('should map middle of Season 2', () => {
        const scrobble = { episodeNumber: 30, watchedAt: '2023-01-01', showTitle: 'Test Show' };
        const breakpointMap = [
            { season: 1, starts_at: 1 },
            { season: 2, starts_at: 26 }
        ];
        const result = translateAnilistToTrakt(scrobble, '123', breakpointMap);

        expect(result).toEqual({
            traktShowId: '123',
            season: 2,
            number: 5, // 30 - 26 + 1
            watchedAt: '2023-01-01',
            title: 'Test Show'
        });
    });

    it('should respect overrides', () => {
        const scrobble = { episodeNumber: 100, watchedAt: '2023-01-01', showTitle: 'Test Show' };
        const breakpointMap = [{ season: 1, starts_at: 1 }];
        const overrideMap = {
            100: { season: 0, episode: 1 } // Special/OVA
        };
        const result = translateAnilistToTrakt(scrobble, '123', breakpointMap, overrideMap);

        expect(result).toEqual({
            traktShowId: '123',
            season: 0,
            number: 1,
            watchedAt: '2023-01-01',
            title: 'Test Show'
        });
    });

    it('should fallback to Season 1, Episode 1 if episode is before start of map', () => {
        // This shouldn't happen ideally, but good to know behavior.
        // For an out-of-range episode (before the first breakpoint), we expect
        // the translator to default to Season 1, Episode 1 rather than emit an
        // invalid Trakt episode number (e.g., 0).
        const scrobble = { episodeNumber: 0, watchedAt: '2023-01-01', showTitle: 'Test Show' };
        const breakpointMap = [{ season: 1, starts_at: 1 }];
        const result = translateAnilistToTrakt(scrobble, '123', breakpointMap);

        expect(result).toEqual({
            traktShowId: '123',
            season: 1,
            number: 1,
            watchedAt: '2023-01-01',
            title: 'Test Show'
        });
    });

    it('should break starts_at ties by choosing the highest season', () => {
        const scrobble = { episodeNumber: 1, watchedAt: '2023-01-01', showTitle: 'Test Show' };
        const breakpointMap = [
            { season: 0, starts_at: 1 }, // Specials start at 1
            { season: 1, starts_at: 1 }  // Season 1 also starts at 1
        ];

        // Should pick Season 1 over Season 0 because 1 > 0
        const result = translateAnilistToTrakt(scrobble, '123', breakpointMap);

        expect(result).toEqual({
            traktShowId: '123',
            season: 1,
            number: 1,
            watchedAt: '2023-01-01',
            title: 'Test Show'
        });
    });
});
