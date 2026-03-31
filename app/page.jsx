'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Spinner from './components/Spinner';

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

/**
 * Render the System Status dashboard displaying database and synchronization information.
 *
 * Shows four cards: Otaku Mappings DB, Fribbs Database, Sync Status, and Sync Progress.
 * Each card presents counts and formatted timestamps, displays loading/error states, and
 * includes actions to refresh the corresponding data where applicable.
 *
 * @returns {JSX.Element} The rendered dashboard component.
 */
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
        <div className="bg-[#111] border border-[#333] p-6 rounded-lg-none">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Otaku Mappings DB</h3>
            <button
              onClick={refreshOtaku}
              disabled={otakuLoading}
              aria-label={otakuLoading ? "Refreshing Otaku Mappings Database" : "Update Otaku Mappings Database"}
              aria-busy={otakuLoading}
              className={`inline-flex items-center px-3 py-1 text-sm rounded-lg font-medium transition-colors ${otakuLoading
                ? 'bg-transparent border border-[#333] cursor-not-allowed text-gray-600 uppercase tracking-wider'
                : 'bg-transparent border border-red-600 text-red-500 hover:bg-red-600 hover:text-white uppercase tracking-wider'
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
                <p className="text-sm text-gray-500">Updated: {formatTimestamp(otakuStatus.lastSync)}</p>
                {otakuStatus.lastActivity ? (
                  <p className="text-sm text-gray-500">Source Updated: {formatTimestamp(otakuStatus.lastActivity)}</p>
                ) : null}
              </div>
            )
          ) : (
            <p className="text-gray-500 italic">Loading...</p>
          )}
        </div>

        {/* Fribbs Status Card */}
        <div className="bg-[#111] border border-[#333] p-6 rounded-lg-none">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Fribbs Database</h3>
            <button
              onClick={refreshFribbs}
              disabled={loading}
              aria-label={loading ? "Refreshing Fribbs Database" : "Update Fribbs Database"}
              aria-busy={loading}
              className={`inline-flex items-center px-3 py-1 text-sm rounded-lg font-medium transition-colors ${loading
                ? 'bg-transparent border border-[#333] cursor-not-allowed text-gray-600 uppercase tracking-wider'
                : 'bg-transparent border border-red-600 text-red-500 hover:bg-red-600 hover:text-white uppercase tracking-wider'
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
                <p className="text-sm text-gray-500">Updated: {formatTimestamp(status.lastSync)}</p>
              </div>
            )
          ) : (
            <p className="text-gray-500 italic">Loading...</p>
          )}
        </div>

        {/* Sync Status Card */}
        <div className="bg-[#111] border border-[#333] p-6 rounded-lg-none">
          <h3 className="text-xl font-semibold mb-4">Sync Status</h3>
          <div className="space-y-2">
            <p>Last Automated Sync: <span className="font-mono text-lg text-blue-400">{syncStatus?.lastAutomatedSync ? formatTimestamp(syncStatus.lastAutomatedSync) : 'Checking...'}</span></p>
            <p>Last Manual Sync: <span className="font-mono text-lg text-blue-400">{syncStatus?.lastManualSync ? formatTimestamp(syncStatus.lastManualSync) : 'Never'}</span></p>
            <p className="text-sm text-gray-500">Sync runs automatically every 6 hours.</p>
          </div>
        </div>

        {/* Sync Progress Card */}
        <div className="bg-[#111] border border-[#333] p-6 rounded-lg-none">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Sync Progress</h3>
            <button
              onClick={refreshProgress}
              disabled={progressLoading}
              aria-label={progressLoading ? "Refreshing Sync Progress" : "Update Sync Progress"}
              aria-busy={progressLoading}
              className={`inline-flex items-center px-3 py-1 text-sm rounded-lg font-medium transition-colors ${progressLoading
                ? 'bg-transparent border border-[#333] cursor-not-allowed text-gray-600 uppercase tracking-wider'
                : 'bg-transparent border border-red-600 text-red-500 hover:bg-red-600 hover:text-white uppercase tracking-wider'
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
                <div className="max-h-56 overflow-auto border border-[#333] rounded-lg">
                  <table aria-busy={progressLoading} className={`w-full text-sm transition-opacity duration-200 ${progressLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <thead className="text-gray-500 border-b border-[#333]">
                      <tr>
                        <th className="p-2 text-left">AniList ID</th>
                        <th className="p-2 text-left">Last Abs</th>
                        <th className="p-2 text-left">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(progressStatus.items || []).length === 0 ? (
                        <tr>
                          <td colSpan="3" className="p-3 text-gray-500 italic text-center">
                            <span>No progress rows yet. <Link href="/sync" className="text-red-500 hover:text-red-400 hover:underline not-italic">Sync a show</Link></span>
                          </td>
                        </tr>
                      ) : (
                        (progressStatus.items || []).map((row) => (
                          <tr key={row.anilistId} className="border-t border-[#333]">
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
