export async function getTmdbExternalIds(tmdbId) {
  if (!tmdbId) return {};
  const res = await fetch(`https://api.themoviedb.org/3/tv/${encodeURIComponent(tmdbId)}/external_ids?api_key=${process.env.TMDB_API_KEY}`);
  if (!res.ok) return {};
  const json = await res.json();
  return { imdbId: json.imdb_id || null, tvdbId: json.tvdb_id || null };
}
