'use client';
import React, { useEffect, useState } from 'react';
export default function Logs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetch('/api/logs')
      .then(r => r.json())
      .then(data => {
        // Handle both old string format and new object format
        const formatted = Array.isArray(data) ? data : [];
        setLogs(formatted);
      })
      .catch(() => setLogs([]));
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Logs</h2>
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto p-4 space-y-2 font-mono text-sm">
          {logs.length > 0 ? (
            logs.map((l, i) => {
              // Handle legacy string logs vs new object logs
              const isObj = typeof l === 'object' && l !== null;
              const msg = isObj ? l.message : l;
              const ts = isObj ? l.created_at : null;
              const level = isObj ? l.level : 'info';

              // Format timestamp to local time
              const timeStr = ts
                ? new Date(ts).toLocaleString()
                : (typeof l === 'string' && l.match(/^\[(.*?)\]/) ? new Date(l.match(/^\[(.*?)\]/)[1]).toLocaleString() : 'Unknown');

              // Color coding based on level
              const colorClass = level === 'error' ? 'text-red-400' : (level === 'warn' ? 'text-yellow-400' : 'text-gray-300');

              return (
                <div key={i} className="border-b border-gray-700 pb-1 last:border-0">
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
