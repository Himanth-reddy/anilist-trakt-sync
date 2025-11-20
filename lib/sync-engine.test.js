import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncShow } from './sync-engine.js';
import { resolveTraktId } from './id-translator.js';
import { getFullShow } from './trakt-api.js';
import { flattenTraktEpisodes } from './episode-normalizer.js';
import { kv } from '../utils/kv.js';

vi.mock('./id-translator.js');
vi.mock('./trakt-api.js');
vi.mock('./episode-normalizer.js');
vi.mock('../utils/kv.js', () => ({
    kv: {
        get: vi.fn(),
        set: vi.fn(),
    },
}));

describe('syncShow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should throw error if no trakt mapping found', async () => {
        resolveTraktId.mockResolvedValue(null);

        await expect(syncShow(100)).rejects.toThrow('No Trakt mapping for AniList 100');
        expect(kv.set).toHaveBeenCalledWith('logs', expect.any(String)); // Should log error
    });

    it('should sync show successfully', async () => {
        resolveTraktId.mockResolvedValue('trakt-123');
        getFullShow.mockResolvedValue(['seasons-data']);
        flattenTraktEpisodes.mockReturnValue(['ep1', 'ep2']);

        const result = await syncShow(100);

        expect(result).toEqual(['ep1', 'ep2']);
        expect(getFullShow).toHaveBeenCalledWith('trakt-123');
        expect(flattenTraktEpisodes).toHaveBeenCalledWith(['seasons-data']);
        expect(kv.set).toHaveBeenCalledWith('trakt:show:trakt-123:episodes', JSON.stringify(['ep1', 'ep2']));
        expect(kv.set).toHaveBeenCalledWith('logs', expect.any(String)); // Should log success
    });
});
