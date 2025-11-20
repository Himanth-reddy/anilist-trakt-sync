'use client';
import React, { useEffect, useState } from 'react';

export default function MappingsPage() {
  const [data, setData] = useState({ manual: [], auto: [] });
  const [loading, setLoading] = useState(false);

  const fetchMappings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mappings');
      const json = await res.json();
      setData(json);
    } catch {
      setData({ manual: [], auto: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMappings(); }, []);

  const renderTable = (mappings, title) => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">{title}</h3>
        <span className="text-gray-400">{mappings.length} entries</span>
      </div>
      <div className="overflow-auto">
        <table className="w-full bg-gray-800 rounded-lg">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-700">
              <th className="p-3">AniList ID</th>
              <th className="p-3">Trakt ID</th>
              <th className="p-3">TMDB</th>
              <th className="p-3">IMDB</th>
              <th className="p-3">TVDB</th>
            </tr>
          </thead>
          <tbody>
            {mappings.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500 italic">
                  No mappings found
                </td>
              </tr>
            ) : (
              mappings.map((m, i) => (
                <tr key={i} className="border-t border-gray-700 hover:bg-gray-750">
                  <td className="p-3 font-mono">{m.anilistId}</td>
                  <td className="p-3 font-mono">{m.traktId || '-'}</td>
                  <td className="p-3 font-mono">{m.tmdbId || '-'}</td>
                  <td className="p-3 font-mono">{m.imdbId || '-'}</td>
                  <td className="p-3 font-mono">{m.tvdbId || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Mappings</h2>
        <button
          onClick={fetchMappings}
          disabled={loading}
          className={`px-4 py-2 rounded font-medium transition-colors ${loading
              ? 'bg-gray-600 cursor-not-allowed text-gray-300'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {renderTable(data.manual, 'Manual Mappings')}
      {renderTable(data.auto, 'Automatic Mappings')}
    </div>
  );
}
