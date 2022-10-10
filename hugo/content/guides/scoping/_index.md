---
title: "Scoping"
weight: 100
---

The process of scoping determines which elements can be referenced at a certain position of a document. You likely know scopes from programming, where some variables are only available from certain scopes:

```ts
let x = 42;
x = 3; // References the `x` defined in the previous line

if (something) {
    let y = 42;
}
y = 3; // Cannot link, `y` isn't in any of the available scopes
```

By default, Langium creates a simplistic, purely block based scoping for your language as shown above. You can use it to reference all elements that are either declared in the current block or in one of its parents.
However, this behavior can be easily modified to your domain needs, which is required for most languages.

In general, the reference resolving mechanism is split into three distinct phases of the document lifecycle. [Symbol indexing](/docs/document-lifecycle#symbol-indexing) is responsible for making referencable objects globally available. [Scope computation](/docs/document-lifecycle#computing-scopes) determines which elements are reachable at a certain position in a document. Finally, the [linking phase](/docs/document-lifecycle#linking) eagerly links each reference within a document to its target using scoping rules.

In the following, we will look at different scoping kinds and styles and see how we can achieve them using Langium:

1. [Qualified Name Scoping](./qualified-name)
2. [Class Member Scoping](./class-member)
