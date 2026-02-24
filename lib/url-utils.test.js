import { describe, it, expect } from 'vitest';
import { extractAnilistId } from './url-utils';

describe('extractAnilistId', () => {
  it('extracts ID from full URL', () => {
    expect(extractAnilistId('https://anilist.co/anime/12345/Cowboy-Bebop')).toBe('12345');
  });

  it('extracts ID from URL without slug', () => {
    expect(extractAnilistId('https://anilist.co/anime/999')).toBe('999');
  });

  it('extracts ID from URL without protocol', () => {
    expect(extractAnilistId('anilist.co/anime/54321')).toBe('54321');
  });

  it('returns null for plain ID', () => {
    // The utility is strictly for extraction from URL-like strings.
    // Plain IDs should be returned as null so the UI can decide to keep raw input.
    expect(extractAnilistId('123')).toBe(null);
  });

  it('returns null for random text', () => {
    expect(extractAnilistId('Cowboy Bebop')).toBe(null);
  });

  it('returns null for empty input', () => {
    expect(extractAnilistId('')).toBe(null);
    expect(extractAnilistId(null)).toBe(null);
    expect(extractAnilistId(undefined)).toBe(null);
  });

  it('extracts ID even with query params', () => {
    expect(extractAnilistId('https://anilist.co/anime/100?foo=bar')).toBe('100');
  });

  it('returns null for URL with missing ID segment', () => {
    expect(extractAnilistId('https://anilist.co/anime/')).toBe(null);
  });

  it('returns null for URL with non-numeric ID segment', () => {
    expect(extractAnilistId('https://anilist.co/anime/abc')).toBe(null);
  });
});
