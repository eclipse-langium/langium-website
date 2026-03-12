import type { Metadata } from 'next';
import { Suspense } from 'react';
import PlaygroundPage from '@/components/playground/PlaygroundPage';

export const metadata: Metadata = {
  title: 'Playground',
  description: 'Write your own language on the left and try out your own language editor on the right.',
};

function PlaygroundLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-900">
      <div className="text-emerald-langium text-lg font-mono">Loading playground...</div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PlaygroundLoading />}>
      <PlaygroundPage />
    </Suspense>
  );
}
