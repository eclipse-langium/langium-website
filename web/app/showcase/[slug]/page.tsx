import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShowcaseClient } from './ShowcaseClient';

const showcaseMeta = {
  statemachine: { title: 'State Machine', description: 'A language that captures the functionality of a state machine.' },
  minilogo: { title: 'MiniLogo', description: 'A miniature Logo programming language for drawing graphics in the browser.' },
  domainmodel: { title: 'Domain Model', description: 'A language to describe simple class-based domain models.' },
  arithmetics: { title: 'Arithmetics', description: 'A simple arithmetic expression language with real-time evaluation.' },
  sql: { title: 'SQL', description: 'A subset of SQL with schema-driven validation.' },
} as const;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.keys(showcaseMeta).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!(slug in showcaseMeta)) return { title: 'Not Found' };
  const meta = showcaseMeta[slug as keyof typeof showcaseMeta];
  return { title: meta.title, description: meta.description };
}

export default async function ShowcasePage({ params }: Props) {
  const { slug } = await params;
  if (!(slug in showcaseMeta)) notFound();

  return <ShowcaseClient slug={slug as keyof typeof showcaseMeta} />;
}
