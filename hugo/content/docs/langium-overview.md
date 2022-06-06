---
title: "Langium Overview"
weight: 50
---

In this chapter you'll get a closer look at the tasks that Langium aims to simplify when creating a custom domain specific language.
As a fully featured language engineering framework, Langium supports you from parsing a string into a semantic representation of your model up until your interpreter or code generator.

To get from the first to the last step, you would have to solve a whole lot of other challenges, such as coding your semantic model, building a workspace management system, designing a linking system and providing editor support. With that in mind, Langium provides out-of-the-box solutions for these problems, with the ability to fine-tune every part of it to fit your domain requirements.

## Language Parsing

Virtually all programming languages and most domain specific languages (DSL) are context-free (link). While regular languages can be parsed using regular expressions, context-free languages allow for a higher degree of freedom, i.e. they are more powerful than regular languages. In turn, parsing context-free languages requires a more sophisticated parser.

To define a custom language, users of Langium interact with a high level presentation of their context-free grammar using the Langium grammar language (link to documentation), in a similar fashion to EBNF. In addition to defining the syntax of your language, it allows you to embed semantic information about your model.

## Semantic Models

As a consequence of defining your grammar in this way, we can not only parse your language, but also generate a semantic model as TypeScript interfaces, which automatically match the parsed abstract syntax tree. The following language snippet:

```ts
Person: 
    'person' // keyword 
    name=ID // semantic assignment
; 
```

Parses a simple object `{ name: 'John' }`. To interact with this object in a type safe manner, the `langium-cli` tool generates TypeScript type definitions from it. The `Person` parser rules generates the following interface:

```ts
interface Person {
    name: String
}
```

These interfaces allow you to traverse your abstract syntax tree safely. In case your grammar changes, they will also notify you of any breaking changes which might require you to change your domain logic.

## Cross References and Linking

You can reference another element of your DSL using the grammar cross reference feature:

```ts
Hello: 'hello' person=[Person];
```

This `Hello` rule references another `Person` element. By default, the `name` property of an object is used as its identity. Consequently, a `person John` object will be referenced using the `hello John` snippet. Any other name will result in a linking error.

Cross references and linking is accomplished using the concept of 'scoping'. You likely know scopes from programming, where certain variables are only available from certain scopes:

```ts
let x = 42;
x = 3; // References the `x` defined in the previous line
```

```ts
if (something) {
    let x = 42;
}
x = 3; // Cannot link, `x` isn't in a visible scope
```

The same occurs in Langium. To enable more complex scoping behavior, you can create a custom domain scoping. For example, common object oriented languages need a more involved scoping mechanism to resolve references to fields and methods of a class:

```ts
class X {
    y(): void { ... }
}

const instance = new X(); // Symbol `X` is in the local scope
instance.y(); // Symbol `y` exists in the scope of the `X` class
```

Aside from those domain specific scoping rules, parsing and resolving cross references is handled completely automatically by Langium.

## Workspace Management

Like with normal programming, domain logic written in your DSL will be split across multiple files to facilitate ease of use and maintenance efforts. This is also possible using Langium, which performs workspace management for you.

When running a Langium based language in a [language server](), all files matching your DSL id will automatically be picked up and processed. In addition, any changes to these files will be processed as well.

The workspace management also keeps track of the global scope. This allows users of your DSL to reference elements across files within the same workspace.

## Editing Support

Langium does not only provide support for dealing with your language in isolation. The framework is deeply integrated with the [language server protocol]() (LSP). This allows Langium based languages to easily interact with common IDEs and editors with LSP support, including Visual Studio Code, Eclipse, IntelliJ and many more.

The LSP includes commonly used language features, allowing for deep IDE integration without binding your language to a single IDE. Langium offers out-of-the-box support for most of these language features, with additional extension points for your domain specific requirements. This includes code completion, custom validations/diagnostics, finding references, formatting and more.
