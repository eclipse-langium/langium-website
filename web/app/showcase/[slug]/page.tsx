import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';

const showcaseMeta: Record<string, { title: string; description: string }> = {
  statemachine: { title: 'State Machine', description: 'A language that captures the functionality of a state machine.' },
  minilogo: { title: 'MiniLogo', description: 'A miniature Logo programming language for drawing graphics in the browser.' },
  domainmodel: { title: 'Domain Model', description: 'A language to describe simple class-based domain models.' },
  arithmetics: { title: 'Arithmetics', description: 'A simple arithmetic expression language with real-time evaluation.' },
  sql: { title: 'SQL', description: 'A subset of SQL with schema-driven validation.' },
};

const showcaseComponents: Record<string, React.ComponentType> = {
  statemachine: dynamic(() => import('@/components/showcase/StatemachineShowcase'), { ssr: false, loading: () => <ShowcaseLoading /> }),
  minilogo: dynamic(() => import('@/components/showcase/MinilogoShowcase'), { ssr: false, loading: () => <ShowcaseLoading /> }),
  domainmodel: dynamic(() => import('@/components/showcase/DomainmodelShowcase'), { ssr: false, loading: () => <ShowcaseLoading /> }),
  arithmetics: dynamic(() => import('@/components/showcase/ArithmeticsShowcase'), { ssr: false, loading: () => <ShowcaseLoading /> }),
  sql: dynamic(() => import('@/components/showcase/SqlShowcase'), { ssr: false, loading: () => <ShowcaseLoading /> }),
};

function ShowcaseLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-900">
      <div className="text-emerald-langium text-lg font-mono">Loading language server...</div>
    </div>
  );
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.keys(showcaseMeta).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const meta = showcaseMeta[slug];
  if (!meta) return { title: 'Not Found' };
  return { title: meta.title, description: meta.description };
}

export default async function ShowcasePage({ params }: Props) {
  const { slug } = await params;
  const Component = showcaseComponents[slug];
  if (!Component) notFound();

  return <Component />;
}
