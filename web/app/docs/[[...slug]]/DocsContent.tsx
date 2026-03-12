'use client';

import { useEffect, useRef } from 'react';

// Dynamic import of marked for client-side markdown rendering
// MDX compilation happens server-side via next/mdx; this component handles
// raw markdown content loaded from .md files that haven't been converted yet.

interface DocsContentProps {
  content: string;
}

export function DocsContent({ content }: DocsContentProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Process mermaid diagrams if present
    const hasMermaid = content.includes('{{< mermaid');
    if (!hasMermaid || !ref.current) return;

    import('mermaid').then((m) => {
      m.default.initialize({ startOnLoad: false, theme: 'dark' });
      m.default.run({ nodes: ref.current!.querySelectorAll('.mermaid') });
    });
  }, [content]);

  // Convert Hugo shortcodes to HTML before rendering
  const processed = processHugoShortcodes(content);

  return (
    <div
      ref={ref}
      className="docs-content"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  );
}

/**
 * Converts remaining Hugo shortcodes in raw markdown to HTML equivalents.
 * This is a lightweight fallback for content that hasn't been converted to MDX yet.
 * After full MDX migration, this component will be replaced with compiled MDX output.
 */
function processHugoShortcodes(markdown: string): string {
  let html = markdown;

  // Convert {{< mermaid >}} blocks to <div class="mermaid">
  html = html.replace(/\{\{<\s*mermaid\s*>\}\}([\s\S]*?)\{\{<\s*\/mermaid\s*>\}\}/g, (_, chart: string) => {
    return `<div class="mermaid">${chart.trim()}</div>`;
  });

  // Remove {{< toc >}} — handled by layout
  html = html.replace(/\{\{<\s*toc[^>]*>\}\}/g, '');

  // Convert {{< notification >}} blocks
  html = html.replace(/\{\{<\s*notification\s*>\}\}([\s\S]*?)\{\{<\s*\/notification\s*>\}\}/g, (_, inner: string) => {
    return `<div class="my-4 rounded-md border border-yellow-400 bg-yellow-50 dark:border-yellow-600 dark:bg-yellow-900/20 p-4"><span class="mr-2 text-yellow-600">⚠</span><span class="text-sm text-yellow-800 dark:text-yellow-200">${inner.trim()}</span></div>`;
  });

  // Basic markdown-to-HTML for headings, code blocks, bold, italic
  // (A proper markdown renderer should be used in production; this is minimal)
  // Code blocks with fences
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang: string, code: string) => {
    return `<pre class="rounded bg-gray-900 p-4 overflow-x-auto my-4"><code class="language-${lang}">${escapeHtml(code.trim())}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 text-sm font-mono">$1</code>');

  // Headings
  html = html.replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#{4}\s+(.+)$/gm, '<h4 id="$1">$1</h4>');
  html = html.replace(/^#{3}\s+(.+)$/gm, (_, title: string) => `<h3 id="${slugify(title)}">${title}</h3>`);
  html = html.replace(/^#{2}\s+(.+)$/gm, (_, title: string) => `<h2 id="${slugify(title)}">${title}</h2>`);
  html = html.replace(/^#{1}\s+(.+)$/gm, (_, title: string) => `<h1 id="${slugify(title)}">${title}</h1>`);

  // Bold / italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-emerald-langium underline">$1</a>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-6 border-gray-200 dark:border-gray-700" />');

  // Paragraphs (wrap lines separated by blank lines)
  html = html.replace(/(?<=\n\n|^)([^<\n][^\n]+(?:\n[^<\n][^\n]+)*)(?=\n\n|$)/gm, '<p>$1</p>');

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
}
