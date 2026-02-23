import { describe, it, expect } from 'vitest';
import { createBreakpointMap } from './map-builder.js';

describe('createBreakpointMap', () => {
    it('should correctly map seasons with absolute numbers', () => {
        const seasons = [
            {
                number: 1,
                episodes: [
                    { number: 1, number_abs: 1 },
                    { number: 25, number_abs: 25 }
                ]
            },
            {
                number: 2,
                episodes: [
                    { number: 1, number_abs: 26 },
                    { number: 25, number_abs: 50 }
                ]
            }
        ];

        const result = createBreakpointMap(seasons);
        expect(result).toEqual([
            { season: 1, starts_at: 1 },
            { season: 2, starts_at: 26 }
        ]);
    });

    it('should fallback to cumulative count when absolute numbers are missing', () => {
        const seasons = [
            {
                number: 1,
                episodes: Array(25).fill({ number: 1 }), // Mock episodes without absolute numbers
            },
            {
                number: 2,
                episodes: Array(25).fill({ number: 1 }),
            }
        ];

        const result = createBreakpointMap(seasons);
        expect(result).toEqual([
            { season: 1, starts_at: 1 },
            { season: 2, starts_at: 26 }
        ]);
    });

    it('should handle mixed data (some seasons with absolute numbers, some without)', () => {
        const seasons = [
            {
                number: 1,
                episodes: [
                    { number: 1, number_abs: 1 },
                    { number: 25, number_abs: 25 }
                ]
            },
            {
                number: 2,
                episodes: Array(25).fill({ number: 1 }) // No absolute numbers
            },
            {
                number: 3,
                episodes: [
                     // If Season 2 was 25 eps long (starting at 26), it ended at 50.
                     // So Season 3 should start at 51.
                     { number: 1, number_abs: 51 }
                ]
            }
        ];

        const result = createBreakpointMap(seasons);
        expect(result).toEqual([
            { season: 1, starts_at: 1 },
            { season: 2, starts_at: 26 },
            { season: 3, starts_at: 51 }
        ]);
    });

    it('should handle gaps in season numbers', () => {
         const seasons = [
            {
                number: 1,
                episodes: [{ number: 1, number_abs: 1 }, { number: 10, number_abs: 10 }]
            },
            {
                number: 3, // Season 2 is missing or special
                episodes: [{ number: 1, number_abs: 11 }]
            }
        ];

        const result = createBreakpointMap(seasons);
        expect(result).toEqual([
            { season: 1, starts_at: 1 },
            { season: 3, starts_at: 11 }
        ]);
    });

    it('should use episode_count if episodes array is missing', () => {
        const seasons = [
            { number: 1, episode_count: 25 },
            { number: 2, episode_count: 25 }
        ];

        const result = createBreakpointMap(seasons);
        expect(result).toEqual([
            { season: 1, starts_at: 1 },
            { season: 2, starts_at: 26 }
        ]);
    });
});
