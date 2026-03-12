'use client';

import dynamic from 'next/dynamic';

const showcaseComponents = {
  statemachine: dynamic(() => import('@/components/showcase/StatemachineShowcase'), { ssr: false, loading: () => <ShowcaseLoading /> }),
  minilogo: dynamic(() => import('@/components/showcase/MinilogoShowcase'), { ssr: false, loading: () => <ShowcaseLoading /> }),
  domainmodel: dynamic(() => import('@/components/showcase/DomainmodelShowcase'), { ssr: false, loading: () => <ShowcaseLoading /> }),
  arithmetics: dynamic(() => import('@/components/showcase/ArithmeticsShowcase'), { ssr: false, loading: () => <ShowcaseLoading /> }),
  sql: dynamic(() => import('@/components/showcase/SqlShowcase'), { ssr: false, loading: () => <ShowcaseLoading /> }),
} as const;

function ShowcaseLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-900">
      <div className="text-emerald-langium text-lg font-mono">Loading language server...</div>
    </div>
  );
}

export function ShowcaseClient({ slug }: { slug: keyof typeof showcaseComponents }) {
  const Component = showcaseComponents[slug];
  return <Component />;
}
