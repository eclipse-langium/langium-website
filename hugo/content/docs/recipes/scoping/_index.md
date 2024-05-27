---
title: "Scoping"
weight: 100
---

You likely know scopes from programming, where some variables are only available from certain areas (such as blocks) in your program. For example, take the short Typescript snippet below. Based on the block (scope) where a variable is declared, it may or may not be available at another location in the same program.

```ts
let x = 42;
x = 3; // References the `x` defined in the previous line

if (condition) {
    let y = 42;
}
y = 3; // Cannot link, `y` isn't in any of the available scopes
```

This kind of behavior is called lexical scoping. Although this default scoping implementation is suitable for prototyping -- and for some simple languages once finished -- this behavior can be easily modified to fit the needs of your language's domain.

In general, the way we resolve references is split into three phases of the document lifecycle:

- [Symbol indexing](/docs/reference/document-lifecycle#symbol-indexing) is responsible for making objects globally available for referencing.
- [Scope computation](/docs/reference/document-lifecycle#computing-scopes) determines which elements are reachable from a given position in your document.
- Finally, the [linking phase](/docs/reference/document-lifecycle#linking) eagerly links each reference within a document to its target using your language's scoping rules.

In this guide, we'll look at different scoping kinds and styles and see how we can achieve them using Langium:

1. [Qualified Name Scoping](./qualified-name)
2. [Class Member Scoping](./class-member)

Note that these are just example implementations for commonly used scoping methods.
The scoping API of Langium is designed to be flexible and extensible for any kind of use case.
