import './globals.css';

import { JetBrains_Mono } from "next/font/google";
import React from 'react';
import Link from 'next/link';

export const metadata = { title: 'AniList ↔ Trakt Sync' };

const font = JetBrains_Mono({ subsets: ["latin"] });

/**
 * Root layout component that renders the application's HTML scaffold with header navigation and a main content container.
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.children - Content to render inside the main element.
 * @returns {JSX.Element} The top-level HTML element containing the skip link, header navigation, and the main element with id "main-content".
 */
export default function RootLayout({ children }) {
  const linkClass = "hover:text-red-500 rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors uppercase text-sm tracking-wider";
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${font.className} bg-black text-gray-200 antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-[#111] focus:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-br-none"
        >
          Skip to main content
        </a>
        <nav className="bg-[#0a0a0a] border-b border-[#333] p-4 flex justify-between items-center">
          <h1 className="text-lg font-bold text-white tracking-widest uppercase">AniList ↔ Trakt Sync</h1>
          <div className="space-x-4">
            <Link href="/" className={linkClass}>Dashboard</Link>
            <Link href="/sync" className={linkClass}>Sync</Link>
            <Link href="/mappings" className={linkClass}>Mappings</Link>
            <Link href="/manual" className={linkClass}>Manual Map</Link>
            <Link href="/logs" className={linkClass}>Logs</Link>
          </div>
        </nav>
        <main id="main-content" className="p-6 max-w-5xl mx-auto" tabIndex="-1">{children}</main>
      </body>
    </html>
  );
}
