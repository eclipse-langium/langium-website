export interface NavItem {
  title: string;
  href: string;
  weight: number;
  children?: NavItem[];
}

// Docs navigation tree, ordered by weight (ascending = earlier in sidebar)
export const docsNav: NavItem[] = [
  {
    title: 'What is Langium?',
    href: '/docs/introduction/',
    weight: -100,
    children: [
      { title: 'Features', href: '/docs/features/', weight: 200 },
      { title: 'Showcases', href: '/docs/introduction/showcases/', weight: 300 },
      { title: 'Try it out!', href: '/docs/introduction/playground/', weight: 400 },
    ],
  },
  {
    title: 'Learn Langium',
    href: '/docs/learn/',
    weight: 0,
    children: [
      {
        title: "Langium's Workflow",
        href: '/docs/learn/workflow/',
        weight: 0,
        children: [
          { title: '1. Install Yeoman', href: '/docs/learn/workflow/install/', weight: 200 },
          { title: '2. Scaffold a Langium project', href: '/docs/learn/workflow/scaffold/', weight: 300 },
          { title: '3. Write the grammar', href: '/docs/learn/workflow/write_grammar/', weight: 400 },
          { title: '4. Generate the AST', href: '/docs/learn/workflow/generate_ast/', weight: 500 },
          { title: '5. Resolve cross-references', href: '/docs/learn/workflow/resolve_cross_references/', weight: 600 },
          { title: '6. Create validations', href: '/docs/learn/workflow/create_validations/', weight: 700 },
          { title: '7. Generate artifacts', href: '/docs/learn/workflow/generate_everything/', weight: 800 },
        ],
      },
      {
        title: 'MiniLogo Tutorial',
        href: '/docs/learn/minilogo/',
        weight: 200,
        children: [
          { title: 'Writing a Grammar', href: '/docs/learn/minilogo/writing_a_grammar/', weight: 0 },
          { title: 'Validation', href: '/docs/learn/minilogo/validation/', weight: 1 },
          { title: 'Customizing the CLI', href: '/docs/learn/minilogo/customizing_cli/', weight: 2 },
          { title: 'Generation', href: '/docs/learn/minilogo/generation/', weight: 3 },
          { title: 'Building an Extension', href: '/docs/learn/minilogo/building_an_extension/', weight: 5 },
          { title: 'Langium + Monaco Editor', href: '/docs/learn/minilogo/langium_and_monaco/', weight: 6 },
          { title: 'Generation in the Web', href: '/docs/learn/minilogo/generation_in_the_web/', weight: 7 },
        ],
      },
    ],
  },
  {
    title: 'Recipes',
    href: '/docs/recipes/',
    weight: 400,
    children: [
      {
        title: 'Scoping',
        href: '/docs/recipes/scoping/',
        weight: 100,
        children: [
          { title: 'Qualified Name Scoping', href: '/docs/recipes/scoping/qualified-name/', weight: 100 },
          { title: 'Class Member Scoping', href: '/docs/recipes/scoping/class-member/', weight: 200 },
          { title: 'File-based Scoping', href: '/docs/recipes/scoping/file-based/', weight: 300 },
        ],
      },
      {
        title: 'Lexing',
        href: '/docs/recipes/lexing/',
        weight: 50,
        children: [
          { title: 'Case-insensitive Languages', href: '/docs/recipes/lexing/case-insensitive-languages/', weight: 100 },
          { title: 'Indentation-sensitive Languages', href: '/docs/recipes/lexing/indentation-sensitive-languages/', weight: 300 },
        ],
      },
      {
        title: 'Validation',
        href: '/docs/recipes/validation/',
        weight: 150,
        children: [
          { title: 'Dependency Loops', href: '/docs/recipes/validation/dependency-loops/', weight: 100 },
        ],
      },
      {
        title: 'Performance',
        href: '/docs/recipes/performance/',
        weight: 175,
        children: [
          { title: 'Caches', href: '/docs/recipes/performance/caches/', weight: 0 },
        ],
      },
      { title: 'Builtin Libraries', href: '/docs/recipes/builtin-library/', weight: 200 },
      { title: 'Formatting', href: '/docs/recipes/formatting/', weight: 300 },
      { title: 'Keywords as Identifiers', href: '/docs/recipes/keywords-as-identifiers/', weight: 300 },
      { title: 'Multiple Dependent Languages', href: '/docs/recipes/multiple-languages/', weight: 400 },
      { title: 'Code Bundling', href: '/docs/recipes/code-bundling/', weight: 900 },
    ],
  },
  {
    title: 'Reference',
    href: '/docs/reference/',
    weight: 300,
    children: [
      { title: 'Glossary', href: '/docs/reference/glossary/', weight: 50 },
      {
        title: 'Grammar Language',
        href: '/docs/reference/grammar-language/',
        weight: 100,
        children: [
          {
            title: 'Infix Operators',
            href: '/docs/reference/grammar-language/infix-operators/',
            weight: 125,
            children: [
              { title: 'Syntactical Implementation', href: '/docs/reference/grammar-language/infix-operators/syntactical-implementation/', weight: 0 },
              { title: 'Manual Implementation', href: '/docs/reference/grammar-language/infix-operators/manual-implementation/', weight: 1 },
            ],
          },
        ],
      },
      { title: 'Configuration via Services', href: '/docs/reference/configuration-services/', weight: 200 },
      { title: 'Document Lifecycle', href: '/docs/reference/document-lifecycle/', weight: 300 },
      { title: 'Semantic Model Inference', href: '/docs/reference/semantic-model/', weight: 400 },
    ],
  },
];

/** Flatten nav tree to a list of all hrefs, for generateStaticParams */
export function flattenNav(items: NavItem[]): string[] {
  return items.flatMap((item) => [
    item.href,
    ...(item.children ? flattenNav(item.children) : []),
  ]);
}
