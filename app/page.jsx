'use client';
import React, { useEffect, useState } from 'react';

export default function Page() {
  const [status, setStatus] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
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
    // Fetch Fribbs status
    fetch('/api/refresh-fribbs?check=1', { cache: 'no-store' }).then(r => r.json()).then(setStatus).catch(() => { });

    // Fetch sync status (manual vs automated)
    fetch('/api/status', { cache: 'no-store' }).then(r => r.json()).then(setSyncStatus).catch(() => { });
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">System Status</h2>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Fribbs Status Card */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Fribbs Database</h3>
            <button
              onClick={refreshFribbs}
              disabled={loading}
              className={`px-3 py-1 text-sm rounded font-medium transition-colors ${loading
                ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
            >
              {loading ? 'Refreshing...' : 'Update'}
            </button>
          </div>

          {status ? (
            status.error ? (
              <div className="text-red-400">Error: {status.error}</div>
            ) : (
              <div className="space-y-2">
                <p>Entries: <span className="font-mono text-lg text-green-400">{status.count?.toLocaleString() ?? '0'}</span></p>
                <p className="text-sm text-gray-400">Updated: {status.lastSync ? new Date(status.lastSync).toLocaleString() : 'Never'}</p>
              </div>
            )
          ) : (
            <p className="text-gray-500 italic">Loading...</p>
          )}
        </div>

        {/* Sync Status Card */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Sync Status</h3>
          <div className="space-y-2">
            <p>Last Automated Sync: <span className="font-mono text-lg text-blue-400">{syncStatus?.lastAutomatedSync ? new Date(syncStatus.lastAutomatedSync).toLocaleString() : 'Checking...'}</span></p>
            <p>Last Manual Sync: <span className="font-mono text-lg text-blue-400">{syncStatus?.lastManualSync ? new Date(syncStatus.lastManualSync).toLocaleString() : 'Never'}</span></p>
            <p className="text-sm text-gray-400">Sync runs automatically every 6 hours.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
