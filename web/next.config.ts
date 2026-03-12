import type { NextConfig } from 'next';
import createMDX from '@next/mdx';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Collect extra module resolution paths for packages nested by npm dedupe.
// This is needed because langium (v4) is in web/node_modules but its
// transitive dep vscode-languageserver-types ended up nested under root
// node_modules/vscode-languageserver/node_modules/.
const rootNodeModules = resolve(__dirname, '..', 'node_modules');
const extraModulePaths: string[] = [];
for (const pkg of ['vscode-languageserver', 'vscode-languageclient']) {
  const nested = resolve(rootNodeModules, pkg, 'node_modules');
  if (existsSync(nested)) extraModulePaths.push(nested);
}

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  pageExtensions: ['tsx', 'ts', 'mdx', 'md'],
  transpilePackages: ['langium-website-core'],
  webpack: (config) => {
    // Tailwind v4 generates CSS nesting (& selectors) which webpack's css-loader
    // incorrectly tries to resolve as module URLs. Disable URL resolution since
    // all static assets use absolute paths (served from /public/).
    config.module.rules.forEach((rule: any) => {
      if (!rule.oneOf) return;
      rule.oneOf.forEach((r: any) => {
        const uses = Array.isArray(r.use) ? r.use : r.use ? [r.use] : [];
        uses.forEach((u: any) => {
          if (u.loader && typeof u.loader === 'string' && u.loader.includes('css-loader') && u.options) {
            u.options.url = false;
          }
        });
      });
    });

    // Add extra module directory paths so webpack can resolve transitive deps
    // (e.g. vscode-languageserver-types) that npm only installed nested under
    // root node_modules/vscode-languageserver/node_modules/.
    if (extraModulePaths.length > 0) {
      config.resolve.modules = [...(config.resolve.modules ?? ['node_modules']), ...extraModulePaths];
    }

    return config;
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ['remark-gfm', 'remark-frontmatter'],
    rehypePlugins: ['rehype-slug', 'rehype-autolink-headings'],
  },
});

export default withMDX(nextConfig);
