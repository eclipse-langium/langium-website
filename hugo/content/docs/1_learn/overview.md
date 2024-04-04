---
title: "Overview"
weight: 100
url: /docs/learn
---

{{<mermaid>}}
flowchart TD
  A(["1. Install Yeoman generator"]);
  B(["2. Scaffold a Langium project"]);
  C(["3. Write the grammar"]);
  D(["4. Generate AST files"]);
  E(["5. Resolve cross-references"]);
  F(["6. Create validations"]);
  G(["7. Generate what you want"]);
  H(["8. Find advanced topics"]);
  A --> B --> C --> D --> E --> F --> G --> H;
  G -- reiterate --> C;

  click A "/docs/learn/install"
  click B "/docs/learn/scaffold"
  click C "/docs/learn/write_grammar"
  click D "/docs/learn/generate_ast"
  click E "/docs/learn/resolve_cross_references"
  click F "/docs/learn/create_validations"
  click G "/docs/learn/generate_everything"
  click H "/docs/recipes"
{{</mermaid>}}
