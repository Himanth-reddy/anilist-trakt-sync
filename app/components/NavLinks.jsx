'use client';

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

  const baseClass = "rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors uppercase text-sm tracking-wider";

  return (
    <div className="space-x-4">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`${baseClass} ${isActive ? 'text-red-500' : 'hover:text-red-500'}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
