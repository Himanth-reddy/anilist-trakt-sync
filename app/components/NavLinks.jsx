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

  return (
    <div className="space-x-1 sm:space-x-2">
      {links.map(({ href, label }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={`rounded px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition-colors ${
              isActive
                ? 'bg-blue-900/50 text-blue-400'
                : 'text-gray-300 hover:bg-gray-700 hover:text-gray-100'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
