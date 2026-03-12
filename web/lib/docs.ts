import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import matter from 'gray-matter';

const CONTENT_DIR = resolve(process.cwd(), 'content/docs');

/**
 * Maps a URL path like /docs/features/ to the MDX file path.
 * Strategy: strip /docs/ prefix, try multiple file path candidates.
 */
export function urlToFilePath(urlPath: string): string | null {
  // Normalize: remove leading/trailing slashes, strip /docs/ prefix
  const normalized = urlPath.replace(/^\/docs\/?/, '').replace(/\/$/, '');

  const candidates = [
    join(CONTENT_DIR, `${normalized}.mdx`),
    join(CONTENT_DIR, `${normalized}.md`),
    join(CONTENT_DIR, normalized, '_index.mdx'),
    join(CONTENT_DIR, normalized, '_index.md'),
    join(CONTENT_DIR, normalized, 'index.mdx'),
    join(CONTENT_DIR, normalized, 'index.md'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export interface DocFrontmatter {
  title: string;
  description?: string;
  weight?: number;
}

export interface DocPage {
  frontmatter: DocFrontmatter;
  content: string;
  filePath: string;
}

export function loadDocPage(urlPath: string): DocPage | null {
  const filePath = urlToFilePath(urlPath);
  if (!filePath) return null;

  const raw = readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  return {
    frontmatter: {
      title: (data.title as string) ?? '',
      description: data.description as string | undefined,
      weight: data.weight as number | undefined,
    },
    content,
    filePath,
  };
}
