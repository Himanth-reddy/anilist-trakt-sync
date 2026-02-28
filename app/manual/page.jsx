'use client';
import React, { useState } from 'react';
import Spinner from '../components/Spinner';

export default function Manual() {
  const [form, setForm] = useState({ anilistId: '', traktId: '', tmdbId: '', imdbId: '', tvdbId: '' });
  const [status, setStatus] = useState('');
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
    setStatus('Saving...');
    setLoading(true);
    try {
      const res = await fetch('/api/manual-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const j = await res.json();
      setStatus(j.success ? 'Saved ✅' : ('Failed: ' + (j.error || 'unknown')));
    } catch (err) {
      setStatus('Failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Manual Mapping</h2>
      <form onSubmit={submit} className="bg-gray-800 p-4 rounded space-y-3">
        {Object.keys(labels).map(f => (
          <div key={f}>
            <label htmlFor={f} className="block text-gray-300 mb-1">
              {labels[f]}
            </label>
            <input
              id={f}
              name={f}
              value={form[f]}
              onChange={handle}
              className="w-full bg-gray-900 p-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
        ))}
        <button
          disabled={loading}
          aria-busy={loading}
          className={`inline-flex items-center px-4 py-2 rounded font-medium transition-colors ${loading
              ? 'bg-gray-600 cursor-not-allowed text-gray-300'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
        >
          {loading && <Spinner />}
          {loading ? 'Saving...' : 'Save'}
        </button>
      </form>
      {status && (
        <p className="mt-3 text-gray-300" aria-live="polite">
          {status}
        </p>
      )}
    </div>
  );
}
