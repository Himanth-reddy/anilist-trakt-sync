import { describe, it, expect } from 'vitest';
import { flattenTraktEpisodes } from './episode-normalizer.js';

describe('flattenTraktEpisodes', () => {
    it('should return empty array for invalid input', () => {
        expect(flattenTraktEpisodes(null)).toEqual([]);
        expect(flattenTraktEpisodes('invalid')).toEqual([]);
    });

    it('should flatten and sort episodes', () => {
        const input = [
            {
                number: 2,
                episodes: [
                    { number: 1, ids: { trakt: 201 } },
                ]
            },
            {
                number: 1,
                episodes: [
                    { number: 2, ids: { trakt: 102 } },
                    { number: 1, ids: { trakt: 101 } },
                ]
            }
        ];

        const result = flattenTraktEpisodes(input);

        expect(result).toHaveLength(3);

        // Season 1, Ep 1
        expect(result[0]).toEqual({ global: 1, season: 1, episode: 1, traktEpId: 101 });
        // Season 1, Ep 2
        expect(result[1]).toEqual({ global: 2, season: 1, episode: 2, traktEpId: 102 });
        // Season 2, Ep 1
        expect(result[2]).toEqual({ global: 3, season: 2, episode: 1, traktEpId: 201 });
    });

    it('should handle missing episodes array', () => {
        const input = [{ number: 1 }];
        expect(flattenTraktEpisodes(input)).toEqual([]);
    });
});
