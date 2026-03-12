'use client';

import type { ReactNode } from 'react';

interface NotificationProps {
  children: ReactNode;
}

export function Notification({ children }: NotificationProps) {
  return (
    <div className="my-4 rounded-md border border-yellow-400 bg-yellow-50 p-4 dark:border-yellow-600 dark:bg-yellow-900/20">
      <div className="flex">
        <span className="mr-2 text-yellow-600 dark:text-yellow-400">&#9888;</span>
        <div className="text-sm text-yellow-800 dark:text-yellow-200">{children}</div>
      </div>
    </div>
  );
}
