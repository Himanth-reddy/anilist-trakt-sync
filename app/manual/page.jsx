'use client';
import React, { useState } from 'react';
import Spinner from '../components/Spinner';

export default function Manual() {
  const [form, setForm] = useState({ anilistId: '', traktId: '', tmdbId: '', imdbId: '', tvdbId: '' });
  const [status, setStatus] = useState(null); // { message: string, type: 'success' | 'error' | 'loading' }
  const [loading, setLoading] = useState(false);

  const labels = {
    anilistId: 'AniList ID',
    traktId: 'Trakt ID',
    tmdbId: 'TMDB ID',
    imdbId: 'IMDB ID',
    tvdbId: 'TVDB ID'
  };

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async e => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setStatus({ message: 'Saving...', type: 'loading' });
    try {
      const res = await fetch('/api/manual-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const j = await res.json();
      setStatus({
        message: j.success ? 'Saved ✅' : ('Failed: ' + (j.error || 'unknown')),
        type: j.success ? 'success' : 'error'
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({
        message: 'Failed: ' + (message || 'unknown error'),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Manual Mapping</h2>
      <form onSubmit={submit} className="bg-gray-800 p-6 rounded-lg space-y-4 max-w-xl">
        {Object.keys(labels).map(f => {
          const isRequired = f === 'anilistId' || f === 'traktId';
          return (
            <div key={f}>
              <label htmlFor={f} className="block text-sm font-medium text-gray-300 mb-1">
                {labels[f]} {isRequired && <span className="text-red-500" aria-label="required">*</span>}
              </label>
              <input
                id={f}
                name={f}
                value={form[f]}
                onChange={handle}
                required={isRequired}
                aria-required={isRequired}
                className="w-full bg-gray-700 p-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
              />
            </div>
          );
        })}
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className={`inline-flex items-center px-4 py-2 mt-2 rounded font-medium transition-colors ${loading
            ? 'bg-gray-600 cursor-not-allowed text-gray-300'
            : 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 text-white'
            }`}
        >
          {loading && <Spinner />}
          {loading ? 'Saving...' : 'Save Mapping'}
        </button>
      </form>

      {status && status.message && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 p-4 rounded border max-w-xl ${
            status.type === 'success'
              ? 'bg-green-900/50 text-green-200 border-green-800'
              : status.type === 'error'
                ? 'bg-red-900/50 text-red-200 border-red-800'
                : 'bg-gray-800 text-gray-300 border-gray-700'
          }`}
        >
          {status.message}
        </div>
      )}
    </div>
  );
}