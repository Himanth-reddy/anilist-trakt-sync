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
  return parsed ? parsed.toLocaleString(undefined, DATE_TIME_FORMAT) : 'Unknown';
}

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/logs?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setLogs([]);
        setError(data?.error || 'Failed to load logs.');
        return;
      }
      const formatted = Array.isArray(data) ? data : [];
      setLogs(formatted);
      setLastUpdated(new Date());
    } catch {
      setLogs([]);
      setError('Failed to load logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Logs</h2>
        <div className="flex items-center gap-3 text-sm text-gray-400">
          {lastUpdated && (
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button
            onClick={fetchLogs}
            className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-100"
          >
            Refresh
          </button>
        </div>
      </div>
      {error ? (
        <div className="mb-3 text-red-400 text-sm">{error}</div>
      ) : null}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto p-4 space-y-2 font-mono text-sm">
          {loading && logs.length === 0 ? (
            <p className="text-gray-500 italic">Loading logs...</p>
          ) : logs.length > 0 ? (
            logs.map((l, i) => {
              // Handle legacy string logs vs new object logs
              const isObj = typeof l === 'object' && l !== null;
              const msg = isObj ? l.message : l;
              const ts = isObj ? l.created_at : null;
              const level = isObj ? l.level : 'info';

              const legacyTs = typeof l === 'string' && l.match(/^\[(.*?)\]/)
                ? l.match(/^\[(.*?)\]/)[1]
                : null;
              const timeStr = formatTimestamp(ts || legacyTs);

              // Color coding based on level
              const colorClass = level === 'error' ? 'text-red-400' : (level === 'warn' ? 'text-yellow-400' : 'text-gray-300');
              const key = isObj ? (l.id ?? `${ts}-${msg}`) : `${i}-${msg}`;

              return (
                <div key={key} className="border-b border-gray-700 pb-1 last:border-0">
                  <span className="text-gray-500 mr-2">[{timeStr}]</span>
                  <span className={colorClass}>{msg.replace(/^\[.*?\]\s*/, '')}</span>
                </div>
              );
            })
          ) : (
            <p className="text-gray-500 italic">No logs found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
