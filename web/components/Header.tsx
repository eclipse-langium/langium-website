'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MobileMenu } from './MobileMenu';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header
        id="website-header"
        className="sm:sticky top-0 z-50 bg-white dark:bg-gray-900 font-mono flex justify-between items-center px-4 py-6 sm:px-6 md:space-x-10"
      >
        <div className="flex justify-start lg:w-0 lg:flex-1">
          <Link href="/">
            <span className="sr-only">Langium</span>
            <Image
              id="website-logo"
              className="h-12 w-auto"
              src="/assets/langium_logo_w_nib.svg"
              alt="Langium"
              width={48}
              height={48}
            />
          </Link>
        </div>

        {/* Hamburger button (mobile only) */}
        <div className="-mr-2 -my-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="dark:text-gray-100 rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            aria-expanded={mobileOpen}
          >
            <span className="sr-only">Open menu</span>
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Desktop navigation */}
        <nav className="items-center hidden space-x-10 md:flex text-gray-900 dark:text-gray-100 lg:px-12">
          <Link href="/docs/" className="nav-link-desktop">Documentation</Link>
          <Link href="/showcase/" className="nav-link-desktop">Showcase</Link>
          <Link href="/playground/" className="nav-link-desktop">Playground</Link>
          <a href="https://eclipse-langium.github.io/langium/" className="nav-link-desktop" target="_blank" rel="noreferrer">API</a>
          <a href="https://www.typefox.io/language-engineering/" className="nav-link-desktop text-emerald-langium dark:text-emerald-langium" target="_blank" rel="noreferrer">Support</a>
          <a className="w-10 h-10" target="_blank" href="https://github.com/eclipse-langium/langium" rel="noreferrer">
            <Image src="/assets/GitHub-Mark-Light-120px-plus.png" alt="GitHub" width={40} height={40} />
          </a>
        </nav>
      </header>

      <MobileMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
