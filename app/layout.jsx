import './globals.css';
import React from 'react';

export const metadata = { title: 'AniList ↔ Trakt Sync' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white min-h-screen">
        <nav className="bg-gray-800 p-4 flex justify-between">
          <h1 className="text-lg font-bold">AniList ↔ Trakt Sync</h1>
          <div className="space-x-4">
            <a href="/" className="hover:text-blue-400">Dashboard</a>
            <a href="/sync" className="hover:text-blue-400">Sync</a>
            <a href="/mappings" className="hover:text-blue-400">Mappings</a>
            <a href="/manual" className="hover:text-blue-400">Manual Map</a>
            <a href="/logs" className="hover:text-blue-400">Logs</a>
          </div>
        </nav>
        <main className="p-6 max-w-5xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
