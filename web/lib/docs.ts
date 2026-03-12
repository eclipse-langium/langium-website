import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import matter from 'gray-matter';

const CONTENT_DIR = resolve(process.cwd(), 'content/docs');

// Cache of Hugo `url` frontmatter overrides → absolute file path
let urlFrontmatterCache: Map<string, string> | null = null;

function getUrlFrontmatterCache(): Map<string, string> {
  if (urlFrontmatterCache) return urlFrontmatterCache;
  urlFrontmatterCache = new Map();

  function scanDir(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        scanDir(full);
      } else if (entry.endsWith('.mdx') || entry.endsWith('.md')) {
        const raw = readFileSync(full, 'utf-8');
        const { data } = matter(raw);
        if (data.url) {
          const key = (data.url as string).replace(/\/$/, '');
          urlFrontmatterCache!.set(key, full);
        }
      }
    }
  }

  scanDir(CONTENT_DIR);
  return urlFrontmatterCache;
}

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

  // Fallback: look up by Hugo `url` frontmatter override
  const cache = getUrlFrontmatterCache();
  const urlKey = `/docs/${normalized}`.replace(/\/$/, '');
  return cache.get(urlKey) ?? null;
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
