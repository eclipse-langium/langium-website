---
title: "Recipes"
weight: 400
url: "/docs/recipes"
---

## Where to go from here?

Take your time to study the recipes within the navigation on the left. They are designed to help you with common tasks and challenges you might face when working with Langium. If you have any questions or suggestions, feel free to [create an issue](https://github.com/eclipse-langium/langium/issues) or [start a discussion](https://github.com/eclipse-langium/langium/discussions) on the Github repository.

After getting familar with Langium, you might investigate the growing ecosystem of Langium.


### Typir

You need type checking for your expressions or programming language-like DSL in order to provide users with type-related validations?
[Typir](https://typir.org/) is an open source TypeScript library for type checking and developing type systems in the web.
Look at the [LOX application](https://github.com/TypeFox/typir/blob/main/examples/lox/src/language/lox-type-checking.ts) to see how to apply Typir and its dedicated binding for Langium.


### Langium-SQL

You are working with SQL or DSL targeting data bases?
Checkout [Langium/SQL](https://github.com/TypeFox/langium-sql) for editing SQL schemas and queries and adjust it to the needs of your SQL dialect.
Try it in the [provided playground here](https://langium.org/showcase/sql/).


### Xtext-to-Langium

You have an existing [Xtext](https://eclipse.dev/Xtext/) project and are considering to migrate to Langium?
Use [xtext2langium](https://github.com/TypeFox/xtext2langium) to generate Langium grammars and type definitions from your existing Xtext grammars and Ecore models and start exploring DSL development with Langium.


### Sprotty integration

You want to visualize programs conforming to your Langium DSL in a diagram?
The open source TypeScript framework [Eclipse Sprotty](https://sprotty.org/) renders powerful diagrams and graphical visualizations for web applications
and provides an [integration with Langium](https://github.com/eclipse-langium/langium/tree/main/packages/langium-sprotty).


### Langium-AST-Helper

You want to work with the AST provided by Langium in a non-Langium context?
The [Langium-AST-Helper](https://www.npmjs.com/package/langium-ast-helper) is a utility for transforming Langium ASTs into various data structures/formats for consumption as data.
