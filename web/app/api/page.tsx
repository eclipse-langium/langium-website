'use client';

import { useEffect } from 'react';

export default function ApiRedirectPage() {
  useEffect(() => {
    window.location.replace('https://eclipse-langium.github.io/langium/');
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-white font-mono">Redirecting to API docs...</p>
    </div>
  );
}
