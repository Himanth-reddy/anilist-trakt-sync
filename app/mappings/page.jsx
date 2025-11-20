'use client';
import React, { useEffect, useState } from 'react';

export default function MappingsPage() {
  const [data, setData] = useState([]);
  useEffect(()=>{ fetch('/api/mappings').then(r=>r.json()).then(setData).catch(()=>setData([])); }, []);
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Mappings</h2>
      <div className="overflow-auto">
        <table className="w-full bg-gray-800 rounded-lg">
          <thead>
            <tr className="text-left text-gray-400">
              <th className="p-2">AniList ID</th>
              <th className="p-2">Trakt ID</th>
              <th className="p-2">TMDB</th>
              <th className="p-2">IMDB</th>
              <th className="p-2">TVDB</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m,i)=>(
              <tr key={i} className="border-t border-gray-700"><td className="p-2">{m.anilistId}</td><td className="p-2">{m.traktId||'-'}</td><td className="p-2">{m.tmdbId||'-'}</td><td className="p-2">{m.imdbId||'-'}</td><td className="p-2">{m.tvdbId||'-'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
