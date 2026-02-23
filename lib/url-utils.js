/**
 * Extracts the AniList ID from a given input string if it matches an AniList anime URL.
 * Returns null if no ID is found (e.g., input is a plain ID or invalid text).
 *
 * @param {string} input - The input string (URL or ID).
 * @returns {string|null} - The extracted ID or null.
 */
export function extractAnilistId(input) {
  if (!input || typeof input !== 'string') return null;

  // Regex to match AniList anime URLs
  // Matches: https://anilist.co/anime/12345
  // Matches: https://anilist.co/anime/12345/Cowboy-Bebop
  // Matches: anilist.co/anime/12345
  const match = input.match(/anilist\.co\/anime\/(\d+)/);

  if (match) {
    return match[1];
  }

  return null;
}
