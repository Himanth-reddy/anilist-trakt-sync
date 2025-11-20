'use client';
import React, { useEffect, useState } from 'react';
export default function Logs() {
  const [logs, setLogs] = useState([]);
  useEffect(()=>{ fetch('/api/logs').then(r=>r.json()).then(setLogs).catch(()=>setLogs([])); }, []);
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Logs</h2>
      <div className="bg-gray-800 p-4 rounded">
        {logs.length ? logs.map((l,i)=>(<div key={i} className="border-b border-gray-700 py-2">{l}</div>)) : <p>No logs yet.</p>}
      </div>
    </div>
  );
}
