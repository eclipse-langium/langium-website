import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { flattenNav, docsNav } from '@/lib/docs-nav';
import { loadDocPage } from '@/lib/docs';
import { Notification } from '@/components/mdx/Notification';
import { Hint } from '@/components/mdx/Hint';
import { Tabs, Tab } from '@/components/mdx/Tabs';
import { Expand } from '@/components/mdx/Expand';
import { Columns } from '@/components/mdx/Columns';
import { Mermaid } from '@/components/mdx/Mermaid';

const mdxComponents = { Notification, Hint, Tabs, Tab, Expand, Columns, Mermaid };

// Strip top-level MDX import lines so evaluate() doesn't need baseUrl
function stripMdxImports(content: string): string {
  return content.replace(/^import\s+.*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '');
}

interface Props {
  params: Promise<{ slug?: string[] }>;
}

export async function generateStaticParams() {
  const hrefs = flattenNav(docsNav);
  return [
    { slug: undefined },
    ...hrefs.map((href) => {
    // Strip /docs/ prefix and trailing slash, split into segments
    const stripped = href.replace(/^\/docs\/?/, '').replace(/\/$/, '');
    return {
      slug: stripped ? stripped.split('/') : undefined,
    };
    }),
  ];
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

  if (!slug || slug.length === 0) {
    redirect('/docs/introduction/');
  }

  const urlPath = `/docs/${slug?.join('/') ?? ''}`;
  const page = loadDocPage(urlPath);

  if (!page) notFound();

  const { default: Content } = await evaluate(stripMdxImports(page.content), {
    ...(runtime as any),
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug],
  });

  return (
    <article className="docs-content prose-sm max-w-none">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {page.frontmatter.title}
      </h1>
      <Content components={mdxComponents} />
    </article>
  );
}
