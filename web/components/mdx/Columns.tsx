import type { ReactNode } from 'react';

interface ColumnsProps {
  children: ReactNode;
}

export function Columns({ children }: ColumnsProps) {
  return (
    <div className="my-4 grid gap-4 md:grid-cols-2">
      {children}
    </div>
  );
}
