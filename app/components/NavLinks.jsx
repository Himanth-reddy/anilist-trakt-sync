'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavLinks() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/sync', label: 'Sync' },
    { href: '/mappings', label: 'Mappings' },
    { href: '/manual', label: 'Manual Map' },
    { href: '/logs', label: 'Logs' },
  ];

  return (
    <div className="space-x-4">
      {links.map(({ href, label }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={`rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors uppercase text-sm tracking-wider ${
              isActive
                ? 'text-red-500 bg-[#111]'
                : 'text-gray-200 hover:text-red-500'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
