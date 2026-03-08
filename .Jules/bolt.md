## 2024-03-02 - N+1 query pattern fixed in sync iteration loops
**Learning:** Found a major N+1 query problem where `await db.getSyncProgress(anilistShowId)` and `await resolveTraktId(anilistShowId)` were called inside the main scrobble-processing loop for both `completed-sync` and `watching-sync` API routes.
**Action:** When working on array-processing loops that make database or API calls, always verify if those calls can be extracted outside the loop and converted to batch fetches (e.g., using `Promise.all` over unique IDs). Using `db.getBatchSyncProgress` and `db.getBatchMappings` before the loop prevents dozens/hundreds of sequential awaited DB connections.

## 2024-03-03 - Avoid array cloning and sorting inside inner loops
**Learning:** Found a performance bottleneck in `translateAnilistToTrakt` (`lib/translator.js`) where the `breakpointMap` array was spread into a new array and sorted `[...breakpointMap].sort(...)` on every single function call. Since this function is called inside hot loops for hundreds of scrobbles during full synchronization, the O(N log N) sorting plus object allocation overhead compounded significantly, leading to measurable slowdowns.
**Action:** Replace expensive operations inside hot loops with efficient O(N) linear scans when possible. Pre-sort data before entering the loop or iterate through unsorted arrays linearly to find extremums instead of sorting them repeatedly.

## 2024-06-11 - Secondary N+1 query pattern fixed for secondary Trakt-dependent data
**Learning:** Encountered a secondary N+1 query issue in `watching-sync` and `completed-sync` routes. Although AniList-related mappings and progress were batch-fetched, `getBreakpointMap` inside the loop still caused sequential queries `db.getConfig` based on the previously resolved Trakt IDs.
**Action:** Resolve identifiers (e.g., Trakt IDs) in a standalone pre-processing loop and collect them into a set. Then, execute a secondary batch fetch phase (e.g., `db.getBatchConfigs`, `db.getBatchEpisodeOverrides`) using that set before entering the final main iteration loop.
