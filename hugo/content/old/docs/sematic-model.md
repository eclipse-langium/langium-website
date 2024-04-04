---
title: "Semantic Model Inference"
weight: 200
---

When AST nodes are created during the parsing of a document, they are given a type. The language grammar dictates the shape of those types and how they might be related to each other. All types form the *semantic model* of your language. There are two ways by which Langium derives semantic model types from the grammar, by **[inference](#inferred-types)** and by **[declaration](#declared-types)**.

*Inference* is the default behavior in Langium. During the generation of the semantic model types, Langium infers the possible types directly from the grammar rules. While this is a powerful approach for simple languages and prototypes, it is not recommended for more mature languages since minimal changes in the grammar can easily lead to breaking changes.

To minimize the chance of breaking changes, Langium introduces *declared types* where the semantic model types are explicitly defined by the user in the grammar via a *TypeScript-like* syntax.

In the following, we detail how grammar rules shape the semantic model via inference and declaration.

## Inferred Types
*Inferred types* result from letting Langium infer the types of the nodes from the grammar rules. Let's have a look at how various rules shape these type definitions:

### Parser Rules
The simplest way to write a parser rule is as follows:
```langium
X: name=ID;
```
With this syntax, Langium will **infer** the type of the node to be generated when parsing the rule. By convention, the type of the node will be named after the name of the rule, resulting in this **TypeScript interface** in the semantic model:
```langium
interface X extends AstNode {
    name: string
}
```
It is also possible to control the naming of the interface by using the following syntax:
```langium
X infers MyType: name=ID;
```
resulting in the following interface in the semantic model:
```langium
interface MyType extends AstNode {
    name: string
}
```
Please note that an `interface X` is no longer present in the semantic model.

It is important to understand that the name of the parser rule and the name of the type it infers work on two separate abstraction levels. The name of the parser rule is used at the *parsing level* where types are ignored and only the parsing rule is considered, while the name of the type is used at the *types level* where both the type and the parser rule play a role. This means that the name of the type can be changed without affecting the parsing rules hierarchy, and that the name of the rule can be changed - if it explicitly infers or returns a given type - without affecting the semantic model.

By inferring types within the grammar, it is also possible to define several parser rules creating the same semantic model type. For example, the following grammar has two rules `X` and `Y` inferring a single semantic model type `MyType`:
```langium
X infers MyType: name=ID;
Y infers MyType: name=ID count=INT;
```
This result in the creation of a single interface in the semantic model 'merging' the two parser rules with non-common properties made optional:
```langium
interface MyType extends AstNode {
    count?: number
    name: string
}
```

### Terminal Rules
Terminal rules are linked to built-in types in the semantic model. They do not result in semantic model types on their own but determine the type of properties in semantic model types inferred from a parser rule:
```langium
terminal INT returns number: /[0-9]+/;
terminal ID returns string: /[a-zA-Z_][a-zA-Z0-9_]*/;

X: name=ID count=INT;
```

```langium
// generated interface
interface X extends AstNode {
    name: string
    count: number
}
```

The property `name` is of type `string` because the terminal rule `ID` is linked to the built-in type `string`, and the property `count` is of type `number` because the terminal rule `INT` is linked to the built-in type `number`.

### Data type rules
Data type rules are similar to terminal rules in the sense that they determine the type of properties in semantic model types inferred from parser rules. However, they lead to the creation of type aliases for built-in types in the semantic model:
```langium
QualifiedName returns string: ID '.' ID;

X: name=QualifiedName;
```

```langium
// generated types
type QualifiedName = string;

interface X extends AstNode {
    name: string
}
```

### Assignments
There are three available kinds of [assignments](../grammar-language/#assignments) in a parser rule:

1. `=` for assigning a **single value** to a property, resulting in the property's type to be derived from the right hand side of the assignment.
2. `+=` for assigning **multiple values** to a property, resulting in the property's type to be an array of the right hand side of the assignment.
3. `?=` for assigning a **boolean** to a property, resulting in the property's type to be a `boolean`.

```langium
X: name=ID numbers+=INT (numbers+=INT)* isValid?='valid'?;
```

```langium
// generated interface
interface X extends AstNode {
    name: string
    numbers: Array<number>
    isValid: boolean
}
```

The right-hand side of an assignment can be any of the following:
* A terminal rule or a data type rule, which results in the type of the property to be a built-in type.
* A parser rule, which results in the type of the property to be the type of the parser rule.
* A cross-reference, which results in the type of the property to be a *Reference* to the type of the cross-reference.
* An alternative, which results in the type of the property to be a type union of all the types in the alternative.

```langium
X: 'x' name=ID;

Y: crossValue=[X:ID] alt=(INT | X | [X:ID]);
```

```langium
// generated types
interface X extends AstNode {
    name: string
}

interface Y extends AstNode {
    crossValue: Reference<X>
    alt: number | X | Reference<X>
}
```

### Unassigned Rule Calls

A parser rule does not necessarily need to have assignments. It may also contain only *unassigned rule calls*. These kind of rules can be used to change the types' hierarchy.

```langium
X: A | B;

A: 'A' name=ID;
B: 'B' name=ID count=INT;
```

```langium
// generated types
type X = A | B;

interface A extends AstNode {
    name: string
}

interface B extends AstNode {
    name: string
    count: number
}
```

### Simple Actions

Actions can be used to change the type of a node **inside** of a parser rule to another semantic model type. For example, they allow you to simplify parser rules which would have to be split into multiple rules.

```langium
X: 
    {infer A} 'A' name=ID 
  | {infer B} 'B' name=ID count=INT;

// is equivalent to:
X: A | B;
A: 'A' name=ID;
B: 'B' name=ID count=INT;
```

```langium
// generated types
type X = A | B;

interface A extends AstNode {
    name: string
}

interface B extends AstNode {
    name: string
    count: number
}
```

### Assigned actions

Actions can also be used to control the structure of the semantic model types. This is a more advanced topic, so we recommend getting familiar with the rest of the documentation before diving into this section.

Let's consider two different grammars derived from the [Arithmetics example](https://github.com/eclipse-langium/langium/blob/main/examples/arithmetics/src/language-server/arithmetics.langium). These grammars are designed to parse a document containing a single definition comprised of a name and an expression assignment, with an expression being any amount of additions or a numerical value.

The first one does not use assigned actions:

```langium
Definition: 
    'def' name=ID ':' expr=Expression;
Expression:
    Addition;
Addition infers Expression:
    left=Value ('+' right=Expression)?;
    
Primary infers Expression:
    '(' Expression ')' | {Literal} value=NUMBER;
```

When parsing a document containing `def x: (1 + 2) + 3`, this is the shape of the semantic model node:

{{<mermaid>}}
graph TD;
expr((expr)) --> left((left))
expr --> right((right))
left --> left_left((left))
left --> left_right((right))
right --> right_left((left))
left_left --> left_left_v{1}
left_right --> left_right_{2}
right_left --> right_left_v{3}
{{</mermaid>}}

We can see that the nested `right -> left` nodes in the tree are unnecessary and we would like to remove one level of nesting from the tree. 

This can be done by refactoring the grammar and adding an assigned action:

```langium
Definition: 
    'def' name=ID ':' expr=Addition ';';
Expression:
    Addition;
Addition infers Expression:
    Primary ({infer Addition.left=current} '+' right=Primary)*;
    
Primary infers Expression:
    '(' Expression ')' | {Literal} value=NUMBER;
```

Parsing the same document now leads to this semantic model:

{{<mermaid>}}
graph TD;
expr((expr)) --> left((left))
expr --> right((right))
left --> left_left((left))
left --> left_right((right))
right --> right_v{3}
left_left --> left_left_v{1}
left_right --> left_right_{2}
{{</mermaid>}}

While this is a fairly trivial example, adding more layers of expression types in your grammar massively degrades the quality of your syntax tree as each layer will add another empty `right` property to the tree. Assigned actions alleviate this issue completely.

## Declared Types

Because type inference takes into account every entity of a parser rule, even the smallest changes can update your inferred types. This can lead to unwanted changes in your semantic model and incorrect behavior of services that depend on it. *Declared types* are a means to minimize the risk of introducing breaking changes when modifying the grammar.

In most cases, especially for early language designs, letting the type inference take care of generating your types will be your best choice. As your language starts to mature, it may then be of interest to fix parts of your semantic model using declared types.

With that aside, declared types can be *especially* helpful for more mature and complex languages, where a stable semantic model is key and breaking changes introduced by inferred types can break your language services. Declared types allow the user to **fix** the type of their parser rules and rely on the power of validation errors to detect breaking changes.



Let's look at the example from the previous section:

```langium
X infers MyType: name=ID;
Y infers MyType: name=ID count=INT;

// should be replaced by:
interface MyType {
    name: string
    count?: number
}

X returns MyType: name=ID;
Y returns MyType: name=ID count=INT;
```

We now explicitly declare `MyType` directly in the grammar with the keyword `interface`. The parser rules `X` and `Y` creating nodes of type `MyType` need to explicitly declare the type of the node they create with the keyword `returns`.

Contrary to [inferred types](#inferred-types), all properties must be explicitly declared in order to be valid inside of a parser rule. The following syntax:

```langium
Z returns MyType: name=ID age=INT;
```

will show the following validation error `A property 'age' is not expected` because the declaration of `MyType` does not include the property `age`. In short, *declared types* add a layer of safety via validation to the grammar that prevents mismatches between the expected semantic model types and the shape of the parsed nodes.

A declared type can also extend types, such as other declared types or types inferred from parser rules:

```langium
interface MyType {
    name: string
}

interface MyOtherType extends MyType {
    count: number
}

Y returns MyOtherType: name=ID count=INT;
```

Explicitly declaring union types in the grammar is achieved with the keyword `type`:

```langium
type X = A | B;
```

```langium
// generates:
type X = A | B;
```

<!-- Please note that it is not allowed to use an alias type as a return type in a parser rule. The following syntax is invalid:
```
type X = A | B;

Y returns X: name=ID;
``` -->

Using `returns` always expects a reference to an already existing type. To create a new type for your rule, use the `infers` keyword or explicitly declare an interface.

### Cross-references, Arrays, and Alternatives

Declared types come with special syntax to declare cross-references, arrays, and alternatives:

```langium
interface A {
    reference: @B
    array: B[]
    alternative: B | C
}

interface B {
    name: string
}

interface C {
    name: string
    count: number
}

X returns A: reference=[B:ID] array+=Y (array+=Y)* alternative=(Y | Z);

Y returns B: 'Y' name=ID;

Z returns C: 'Z' name=ID count=INT;
```

### Actions

Actions referring to a declared type have the following syntax:

```langium
interface A {
    name: string
}

interface B {
    name: string
    count: number
}

X: 
    {A} 'A' name=ID 
  | {B} 'B' name=ID count=INT;
```

Note the absence of the keyword `infer` compared to [actions which infer a type](#simple-actions).

## Reference Unions

Trying to reference different types of elements can be an error prone process. Take a look at the following rule which tries to reference either a `Function` or a `Variable`:

```langium
MemberCall: (element=[Function:ID] | element=[Variable:ID]);
```

As both alternatives are only an `ID` from a parser perspective, this grammar is not decidable and the `langium` CLI script will throw an error during generation. Luckily, we can improve on this by adding a layer of indirection using an additional parser rule:

```langium
NamedElement: Function | Variable;

MemberCall: element=[NamedElement:ID];
```

This allows us to reference either `Function` or `Variable` using the common rule `NamedElement`. However, we have now introduced a rule which is never actually parsed, but only exists for the purpose of the type system to pick up on the correct target types of the reference. Using declared types, we are able to refactor this unused rule, making our grammar more resilient in the process:

```langium
// Note the `type` prefix here
type NamedElement = Function | Variable;

MemberCall: element=[NamedElement:ID];
```

We can also use interfaces in place of union types with similar results:

```langium
interface NamedElement {
    name: string
}

// Infers an interface `Function` that extends `NamedElement`
Function returns NamedElement: {infer Function} "function" name=ID ...;

// This also picks up on the `Function` elements
MemberCall: element=[NamedElement:ID];
```
