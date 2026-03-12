import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { flattenNav, docsNav } from '@/lib/docs-nav';
import { loadDocPage } from '@/lib/docs';
import { DocsContent } from './DocsContent';

interface Props {
  params: Promise<{ slug?: string[] }>;
}

export async function generateStaticParams() {
  const hrefs = flattenNav(docsNav);
  return hrefs.map((href) => {
    // Strip /docs/ prefix and trailing slash, split into segments
    const stripped = href.replace(/^\/docs\/?/, '').replace(/\/$/, '');
    return {
      slug: stripped ? stripped.split('/') : undefined,
    };
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const urlPath = `/docs/${slug?.join('/') ?? ''}`;
  const page = loadDocPage(urlPath);

  if (!page) return { title: 'Not Found' };

  return {
    title: page.frontmatter.title,
    description: page.frontmatter.description,
  };
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const urlPath = `/docs/${slug?.join('/') ?? ''}`;
  const page = loadDocPage(urlPath);

  if (!page) notFound();

  return (
    <article className="docs-content prose-sm max-w-none">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {page.frontmatter.title}
      </h1>
      <DocsContent content={page.content} />
    </article>
  );
}
