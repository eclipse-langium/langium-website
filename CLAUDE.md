# Langium Website — AI Instructions

## Project Overview

This is the official website for [Langium](https://langium.org), an open-source language engineering toolkit. The site is a Next.js 16 application (App Router, static export) deployed to GitHub Pages.

## Workspace Structure

```
langium-website/
├── core/                    # Shared utilities package (langium-website-core)
│   └── src/
│       └── monaco-editor-wrapper-utils.ts   # createUserConfig() helper
├── web/                     # Next.js 16 application
│   ├── app/                 # App Router pages
│   │   ├── layout.tsx       # Root layout (Header + Footer)
│   │   ├── page.tsx         # Homepage with GSAP animations
│   │   ├── docs/[[...slug]]/page.tsx   # All documentation pages
│   │   ├── showcase/[slug]/page.tsx    # Language showcase pages
│   │   └── playground/page.tsx        # Interactive playground
│   ├── components/
│   │   ├── Header.tsx       # Navigation header
│   │   ├── Footer.tsx       # Page footer
│   │   ├── Sidebar.tsx      # Docs sidebar navigation
│   │   ├── home/            # Homepage section components
│   │   ├── mdx/             # MDX shortcode components
│   │   ├── showcase/        # Monaco editor showcase components
│   │   └── playground/      # Playground React components
│   ├── content/docs/        # MDX documentation files (~48 pages)
│   ├── lib/
│   │   ├── docs-nav.ts      # Navigation tree for docs sidebar
│   │   └── docs.ts          # MDX loading utilities
│   ├── scripts/
│   │   └── build-workers.mjs  # Pre-build: bundles language server workers
│   ├── styles/globals.css   # TailwindCSS v4 + custom theme
│   ├── workers/playground/  # Playground language server worker sources
│   └── public/              # Static assets (workers built here at prebuild)
├── scripts/
│   └── migrate-content.mjs  # One-time Hugo→MDX migration script (done)
└── .github/workflows/
    ├── deploy.yml           # Deploy to GitHub Pages on push to main
    └── preview.yml          # Deploy PR previews
```

## Build Commands

```bash
# Development (builds core then starts Next.js dev server)
npm run dev

# Production build (builds core, then Next.js static export to web/out/)
npm run build

# Individual workspace commands
npm run build --workspace core   # Build core package
npm run dev --workspace web      # Start Next.js dev server only
npm run build --workspace web    # Build Next.js to web/out/

# Clean all build artifacts
npm run clean
```

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, `output: 'export'`) |
| Styling | TailwindCSS v4 (CSS-first `@theme`, no `tailwind.config.ts`) |
| Documentation | MDX via `@next/mdx` with `rehype-pretty-code` |
| Monaco Editor | `monaco-languageclient` 10.7.0 + `monaco-editor-workers` |
| Animations | GSAP (ScrollTrigger, ScrollToPlugin, Draggable) |
| Tree Visualization | D3.js |
| Language | TypeScript 5.9, React 19, Node 20 LTS |

## Tailwind Custom Colors

Defined in `web/styles/globals.css` under `@theme`:

| Token | Value | Usage |
|---|---|---|
| `emerald-langium` | `#26888C` | Primary brand color |
| `emerald-langium-darker` | `#1e4d4f` | Dark backgrounds |
| `emerald-langium-darkest` | `#0a1a1b` | Deepest backgrounds |
| `emerald-langium-a-bit-darker` | `#267073` | Hover states |
| `accent-blue` | `#1E90FF` | Code: identifiers |
| `accent-green` | `#3CB371` | Code: values |
| `accent-red` | `#DC143C` | Error borders |
| `accent-violet` | `#8A2BE2` | TypeScript accent |

## Content Editing (Documentation)

Documentation lives in `web/content/docs/` as `.mdx` files. Each file has frontmatter:

```mdx
---
title: My Page Title
description: Brief description for SEO
weight: 10
url: /docs/some/path/
---

Regular Markdown content here.
```

### Available MDX Components

| Component | Usage |
|---|---|
| `<Mermaid chart={...} />` | Mermaid diagrams |
| `<Notification>` | Info notification box |
| `<Hint type="info\|warning\|danger">` | Colored hint box |
| `<Tabs><Tab label="A">content</Tab></Tabs>` | Tabbed content |
| `<Expand title="...">` | Collapsible section |
| `<Columns>` | Multi-column layout |

### Sidebar Navigation

The sidebar is generated from `web/lib/docs-nav.ts`. When adding a new doc page:
1. Add the `.mdx` file to `web/content/docs/`
2. Add an entry to the appropriate section in `docs-nav.ts`
3. The `weight` frontmatter field controls sort order within sections

## Interactive Features

### Showcase Pattern

Each showcase (`/showcase/statemachine`, etc.) consists of:
- `web/components/showcase/XxxShowcase.tsx` — React component with Monaco editor
- `web/components/showcase/xxx-tools.ts` — Language-specific utilities
- A compiled worker at `web/public/workers/xxxServerWorker.js` (built by `build-workers.mjs`)

To add a new showcase:
1. Create `web/components/showcase/NewShowcase.tsx` following the existing pattern
2. Add the worker entry in `web/scripts/build-workers.mjs`
3. Register the showcase in `web/app/showcase/[slug]/page.tsx` (both metadata and component maps)
4. Add a card in `web/app/showcase/page.tsx`

### Playground Architecture

The playground (`/playground`) uses three panes:
- **Left**: Monaco editor for Langium grammar (`.langium` language, LSP from `langiumServerWorker.js`)
- **Center**: Monaco editor for DSL content (dynamic language from `userServerWorker.js`)
- **Right**: AST tree viewer (React component in `web/components/playground/Tree.tsx`)

When the grammar changes, a new `userServerWorker.js` instance is spawned with the new grammar, and the DSL editor is remounted.

### Worker Build

Workers are IIFE bundles built before `next build`:
```bash
node web/scripts/build-workers.mjs
```

Worker sources:
- Language showcase workers: from installed npm packages (e.g., `langium-statemachine-dsl`)
- Playground workers: `web/workers/playground/langium-worker.ts` and `user-worker.ts`

## Deployment

Static output is in `web/out/` after `npm run build`. GitHub Actions deploys this to GitHub Pages:
- **Production**: Push to `main` → `deploy.yml` → GitHub Pages
- **PR Previews**: Open PR → `preview.yml` → `eclipse-langium/langium-previews` repo

## URL Structure

All URLs must match existing Hugo routes (SEO preservation):

| Path | Description |
|---|---|
| `/` | Homepage |
| `/docs/introduction/` | Getting started |
| `/docs/learn/workflow/` | Learning section |
| `/docs/reference/grammar-language/` | Reference docs |
| `/showcase/` | Showcase grid |
| `/showcase/statemachine/` | Statemachine demo |
| `/playground/` | Interactive playground |
| `/api` | Redirects to external API docs |
