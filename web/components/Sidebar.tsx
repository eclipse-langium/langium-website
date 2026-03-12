'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/lib/docs-nav';

interface SidebarItemProps {
  item: NavItem;
  depth?: number;
}

function SidebarItem({ item, depth = 0 }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname === item.href.replace(/\/$/, '');
  const hasChildren = item.children && item.children.length > 0;

  // Section is open if active or a descendant is active
  const isDescendantActive = (nav: NavItem): boolean => {
    if (nav.href === pathname || nav.href === pathname + '/') return true;
    return nav.children?.some(isDescendantActive) ?? false;
  };
  const [open, setOpen] = useState(() => isDescendantActive(item));

  return (
    <li>
      <div
        className={`flex items-center justify-between rounded px-2 py-1 text-sm ${
          isActive
            ? 'bg-emerald-langium/10 font-medium text-emerald-langium'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        }`}
        style={{ paddingLeft: `${(depth + 1) * 0.75}rem` }}
      >
        <Link href={item.href} className="flex-1 truncate">
          {item.title}
        </Link>
        {hasChildren && (
          <button
            onClick={() => setOpen(!open)}
            className="ml-1 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`h-3 w-3 transition-transform ${open ? 'rotate-90' : ''}`}
              viewBox="0 0 6 10"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path d="M1 1l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {hasChildren && open && (
        <ul className="mt-0.5">
          {item.children!.map((child) => (
            <SidebarItem key={child.href} item={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

interface SidebarProps {
  nav: NavItem[];
}

export function Sidebar({ nav }: SidebarProps) {
  return (
    <nav className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 pr-4 py-6 overflow-y-auto sticky top-24 max-h-teaser">
      <ul className="space-y-0.5">
        {nav.map((item) => (
          <SidebarItem key={item.href} item={item} />
        ))}
      </ul>
    </nav>
  );
}
