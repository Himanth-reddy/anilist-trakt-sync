'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/sync', label: 'Sync' },
  { href: '/mappings', label: 'Mappings' },
  { href: '/manual', label: 'Manual Map' },
  { href: '/logs', label: 'Logs' },
];

export default function NavLinks() {
  const pathname = usePathname();

  const baseLinkClass = "rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors uppercase text-sm tracking-wider";

  return (
    <div className="space-x-4">
      {LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={`${baseLinkClass} ${
              isActive
                ? 'text-red-500 font-bold'
                : 'text-gray-200 hover:text-red-500'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
