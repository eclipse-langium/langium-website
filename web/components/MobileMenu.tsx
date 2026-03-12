'use client';

import Link from 'next/link';
import Image from 'next/image';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-0 inset-x-0 p-2 origin-top-right md:hidden z-50 transition duration-200 ease-out">
      <div className="rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 bg-white dark:bg-gray-900 divide-y-2 divide-gray-50">
        <div className="pt-5 pb-6 px-5">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Image className="h-10 w-auto" src="/assets/langium_logo_w_nib.svg" alt="Langium" width={40} height={40} />
            </Link>
            <div className="-mr-2">
              <button
                onClick={onClose}
                type="button"
                className="p-2 inline-flex items-center justify-center text-gray-900 dark:text-gray-200 hover:text-gray-900"
              >
                <span className="sr-only">Close menu</span>
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-6">
            <nav className="flex flex-col items-center dark:text-gray-200 text-gray-900">
              <Link href="/docs/" className="nav-link-mobile" onClick={onClose}>Documentation</Link>
              <Link href="/showcase/" className="nav-link-mobile" onClick={onClose}>Showcase</Link>
              <Link href="/playground/" className="nav-link-mobile" onClick={onClose}>Playground</Link>
              <a href="https://eclipse-langium.github.io/langium/" className="nav-link-mobile" target="_blank" rel="noreferrer">API</a>
              <a href="https://www.typefox.io/language-engineering/" className="nav-link-mobile" target="_blank" rel="noreferrer">Support</a>
              <a className="w-10 h-10 mt-2" target="_blank" href="https://github.com/eclipse-langium/langium" rel="noreferrer">
                <Image src="/assets/GitHub-Mark-Light-120px-plus.png" alt="GitHub" width={40} height={40} />
              </a>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
