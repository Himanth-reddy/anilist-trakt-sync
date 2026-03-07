import './globals.css';

import { Inter } from "next/font/google";
import React from 'react';

export const metadata = { title: 'AniList ↔ Trakt Sync' };

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  const linkClass = "hover:text-blue-400 rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-gray-800 focus:text-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-br"
        >
          Skip to main content
        </a>
        <nav className="bg-gray-800 p-4 flex justify-between items-center">
          <h1 className="text-lg font-bold">AniList ↔ Trakt Sync</h1>
          <div className="space-x-4">
            <a href="/" className={linkClass}>Dashboard</a>
            <a href="/sync" className={linkClass}>Sync</a>
            <a href="/mappings" className={linkClass}>Mappings</a>
            <a href="/manual" className={linkClass}>Manual Map</a>
            <a href="/logs" className={linkClass}>Logs</a>
          </div>
        </nav>
        <main id="main-content" className="p-6 max-w-5xl mx-auto" tabIndex="-1">{children}</main>
      </body>
    </html>
  );
}
