import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncShow } from './sync-engine.js';
import { resolveTraktId } from './id-translator.js';
import { getFullShow } from './trakt-api.js';
import { flattenTraktEpisodes } from './episode-normalizer.js';
import { db } from '../utils/db.js';
import { log } from '../utils/logger.js';

vi.mock('./id-translator.js');
vi.mock('./trakt-api.js');
vi.mock('./episode-normalizer.js');
vi.mock('../utils/db.js', () => ({
  db: {
    setConfig: vi.fn(),
  },
}));
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

describe('syncShow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error if no trakt mapping found', async () => {
    resolveTraktId.mockResolvedValue(null);

    await expect(syncShow(100)).rejects.toThrow('No Trakt mapping for AniList 100');
    expect(log).toHaveBeenCalledWith('No mapping for AniList 100');
  });

  it('should sync show successfully', async () => {
    resolveTraktId.mockResolvedValue('trakt-123');
    getFullShow.mockResolvedValue(['seasons-data']);
    flattenTraktEpisodes.mockReturnValue(['ep1', 'ep2']);

    const result = await syncShow(100);

    expect(result).toEqual(['ep1', 'ep2']);
    expect(getFullShow).toHaveBeenCalledWith('trakt-123');
    expect(flattenTraktEpisodes).toHaveBeenCalledWith(['seasons-data']);
    expect(db.setConfig).toHaveBeenCalledWith('trakt:show:trakt-123:episodes', JSON.stringify(['ep1', 'ep2']));
    expect(log).toHaveBeenCalledWith('Synced AniList 100 -> Trakt trakt-123 (2 eps)');
  });
});
