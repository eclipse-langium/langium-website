import type { NextConfig } from 'next';
import createMDX from '@next/mdx';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  pageExtensions: ['tsx', 'ts', 'mdx', 'md'],
  transpilePackages: ['langium-website-core'],
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ['remark-gfm', 'remark-frontmatter'],
    rehypePlugins: ['rehype-slug', 'rehype-autolink-headings'],
  },
});

export default withMDX(nextConfig);
