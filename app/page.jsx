'use client';
import React, { useEffect, useState } from 'react';

export default function Page() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshFribbs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/refresh-fribbs');
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      setStatus({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/refresh-fribbs?check=1').then(r => r.json()).then(setStatus).catch(() => { });
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">System Status</h2>

      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Fribbs Anime Database</h3>
          <button
            onClick={refreshFribbs}
            disabled={loading}
            className={`px-4 py-2 rounded font-medium transition-colors ${loading
              ? 'bg-gray-600 cursor-not-allowed text-gray-300'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
          >
            {loading ? 'Refreshing...' : 'Refresh Fribbs'}
          </button>
        </div>

        {status ? (
          status.error ? (
            <div className="p-4 bg-red-900/50 text-red-200 rounded border border-red-800">
              Error: {status.error}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-green-400 font-medium">✓ Database Updated</p>
              <p>Total Entries: <span className="font-mono text-lg">{status.count?.toLocaleString() ?? '0'}</span></p>
              <p className="text-sm text-gray-400">Last synced: {status.lastSync ? new Date(status.lastSync).toLocaleString() : 'Never'}</p>
            </div>
          )
        ) : (
          <p className="text-gray-400 italic">Click refresh to update the anime mapping database.</p>
        )}
      </div>
    </div>
  );
}
