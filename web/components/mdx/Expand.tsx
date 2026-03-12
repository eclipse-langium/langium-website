'use client';

import { useState, type ReactNode } from 'react';

interface ExpandProps {
  title: string;
  children: ReactNode;
}

export function Expand({ title, children }: ExpandProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-4 rounded-md border border-gray-200 dark:border-gray-700">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium text-gray-900 dark:text-gray-100"
        onClick={() => setOpen(!open)}
      >
        <span>{title}</span>
        <span className={`transform transition-transform ${open ? 'rotate-90' : ''}`}>
          &#9654;
        </span>
      </button>
      {open && (
        <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  );
}
