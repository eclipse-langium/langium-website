---
title: "Langium's workflow"
weight: 0
url: /docs/learn/workflow
aliases:
  - /docs/getting-started
---

Langium's workflow can be expressed as a flow chart diagram, which boils down to the following steps in the diagram.
Be aware of the fact that the possibilities go beyond this simple workflow. For more advanced topics, you can find answers in the [recipes](/docs/recipes).

{{<mermaid>}}
flowchart TD
  A(["1.&nbsp;Install Yeoman"]);
  B(["2.&nbsp;Scaffold a Langium project"]);
  C(["3.&nbsp;Write the grammar"]);
  D(["4.&nbsp;Generate the AST"]);
  E(["5.&nbsp;Resolve cross-references"]);
  F(["6.&nbsp;Create validations"]);
  G(["7.&nbsp;Generate artifacts"]);
  H(["Find advanced topics"]);
  A --> B --> C --> D --> E --> F --> G ~~~ H;
  G -- for each additional\ngrammar change --> C;

  click A "/docs/learn/workflow/install"
  click B "/docs/learn/workflow/scaffold"
  click C "/docs/learn/workflow/write_grammar"
  click D "/docs/learn/workflow/generate_ast"
  click E "/docs/learn/workflow/resolve_cross_references"
  click F "/docs/learn/workflow/create_validations"
  click G "/docs/learn/workflow/generate_everything"
  click H "/docs/recipes"
{{</mermaid>}}

## Explanation

This is the workflow we recommend for developing a language with Langium. It is a step-by-step guide that will help you to get started with Langium and to understand the basics of language development.

This simple introduction can be seen as three main parts:

* setting up your project environment (1.+2.): this is only done once
* specifying the language features (3.-7.): this cycle you need to go through for each grammar change
* everything advanced (8.): The limit of the common workflow is reached here. For specific questions you can find answers in the [recipes](/docs/recipes).

While the first part is straight-forward, the last part is about advanced topics that differ from project to project.
The middle part will be explained briefly in the following section.

## Initial setup

### [1. Install Yeoman](/docs/learn/workflow/install)

This step ensures that you start a Langium project with the Yeoman generator. Yeoman is a scaffolding tool that helps you to start a new project with a predefined structure.

### [2. Scaffold a Langium project](/docs/learn/workflow/scaffold)

After installing Yeoman, you can scaffold a new Langium project.

## Core workflow

### [3. Write the grammar](/docs/learn/workflow/write_grammar)

The first step in the core workflow starts with the grammar. You will have some language feature in mind that you want to implement. The grammar is used to nail down the syntax of your features. You can use our Langium VS Code extension to get syntax highlighting and code completion for `.langium` files. If your grammar is free of errors, you can generate the files for the _abstract syntax tree (AST)_.

### [4. Generate the AST](/docs/learn/workflow/generate_ast)

The AST is the backbone of your language. It is used to represent the structure of your language elements. The AST is generated from the grammar. One important part of the AST are the _cross-references_. They are used to resolve references between language elements. If you have cross-references in your language, you need to _resolve_ them, after this step. The actual generation is done by a call of the Langium CLI.

### [5. Resolve cross-references](/docs/learn/workflow/resolve_cross_references)

The cross-references are used to resolve references between language elements (between different sub trees of one file or even elements of other files(!)). This step is quite important, because it is the basis for the next steps. You can also see it like this: Step 4 will generate an AST with gaps, this fifth step will fill these gaps.

### [6. Create validations](/docs/learn/workflow/create_validations)

From here we have a fully utilized AST. Now every input file that matches the syntax will be accepted. But we want to have more control over the input. We want to check if the input is semantically correct. This is done by creating _validations_. They are used to check the input against a set of rules. If the input does not match the rules, an error will be thrown.

### [7. Generate artifacts](/docs/learn/workflow/generate_everything)

Now you have a fully working language. You can generate whatever you want from the input. This can be code, documentation, or anything else. You can use the AST to traverse the input and generate the output.

## [Find advanced topics](/docs/recipes)

Everything that is out of the scope of the common workflow is covered in the recipes. Here you can find answers to specific questions or problems that you might encounter during the development of your language.
