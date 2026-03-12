#!/usr/bin/env node
/**
 * Migrates Hugo markdown docs to web/content/docs/ as MDX files.
 * - Copies directory structure
 * - Converts Hugo shortcodes to MDX-compatible markup
 * - Strips Hugo-specific frontmatter fields
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname, relative, basename } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const srcDir = resolve(repoRoot, 'hugo/content/docs');
const destDir = resolve(repoRoot, 'web/content/docs');

// Get all .md files
const files = execSync(`find "${srcDir}" -name "*.md"`, { encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(Boolean);

let converted = 0;
let skipped = 0;

for (const srcPath of files) {
  const relPath = relative(srcDir, srcPath);
  let destRelPath = relPath.replace(/\.md$/, '.mdx');

  const destPath = resolve(destDir, destRelPath);
  mkdirSync(dirname(destPath), { recursive: true });

  let content = readFileSync(srcPath, 'utf-8');

  // === Frontmatter cleanup ===
  // Remove Hugo-specific fields: type, layout, geekdocHidden, noMain, socialImage, useRegularFont
  content = content.replace(/^(type|layout|geekdocHidden|geekdochidden|noMain|socialImage|useRegularFont):\s*.+$/gm, '');

  // === Shortcode conversions ===

  // {{< mermaid >}}...{{< /mermaid >}} -> <Mermaid chart={`...`} />
  content = content.replace(
    /\{\{<\s*mermaid\s*>\}\}\n([\s\S]*?)\n\{\{<\s*\/mermaid\s*>\}\}/g,
    (_, chart) => {
      const escaped = chart.trim().replace(/`/g, '\\`').replace(/\$/g, '\\$');
      return `<Mermaid chart={\`${escaped}\`} />`;
    }
  );

  // {{< toc format=html >}} or {{< toc >}} -> remove (layout handles TOC)
  content = content.replace(/\{\{<\s*toc[^>]*>\}\}\s*\n?/g, '');

  // {{< notification >}}...{{< /notification >}}
  content = content.replace(
    /\{\{<\s*notification\s*>\}\}([\s\S]*?)\{\{<\s*\/notification\s*>\}\}/g,
    (_, inner) => `<Notification>\n${inner.trim()}\n</Notification>`
  );

  // {{< hint type="..." >}}...{{< /hint >}} or {{< hint warning >}}...
  content = content.replace(
    /\{\{<\s*hint\s+(?:type=")?(\w+)"?\s*>\}\}([\s\S]*?)\{\{<\s*\/hint\s*>\}\}/g,
    (_, type, inner) => `<Hint type="${type}">\n${inner.trim()}\n</Hint>`
  );

  // {{< tabs >}}...{{< /tabs >}} and {{< tab "Label" >}}...{{< /tab >}}
  content = content.replace(
    /\{\{<\s*tabs\s*>\}\}([\s\S]*?)\{\{<\s*\/tabs\s*>\}\}/g,
    (_, inner) => {
      let tabsContent = inner;
      // Replace inner {{< tab "label" >}}...{{< /tab >}}
      tabsContent = tabsContent.replace(
        /\{\{<\s*tab\s+"([^"]+)"\s*>\}\}([\s\S]*?)\{\{<\s*\/tab\s*>\}\}/g,
        (__, label, content) => `  <Tab label="${label}">\n${content.trim()}\n  </Tab>`
      );
      return `<Tabs>\n${tabsContent.trim()}\n</Tabs>`;
    }
  );

  // {{< expand "title" >}}...{{< /expand >}}
  content = content.replace(
    /\{\{<\s*expand\s+"([^"]+)"\s*>\}\}([\s\S]*?)\{\{<\s*\/expand\s*>\}\}/g,
    (_, title, inner) => `<Expand title="${title}">\n${inner.trim()}\n</Expand>`
  );

  // {{< columns >}}...{{< /columns >}}
  content = content.replace(
    /\{\{<\s*columns\s*>\}\}([\s\S]*?)\{\{<\s*\/columns\s*>\}\}/g,
    (_, inner) => `<Columns>\n${inner.trim()}\n</Columns>`
  );

  // Check if MDX imports are needed
  const needsImports = [];
  if (content.includes('<Mermaid')) needsImports.push("import { Mermaid } from '@/components/mdx/Mermaid';");
  if (content.includes('<Notification>')) needsImports.push("import { Notification } from '@/components/mdx/Notification';");
  if (content.includes('<Hint')) needsImports.push("import { Hint } from '@/components/mdx/Hint';");
  if (content.includes('<Tabs>')) needsImports.push("import { Tabs, Tab } from '@/components/mdx/Tabs';");
  if (content.includes('<Expand')) needsImports.push("import { Expand } from '@/components/mdx/Expand';");
  if (content.includes('<Columns>')) needsImports.push("import { Columns } from '@/components/mdx/Columns';");

  // Add imports after frontmatter (after the closing ---)
  if (needsImports.length > 0) {
    content = content.replace(
      /^(---[\s\S]*?---)\n/,
      `$1\n\n${needsImports.join('\n')}\n\n`
    );
  }

  writeFileSync(destPath, content, 'utf-8');
  converted++;
  console.log(`  ✓ ${relPath}`);
}

console.log(`\nMigrated ${converted} files, skipped ${skipped}.`);
console.log(`Output: ${destDir}`);
