'use client';
import React, { useEffect, useState } from 'react';

const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

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
              <th scope="col" className="p-3">AniList ID</th>
              <th scope="col" className="p-3">Trakt ID</th>
              <th scope="col" className="p-3">TMDB</th>
              <th scope="col" className="p-3">IMDB</th>
              <th scope="col" className="p-3">TVDB</th>
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
                  <td className="p-3 font-mono">
                    <a href={`https://anilist.co/anime/${m.anilistId}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                      {m.anilistId}
                    </a>
                  </td>
                  <td className="p-3 font-mono">
                    {m.traktId ? (
                      <a href={`https://trakt.tv/shows/${m.traktId}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        {m.traktId}
                      </a>
                    ) : '-'}
                  </td>
                  <td className="p-3 font-mono">
                    {m.tmdbId ? (
                      <a href={`https://www.themoviedb.org/tv/${m.tmdbId}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        {m.tmdbId}
                      </a>
                    ) : '-'}
                  </td>
                  <td className="p-3 font-mono">
                    {m.imdbId ? (
                      <a href={`https://www.imdb.com/title/${m.imdbId}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        {m.imdbId}
                      </a>
                    ) : '-'}
                  </td>
                  <td className="p-3 font-mono">
                    {m.tvdbId ? (
                      <a href={`https://thetvdb.com/dereferrer/series/${m.tvdbId}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        {m.tvdbId}
                      </a>
                    ) : '-'}
                  </td>
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
          aria-label={loading ? "Refreshing mappings..." : "Refresh mappings"}
          aria-busy={loading}
          className={`inline-flex items-center px-4 py-2 rounded font-medium transition-colors ${loading
              ? 'bg-gray-600 cursor-not-allowed text-gray-300'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
        >
          {loading && <Spinner />}
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {renderTable(data.manual, 'Manual Mappings')}
      {renderTable(data.auto, 'Automatic Mappings')}
    </div>
  );
}
