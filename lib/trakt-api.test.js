import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchTraktByExternal, getFullShow } from './trakt-api.js';

// Mock global fetch
const globalFetch = global.fetch = vi.fn();

describe('trakt-api', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.TRAKT_CLIENT_ID = 'mock-client-id';
        process.env.TRAKT_ACCESS_TOKEN = 'mock-token';
    });

    afterEach(() => {
        delete process.env.TRAKT_CLIENT_ID;
        delete process.env.TRAKT_ACCESS_TOKEN;
    });

    describe('searchTraktByExternal', () => {
        it('should return null if id is missing', async () => {
            expect(await searchTraktByExternal('tmdb', null)).toBeNull();
        });

        it('should return trakt id on success', async () => {
            globalFetch.mockResolvedValue({
                ok: true,
                json: async () => ([{ show: { ids: { trakt: 12345 } } }]),
            });

            const result = await searchTraktByExternal('tmdb', 999);
            expect(result).toBe(12345);
            expect(globalFetch).toHaveBeenCalledWith(
                expect.stringContaining('search/tmdb/999?type=show'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'trakt-api-key': 'mock-client-id',
                        'Authorization': 'Bearer mock-token',
                        'User-Agent': 'Anilist-Trakt-Sync/1.0'
                    })
                })
            );
        });

        it('should return null on api error', async () => {
            globalFetch.mockResolvedValue({ ok: false });
            expect(await searchTraktByExternal('tmdb', 999)).toBeNull();
        });

        it('should return null if no results', async () => {
            globalFetch.mockResolvedValue({
                ok: true,
                json: async () => ([]),
            });
            expect(await searchTraktByExternal('tmdb', 999)).toBeNull();
        });
    });

    describe('getFullShow', () => {
        it('should return empty array if no traktId', async () => {
            expect(await getFullShow(null)).toEqual([]);
        });

        it('should return data on success', async () => {
            const mockData = [{ season: 1, episodes: [] }];
            globalFetch.mockResolvedValue({
                ok: true,
                json: async () => mockData,
            });

            const result = await getFullShow(123);
            expect(result).toEqual(mockData);
            expect(globalFetch).toHaveBeenCalledWith(
                expect.stringContaining('shows/123/seasons?extended=episodes'),
                expect.any(Object)
            );
        });

        it('should throw error on failure', async () => {
            globalFetch.mockResolvedValue({ ok: false });
            await expect(getFullShow(123)).rejects.toThrow('Failed to fetch trakt show');
        });
    });
});
