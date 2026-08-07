'use client';
import React, { useState, useRef } from 'react';
import Spinner from '../components/Spinner';
import { extractAnilistId } from '../../lib/url-utils';

/**
 * Render a manual mapping form for submitting external IDs.
 *
 * The form includes inputs for AniList, Trakt, TMDB, IMDB, and TVDB IDs; AniList ID and Trakt ID are required.
 *
 * @returns {JSX.Element} A React element containing the manual mapping form with built-in loading and status handling.
 */
export default function Manual() {
  const [form, setForm] = useState({ anilistId: '', traktId: '', tmdbId: '', imdbId: '', tvdbId: '' });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const firstInputRef = useRef(null);

  const labels = {
    anilistId: 'AniList ID',
    traktId: 'Trakt ID',
    tmdbId: 'TMDB ID',
    imdbId: 'IMDB ID',
    tvdbId: 'TVDB ID'
  };

  const placeholders = {
    anilistId: 'e.g. 1 or full URL',
    traktId: 'e.g. 12345',
    tmdbId: 'e.g. 12345',
    imdbId: 'e.g. tt1234567',
    tvdbId: 'e.g. 12345'
  };

  const handle = e => {
    const { name, value } = e.target;
    if (name === 'anilistId') {
      const extracted = extractAnilistId(value);
      setForm({ ...form, [name]: extracted || value });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const submit = async e => {
    e.preventDefault();
    if (loading) return;
    setStatus('Saving...');
    setLoading(true);
    try {
      const res = await fetch('/api/manual-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const j = await res.json();
      if (j.success) {
        setStatus('Saved ✅');
        setForm({ anilistId: '', traktId: '', tmdbId: '', imdbId: '', tvdbId: '' });
        firstInputRef.current?.focus();
      } else {
        setStatus('Failed: ' + (j.error || 'unknown'));
      }
    } catch (err) {
      setStatus('Failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Manual Mapping</h2>
      <form onSubmit={submit} className="bg-[#111] border border-[#333] p-4 rounded-lg space-y-3">
        {Object.keys(labels).map(f => {
          const isRequired = f === 'anilistId' || f === 'traktId';
          return (
            <div key={f}>
              <label htmlFor={f} className="block text-gray-300 mb-1">
                {labels[f]} {isRequired && <span className="text-red-500" aria-hidden="true">*</span>}
              </label>
              <input
                type="text"
                id={f}
                name={f}
                value={form[f]}
                onChange={handle}
                required={isRequired}
                aria-required={isRequired}
                placeholder={placeholders[f]}
                ref={f === 'anilistId' ? firstInputRef : null}
                className="w-full bg-black p-2 rounded-lg border border-[#333] focus:border-red-500 focus:outline-none transition-colors"
                aria-describedby={f === 'anilistId' ? 'anilistId-hint' : null}
              />
              {f === 'anilistId' && (
                <p id="anilistId-hint" className="text-xs text-gray-500 mt-1">
                  Tip: You can paste a full AniList URL (e.g., <code>https://anilist.co/anime/1/...</code>) to auto-extract the ID.
                </p>
              )}
            </div>
          );
        })}
        <button
          disabled={loading}
          aria-busy={loading}
          className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${loading
              ? 'bg-transparent border border-[#333] cursor-not-allowed text-gray-600 uppercase tracking-wider'
              : 'bg-transparent border border-red-600 text-red-500 hover:bg-red-600 hover:text-white uppercase tracking-wider'
            }`}
        >
          {loading && <Spinner />}
          {loading ? 'Saving...' : 'Save'}
        </button>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {status && (
          <p className="mt-3 text-gray-300" role="status">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
