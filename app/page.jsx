'use client';
import React, { useEffect, useState } from 'react';

export default function Page() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch('/api/refresh-fribbs')
      .then(r => r.json())
      .then(setStatus)
      .catch(e => setStatus({ error: e.message }));
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">System Status</h2>
      {status ? (
        status.error ? (
          <p className="text-red-400">{status.error}</p>
        ) : (
          <div className="bg-gray-800 p-4 rounded-lg">
            <p>Fribbs entries: {status.count ?? '0'}</p>
            <p>Last updated: {new Date().toLocaleString()}</p>
          </div>
        )
      ) : <p>Loading...</p>}
    </div>
  );
}
