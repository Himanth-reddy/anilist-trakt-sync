'use client';
import React, { useState } from 'react';

export default function Manual() {
  const [form, setForm] = useState({ anilistId:'', traktId:'', tmdbId:'', imdbId:'', tvdbId:'' });
  const [status, setStatus] = useState('');
  const handle = e=>setForm({...form,[e.target.name]:e.target.value});
  const submit = async e=>{
    e.preventDefault();
    setStatus('Saving...');
    const res = await fetch('/api/manual-map', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
    const j = await res.json();
    setStatus(j.success ? 'Saved ✅' : ('Failed: '+(j.error||'unknown')));
  };
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Manual Mapping</h2>
      <form onSubmit={submit} className="bg-gray-800 p-4 rounded space-y-3">
        {['anilistId','traktId','tmdbId','imdbId','tvdbId'].map(f=>(
          <div key={f}><label className="block text-gray-300 mb-1">{f}</label><input name={f} value={form[f]} onChange={handle} className="w-full bg-gray-900 p-2 rounded"/></div>
        ))}
        <button className="bg-blue-600 px-4 py-2 rounded">Save</button>
      </form>
      {status && <p className="mt-3 text-gray-300">{status}</p>}
    </div>
  );
}
