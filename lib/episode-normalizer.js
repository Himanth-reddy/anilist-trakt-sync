export function flattenTraktEpisodes(seasons) {
  const map = [];
  let global = 0;
  if (!Array.isArray(seasons)) return map;
  for (const s of seasons.slice().sort((a,b)=>a.number-b.number)) {
    for (const e of (s.episodes || []).slice().sort((a,b)=>a.number-b.number)) {
      global++;
      map.push({ global, season: s.number, episode: e.number, traktEpId: e?.ids?.trakt ?? null });
    }
  }
  return map;
}
