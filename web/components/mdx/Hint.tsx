'use client';

import type { ReactNode } from 'react';

interface HintProps {
  type?: 'info' | 'warning' | 'danger' | 'tip';
  children: ReactNode;
}

const styles: Record<string, string> = {
  info: 'border-blue-400 bg-blue-50 text-blue-800 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-200',
  warning: 'border-yellow-400 bg-yellow-50 text-yellow-800 dark:border-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-200',
  danger: 'border-red-400 bg-red-50 text-red-800 dark:border-red-600 dark:bg-red-900/20 dark:text-red-200',
  tip: 'border-green-400 bg-green-50 text-green-800 dark:border-green-600 dark:bg-green-900/20 dark:text-green-200',
};

export function Hint({ type = 'info', children }: HintProps) {
  return (
    <div className={`my-4 rounded-md border-l-4 p-4 ${styles[type] ?? styles.info}`}>
      {children}
    </div>
  );
}
