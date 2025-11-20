const TRAKT_HEADERS = () => ({
  'trakt-api-key': process.env.TRAKT_CLIENT_ID,
  'Content-Type': 'application/json',
  Authorization: process.env.TRAKT_ACCESS_TOKEN ? `Bearer ${process.env.TRAKT_ACCESS_TOKEN}` : undefined
});

export async function searchTraktByExternal(type, id) {
  if (!id) return null;
  const url = `https://api.trakt.tv/search/${type}/${encodeURIComponent(id)}?type=show`;
  const res = await fetch(url, { headers: TRAKT_HEADERS() });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.[0]?.show?.ids?.trakt ?? null;
}

export async function getFullShow(traktId) {
  if (!traktId) return [];
  const url = `https://api.trakt.tv/shows/${encodeURIComponent(traktId)}/seasons?extended=episodes`;
  const res = await fetch(url, { headers: TRAKT_HEADERS() });
  if (!res.ok) throw new Error('Failed to fetch trakt show');
  return await res.json();
}
