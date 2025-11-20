import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveTraktId } from './id-translator.js';
import { kv } from '../utils/kv.js';
import { getFribbsMapping } from './fribbs.js';
import { getTmdbExternalIds } from './tmdb-api.js';
import { searchTraktByExternal } from './trakt-api.js';

// Mock dependencies
vi.mock('../utils/kv.js', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('./fribbs.js', () => ({
  getFribbsMapping: vi.fn(),
}));

vi.mock('./tmdb-api.js', () => ({
  getTmdbExternalIds: vi.fn(),
}));

vi.mock('./trakt-api.js', () => ({
  searchTraktByExternal: vi.fn(),
}));

describe('resolveTraktId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return manually mapped ID if present', async () => {
    kv.get.mockResolvedValueOnce(JSON.stringify({ traktId: 'manual-123' }));
    
    const result = await resolveTraktId(100);
    
    expect(result).toBe('manual-123');
    expect(kv.get).toHaveBeenCalledWith('manual:map:100');
  });

  it('should return cached ID if present', async () => {
    kv.get.mockResolvedValueOnce(null); // No manual map
    kv.get.mockResolvedValueOnce(JSON.stringify({ traktId: 'cached-123' }));
    
    const result = await resolveTraktId(100);
    
    expect(result).toBe('cached-123');
    expect(kv.get).toHaveBeenCalledWith('map:anilist:100');
  });

  it('should return null if no fribbs mapping found', async () => {
    kv.get.mockResolvedValue(null);
    getFribbsMapping.mockResolvedValue(null);

    const result = await resolveTraktId(100);

    expect(result).toBeNull();
  });

  it('should resolve via TMDB ID from fribbs', async () => {
    kv.get.mockResolvedValue(null);
    getFribbsMapping.mockResolvedValue({ tmdbId: 555 });
    getTmdbExternalIds.mockResolvedValue({}); // No extra IDs
    searchTraktByExternal.mockResolvedValue('trakt-555');

    const result = await resolveTraktId(100);

    expect(result).toBe('trakt-555');
    expect(searchTraktByExternal).toHaveBeenCalledWith('tmdb', 555);
    expect(kv.set).toHaveBeenCalledWith('map:anilist:100', expect.stringContaining('"traktId":"trakt-555"'));
  });

  it('should resolve via IMDB ID if TMDB fails', async () => {
    kv.get.mockResolvedValue(null);
    getFribbsMapping.mockResolvedValue({ imdbId: 'tt123' });
    searchTraktByExternal.mockImplementation((type, id) => {
      if (type === 'imdb' && id === 'tt123') return Promise.resolve('trakt-imdb');
      return Promise.resolve(null);
    });

    const result = await resolveTraktId(100);

    expect(result).toBe('trakt-imdb');
    expect(searchTraktByExternal).toHaveBeenCalledWith('imdb', 'tt123');
  });
});
