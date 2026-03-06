import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route.js';
import { db } from '../../../utils/db.js';
import { getWatchingEntries } from '../../../lib/anilist.js';
import { resolveTraktId } from '../../../lib/id-translator.js';
import { getBreakpointMap } from '../../../lib/map-builder.js';
import { postToTrakt } from '../../../lib/trakt.js';
import { log } from '../../../utils/logger.js';
import { translateAnilistToTrakt } from '../../../lib/translator.js';

// Mocks
vi.mock('../../../utils/db.js', () => ({
  db: {
    getSyncProgress: vi.fn(),
    getBatchSyncProgress: vi.fn(),
    getBatchMappings: vi.fn(),
    setSyncProgress: vi.fn(),
    setConfig: vi.fn(),
    getBatchConfigs: vi.fn(),
    getEpisodeOverrides: vi.fn(),
    getBatchEpisodeOverrides: vi.fn(),
  },
}));
vi.mock('../../../lib/anilist.js');
vi.mock('../../../lib/id-translator.js');
vi.mock('../../../lib/map-builder.js');
vi.mock('../../../lib/trakt.js');
vi.mock('../../../utils/logger.js', () => ({
  log: vi.fn(),
}));
vi.mock('../../../lib/translator.js');
// Mock otaku.js to avoid sql.js import error
vi.mock('../../../lib/otaku.js', () => ({
    getOtakuMapping: vi.fn()
}));

describe('watching-sync POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks setup
    getWatchingEntries.mockResolvedValue([
      { anilistShowId: 100, showTitle: 'Test Show', progress: 5, totalEpisodes: 12 }
    ]);
    db.getSyncProgress.mockResolvedValue(0); // Nothing synced yet
    db.getBatchSyncProgress.mockResolvedValue({ 100: 0 });
    db.getBatchMappings.mockResolvedValue({
      100: { traktId: 'trakt-100' }
    });
    resolveTraktId.mockResolvedValue('trakt-100');
    getBreakpointMap.mockResolvedValue({ breakpoints: [] });
    db.getBatchConfigs.mockResolvedValue({
      'map:trakt-100': [{ season: 1, starts_at: 1 }]
    });
    db.getEpisodeOverrides.mockResolvedValue({});
    db.getBatchEpisodeOverrides.mockResolvedValue({
      'trakt-100': { 5: { season: 2, episode: 1 } }
    });
    translateAnilistToTrakt.mockImplementation((scrobble) => ({ ...scrobble, traktShowId: 'trakt-100' }));
  });

  it('should not update database if postToTrakt fails', async () => {
    // Mock postToTrakt to return an error (simulating failure)
    postToTrakt.mockResolvedValue({ error: 'Network failure' });

    const response = await POST();
    const json = await response.json();

    // Verification
    expect(postToTrakt).toHaveBeenCalled();
    // The key expectation: setSyncProgress should NOT be called if Trakt sync failed
    expect(db.setSyncProgress).not.toHaveBeenCalled();

    // Verify optimization works: getBreakpointMap should NOT be called because cache hits
    expect(getBreakpointMap).not.toHaveBeenCalled();
    // And overrides should be from batch
    expect(db.getEpisodeOverrides).not.toHaveBeenCalled();

    // We expect the function to return an error response because we threw an error (after fix)
    // Or at least return a response indicating failure
  });
});
