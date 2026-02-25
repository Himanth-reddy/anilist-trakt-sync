'use client';
import React, { useEffect, useState } from 'react';

const DATE_TIME_FORMAT = {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
  timeZoneName: 'short'
};

function parseTimestamp(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(raw);
  const normalized = hasTimezone ? raw : `${raw}Z`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatTimestamp(value) {
  const parsed = parseTimestamp(value);
  return parsed ? parsed.toLocaleString(undefined, DATE_TIME_FORMAT) : 'Never';
}

const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default function Page() {
  const [status, setStatus] = useState(null);
  const [otakuStatus, setOtakuStatus] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [progressStatus, setProgressStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otakuLoading, setOtakuLoading] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);

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

  const refreshOtaku = async () => {
    setOtakuLoading(true);
    try {
      const res = await fetch('/api/refresh-otaku');
      const data = await res.json();
      setOtakuStatus(data);
    } catch (e) {
      setOtakuStatus({ error: e.message });
    } finally {
      setOtakuLoading(false);
    }
  };

  const refreshProgress = async () => {
    setProgressLoading(true);
    try {
      const res = await fetch('/api/progress?limit=12');
      const data = await res.json();
      setProgressStatus(data);
    } catch (e) {
      setProgressStatus({ error: e.message });
    } finally {
      setProgressLoading(false);
    }
  };

  useEffect(() => {
    // Fetch Fribbs status
    fetch('/api/refresh-fribbs?check=1', { cache: 'no-store' }).then(r => r.json()).then(setStatus).catch(() => { });
    // Fetch Otaku status
    fetch('/api/refresh-otaku?check=1', { cache: 'no-store' }).then(r => r.json()).then(setOtakuStatus).catch(() => { });

    // Fetch sync status (manual vs automated)
    fetch('/api/status', { cache: 'no-store' }).then(r => r.json()).then(setSyncStatus).catch(() => { });
    // Fetch sync progress snapshot
    fetch('/api/progress?limit=12', { cache: 'no-store' }).then(r => r.json()).then(setProgressStatus).catch(() => { });
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">System Status</h2>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Otaku Status Card */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Otaku Mappings DB</h3>
            <button
              onClick={refreshOtaku}
              disabled={otakuLoading}
              aria-label={otakuLoading ? "Refreshing Otaku Mappings Database" : "Update Otaku Mappings Database"}
              aria-busy={otakuLoading}
              className={`inline-flex items-center px-3 py-1 text-sm rounded font-medium transition-colors ${otakuLoading
                ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
            >
              {otakuLoading && <Spinner />}
              {otakuLoading ? 'Refreshing...' : 'Update'}
            </button>
          </div>

          {otakuStatus ? (
            otakuStatus.error ? (
              <div className="text-red-400">Error: {otakuStatus.error}</div>
            ) : (
              <div className="space-y-2">
                <p>Entries: <span className="font-mono text-lg text-green-400">{otakuStatus.count?.toLocaleString() ?? '0'}</span></p>
                <p className="text-sm text-gray-400">Updated: {formatTimestamp(otakuStatus.lastSync)}</p>
                {otakuStatus.lastActivity ? (
                  <p className="text-sm text-gray-400">Source Updated: {formatTimestamp(otakuStatus.lastActivity)}</p>
                ) : null}
              </div>
            )
          ) : (
            <p className="text-gray-500 italic">Loading...</p>
          )}
        </div>

        {/* Fribbs Status Card */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Fribbs Database</h3>
            <button
              onClick={refreshFribbs}
              disabled={loading}
              aria-label={loading ? "Refreshing Fribbs Database" : "Update Fribbs Database"}
              aria-busy={loading}
              className={`inline-flex items-center px-3 py-1 text-sm rounded font-medium transition-colors ${loading
                ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
            >
              {loading && <Spinner />}
              {loading ? 'Refreshing...' : 'Update'}
            </button>
          </div>

          {status ? (
            status.error ? (
              <div className="text-red-400">Error: {status.error}</div>
            ) : (
              <div className="space-y-2">
                <p>Entries: <span className="font-mono text-lg text-green-400">{status.count?.toLocaleString() ?? '0'}</span></p>
                <p className="text-sm text-gray-400">Updated: {formatTimestamp(status.lastSync)}</p>
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
            <p>Last Automated Sync: <span className="font-mono text-lg text-blue-400">{syncStatus?.lastAutomatedSync ? formatTimestamp(syncStatus.lastAutomatedSync) : 'Checking...'}</span></p>
            <p>Last Manual Sync: <span className="font-mono text-lg text-blue-400">{syncStatus?.lastManualSync ? formatTimestamp(syncStatus.lastManualSync) : 'Never'}</span></p>
            <p className="text-sm text-gray-400">Sync runs automatically every 6 hours.</p>
          </div>
        </div>

        {/* Sync Progress Card */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Sync Progress</h3>
            <button
              onClick={refreshProgress}
              disabled={progressLoading}
              aria-label={progressLoading ? "Refreshing Sync Progress" : "Update Sync Progress"}
              aria-busy={progressLoading}
              className={`inline-flex items-center px-3 py-1 text-sm rounded font-medium transition-colors ${progressLoading
                ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
            >
              {progressLoading && <Spinner />}
              {progressLoading ? 'Refreshing...' : 'Update'}
            </button>
          </div>

          {progressStatus ? (
            progressStatus.error ? (
              <div className="text-red-400">Error: {progressStatus.error}</div>
            ) : (
              <div className="space-y-3">
                <p>Tracked Shows: <span className="font-mono text-lg text-green-400">{progressStatus.count?.toLocaleString() ?? '0'}</span></p>
                <div className="max-h-56 overflow-auto border border-gray-700 rounded">
                  <table className="w-full text-sm">
                    <thead className="text-gray-400 border-b border-gray-700">
                      <tr>
                        <th className="p-2 text-left">AniList ID</th>
                        <th className="p-2 text-left">Last Abs</th>
                        <th className="p-2 text-left">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(progressStatus.items || []).length === 0 ? (
                        <tr>
                          <td colSpan="3" className="p-3 text-gray-500 italic text-center">No progress rows yet</td>
                        </tr>
                      ) : (
                        (progressStatus.items || []).map((row) => (
                          <tr key={row.anilistId} className="border-t border-gray-700">
                            <td className="p-2 font-mono">{row.anilistId}</td>
                            <td className="p-2 font-mono">{row.lastAbs}</td>
                            <td className="p-2 text-gray-300">{row.updatedAt ? formatTimestamp(row.updatedAt) : '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            <p className="text-gray-500 italic">Loading...</p>
          )}
        </div>
      </div>
    </div>
  );
}
