---
title: "Langium Overview"
weight: 0
---

Designing programming languages from the ground up is hard, independent of whether your language is a "simple" domain specific language or a full-fledged general-purpose programming language.
Not only do you have to keep up with the requirements of your domain experts, but you have to deal with all the technical complexity that comes with building a language, including questions such as:

- How do I get from a string to a semantic model which I can work with?
- How do I resolve references to other parts of my model, even if they are located in a separate file?
- How do I provide a great editing experience to users of my language?

This is the point where Langium comes into play. Langium aims to lower the barrier to entry for creating a language by removing the technical complexity, allowing you to focus on your domain's requirements.

In this chapter, you'll get a closer look at the requirements developers usually have to implement by themselves when building a programming language:

- [Language parsing](#language-parsing)
- [Semantic models](#semantic-models)
- [Cross references and linking](#cross-references-and-linking)
- [Workspace management](#workspace-management)
- [Editing support](#editing-support)

Langium provides out-of-the-box solutions for these problems, with the ability to fine-tune every part of it to fit your domain requirements.

---

## Language Parsing

Programming languages and domain specific languages (DSLs) cannot be parsed using simple regular expressions (RegExp). Instead they require a more sophisticated parsing strategy. To define a custom language in Langium, you interact with a high level representation of your context-free grammar using the [Langium grammar language](/docs/grammar-language), in a similar fashion to EBNF.

Based on the grammar, Langium is then able to construct a parser which transforms an input string into a semantic model representation. Just as the name suggests, this model captures the essential structure to describe your language.

## Semantic Models

Langium grammars are not only used to parse your language, but also to generate a semantic model for your Language as TypeScript interfaces. When a program in your language is then parsed, the generated AST will be automatically produced using these interfaces. The following language snippet parses a simple object `{ name: 'John' }`.

```ts
Person:
    'person' // keyword 
    name=ID // semantic assignment
;
```

To interact with the semantic model in a type safe manner, the `langium-cli` tool generates TypeScript type definitions from your parser rules. The `Person` parser rule generates the following interface:

```ts
interface Person {
    name: String
}
```

These interfaces allow you to safely traverse your abstract syntax tree. In case your grammar changes, they will also notify you of any breaking changes which might require you to change your domain logic.

## Cross References and Linking

To express any kind of relationship between elements in your language, you will need to **reference** them.
The process of resolving these references, i.e. identifying what element of your language hides behind a certain name, is called _linking_.
Performing the linking process in a deterministic manner with a lot of objects in your project requires sound linking design.

Langium accomplishes this feat by using the concept of 'scoping'. You likely know scopes from programming, where some variables are only available from certain scopes:

```ts
let x = 42;
x = 3; // References the `x` defined in the previous line

if (something) {
    let y = 42;
}
y = 3; // Cannot link, `y` isn't in any of the available scopes
```

The same occurs in Langium. To enable more complex scoping behavior, you can add custom domain scoping. For example, common object-oriented languages need a more involved scoping mechanism to resolve references to fields and methods of a class:

```ts
class X {
    y(): void { ... }
}

const instance = new X(); // Symbol `X` is in the local scope
instance.y(); // Symbol `y` exists in the scope of the `X` class
```

Once your domain specific scoping rules have been defined, Langium will take care of linking by itself, reporting any errors. 

## Workspace Management

Like with common modularized programming languages, domain logic written in your DSL will usually be split across multiple files to facilitate ease of use and maintenance. This is also possible using Langium, which automatically tries to pick up any files belonging to your current project.

When running a Langium based language in a [language server](https://microsoft.github.io/language-server-protocol/), all files in your workspace (the folder containing your current project) belonging to your DSL will automatically be picked up and processed. In addition, any changes in your workspace will be handled as well. Dealing with added, changed or deleted files in a workspace with multiple hundreds of files can become complicated and decrease performance drastically if not done correctly. Langium employs heuristics to only invalidate and recompute what is actually necessary.

The workspace management also keeps track of the global scope. This allows users of your DSL to reference elements across files within the same workspace.

## Editing Support

The Langium framework is deeply integrated with the [language server protocol](https://microsoft.github.io/language-server-protocol/) (LSP). The LSP aims to reduce integration efforts when designing a language by providing an interface that all IDEs can use to provide editing support. This allows Langium based languages to easily interact with common IDEs and editors with LSP support, including Visual Studio Code, Eclipse, IntelliJ and many more.

The LSP includes commonly used language features, such as code completion, custom validations/diagnostics, finding references, formatting and many more. This allows for deep IDE integration without binding your language to a single IDE. Langium offers out-of-the-box support for most of these language features, with additional extension points for your domain specific requirements.

## Try it out!

You can try out most of these features using our [showcases](https://langium.org/showcase/). The languages shown there are written using Langium and integrated in the monaco-editor.

If you're interested in Langium, you can check out our [getting started](/docs/getting-started) page next. There you'll learn how to get started writing your first language, and to learn more about how Langium can help you achieve your language designing goals.
