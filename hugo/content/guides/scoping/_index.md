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
However, this behavior can be easily modified to your domain needs, which is required for most languages. In general, resolving references is split into three distinct phases.

## Pre-processing

Right after parsing a document, Langium starts a scope pre-processing phase. Before we are able to create references from one element of our language to another, we first have to define which elements are exposed to be referenced and under what name.

This is the job of the `ScopeComputation` interface. It returns a map that points for each element of a given document to a list of node descriptions which are contained within that element.

```ts
namespace MyNamespace {
    function A();
    function B();
    function C();
}
```

Let's take the code snippet above as an example: The scope computation takes the `MyNamespace` element, creates descriptions (i.e. pointers to a node) for all child elements - functions A, B and C - and associates the `MyNamespace` element with its child descriptions.

## Linking

## Scoping