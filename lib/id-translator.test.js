import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveTraktId } from './id-translator.js';
import { db } from '../utils/db.js';
import { getOtakuMapping } from './otaku.js';
import { getFribbsMapping } from './fribbs.js';
import { getTmdbExternalIds } from './tmdb-api.js';
import { searchTraktByExternal } from './trakt-api.js';

vi.mock('../utils/db.js', () => ({
  db: {
    getMapping: vi.fn(),
    saveMapping: vi.fn(),
  },
}));

vi.mock('./otaku.js', () => ({
  getOtakuMapping: vi.fn(),
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

  it('should return mapped ID from db if present', async () => {
    db.getMapping.mockResolvedValueOnce({ traktId: 'mapped-123' });

    const result = await resolveTraktId(100);

    expect(result).toBe('mapped-123');
    expect(db.getMapping).toHaveBeenCalledWith(100);
  });

  it('should return null if no fribbs mapping found', async () => {
    db.getMapping.mockResolvedValue(null);
    getOtakuMapping.mockResolvedValue(null);
    getFribbsMapping.mockResolvedValue(null);

    const result = await resolveTraktId(100);

    expect(result).toBeNull();
  });

  it('should use Otaku trakt id if present', async () => {
    db.getMapping.mockResolvedValue(null);
    getOtakuMapping.mockResolvedValue({ traktId: 123, tmdbId: 555 });

    const result = await resolveTraktId(100);

    expect(result).toBe(123);
    expect(db.saveMapping).toHaveBeenCalledWith(100, expect.objectContaining({ traktId: 123 }));
  });

  it('should resolve via TMDB ID from fribbs', async () => {
    db.getMapping.mockResolvedValue(null);
    getOtakuMapping.mockResolvedValue(null);
    getFribbsMapping.mockResolvedValue({ tmdbId: 555 });
    getTmdbExternalIds.mockResolvedValue({});
    searchTraktByExternal.mockResolvedValue('trakt-555');

    const result = await resolveTraktId(100);

    expect(result).toBe('trakt-555');
    expect(searchTraktByExternal).toHaveBeenCalledWith('tmdb', 555);
    expect(db.saveMapping).toHaveBeenCalledWith(100, expect.objectContaining({ traktId: 'trakt-555' }));
  });

  it('should resolve via IMDB ID if TMDB fails', async () => {
    db.getMapping.mockResolvedValue(null);
    getOtakuMapping.mockResolvedValue(null);
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
