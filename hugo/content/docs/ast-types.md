---
title: "AST Type Inference"
weight: 200
---

When AST nodes are created during the parsing of a document, they are given a type. The language grammar dictates the shape of those types and how they might be related to each other. There are two ways by which Langium derives AST types from the grammar, by **[inference](#inferred-types)** and by **[declaration](#declared-types)**.

*Inference* is the default behavior in Langium. During the generation of the AST types, Langium infers the possible types directly from the grammar rules. While this a powerful approach for simple languages and prototypes, it is not recommended for more mature languages since minimal changes in the grammar can easily lead to breaking changes.

To minimize the chance of breaking changes, Langium introduces *declared types* where the AST types are explicitly defined by the user in the grammar via a *TypeScript-like* syntax.

In the following, we detail how grammar rules shape the AST via inference and declaration.

## Inferred Types
*Inferred types* result from letting Langium infer the types of AST nodes from the grammar rules. Let's have a look at how various rules shape the AST:

### Parser Rules
The simplest way to write a parser rule is as follows:
```
X: name=ID;
```
With this syntax, Langium will **infer** the type of the AST node to be generated when parsing the rule. By convention, the type of the AST node will be named after the name of the rule, resulting in this **TypeScript's interface** in the AST:
```
interface X extends AstNode {
    name: string
}
```
It is however possible to control the naming of the interface by using the following syntax:
```
X infers MyType: name=ID;
```
resulting in the following interface in the AST:
```
interface MyType extends AstNode {
    name: string
}
```
Please note that an `interface X` is no longer present in the AST.

It is important to understand that the name of the parser rule and the name of the type it infers work on two separate abstraction levels. The name of the parser rule is used at the *parsing level* where types are ignored and only the parsing rule is considered, while the name of the type is used at the *types level* where both the type and the parser rule play a role. This means that the name of the type can be changed without affecting the parsing rules hierarchy, and that the name of the rule can be changed - if it explicitly infers or returns a given type - without affecting the AST.

By inferring types within the grammar, it is also possible to define several parser rules creating the same AST node type. For example, the following grammar has two rules `X` and `Y` inferring a single AST node type `MyType`:
```
X infers MyType: name=ID;
Y infers MyType: name=ID count=INT;
```
This result in the creation of a single interface in the AST 'merging' the two parser rules with non-common properties made optional:
```
interface MyType extends AstNode {
    count?: number
    name: string
}
```

### Terminal Rules
Terminal rules are linked to built-in types in the AST. They do not result in AST types on their own but determine the type of properties in AST types inferred from parser rule:
```
terminal INT returns number: /[0-9]+/;
terminal ID returns string: /[a-zA-Z_][a-zA-Z0-9_]*/;

X: name=ID count=INT;

// generates:
interface X extends AstNode {
    name: string
    count: number
}
```
The property `name` is of type `string` because the terminal rule `ID` is linked to the built-in type `string`, and the property `count` is of type `number` because the terminal rule `INT` is linked to the built-in type `number`.

### Data type rules
Data type rules are similar to terminal rules in the sense that they determine the type of properties in AST types inferred from a parser rules. However, they lead to the creation of type aliases for built-in types in the AST:
```
QualifiedName returns string: ID '.' ID;

X: name=QualifiedName;

// generates:
type QualifiedName = string;

interface X extends AstNode {
    name: string
}
```

### Assignments
There are three available kinds of [assignments](../grammar-language/#assignments) in a parser rule:

1. `=` for assigning a **single value** to a property, resulting in the property's type to be derived from the right side of the assignment.
2. `+=` for assigning **multiple values** to a property, resulting in the property's type to be an array of the right side of the assignment.
3. `?=` for assigning a **boolean** to a property, resulting in the property's type to be a `boolean`.

```
X: name=ID numbers+=INT (numbers+=INT)* isValid?='valid'?;

// generates:
interface X extends AstNode {
    name: string
    numbers: Array<number>
    isValid: boolean
}
```

The right side of an assignment can be any of the following:
* A terminal rule or a data type rule, which results in the type of the property to be a built-in type.
* A parser rule, which results is the type of the property to be the type of the parser rule.
* A cross-reference, which results in the type of the property to be a *Reference* to the type of the cross-reference.
* An alternative of all the above, which results in the type of the property to be a type union of all the types in the alternative.

```
X: 'x' name=ID;

Y: crossValue=[X:ID] alt=(INT | X | [X:ID]);

// generates:
interface X extends AstNode {
    name: string
}

interface Y extends AstNode {
    crossValue: Reference<X>
    alt: number | X | Reference<X>
}
```

### Unassigned Rule Calls
A parser rule does not necessarily need to have assignment, but can also only contain *unassigned rule calls*. These kind of rules can be used to change the types' hierarchy.
```
X: A | B;

A: 'A' name=ID;
B: 'B' name=ID count=INT;

// generates:
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
Actions can be used to infer the type of the AST node **inside** of a parser rule. This can be viewed as *syntactic sugar* and can increase readability of the grammar.
```
X: 
    {infer A} 'A' name=ID 
  | {infer B} 'B' name=ID count=INT;

// is equivalent to:
X: A | B;
A: 'A' name=ID;
B: 'B' name=ID count=INT;

// generates:
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
Actions can also be used to control the structure of AST node types. This is a more advanced topic, and we recommend getting familiar with the rest of the documentation before diving into this section.

Let's consider two different grammars derived from the [Arithmetics example](https://github.com/langium/langium/blob/main/examples/arithmetics/src/language-server/arithmetics.langium). These grammars are designed to parse a document containing a single definition comprised of a name and an expression assignment, with an expression being an indefinite length of additions or a numerical value.

The first one does not use assigned actions:
```
Definition: 
    'def' name=ID ':' expr=Expression;

Expression:
    '(' Addition ')' | value=NUMBER;

Addition infers Expression:
    left=Expression ('+' right=Expression)*;
```
When parsing a document containing `def x: (1 + 2) + 3`, this is the shape of the AST:
{{<mermaid>}}
graph TD;
expr((expr)) --> left((left))
expr --> right((right))
left --> left_left((left))
left --> left_right((right))
right --> right_right((right))
left_left --> left_left_v{1}
left_right --> left_right_{2}
right_right --> right_right_v{3}
{{</mermaid>}}
We can see that the nested `right -> right` property in the tree is counter-intuitive and we would like to remove one level of nesting from the tree. 

This can be done by reworking the grammar and adding an assigned action:
```
Definition: 
    'def' name=ID ':' expr=Addition ';';

Expression:
    '(' Addition ')' | value=NUMBER;

Addition infers Expression:
    Expression ({infer Addition.left=current} '+' right=Expression)*;
```
Parsing the same document now leads to this AST:
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

## Declared Types
Because type inference takes into account every entity of a parser rule, even the smallest changes can update the inferred types. This can lead to an unexpected type system and incorrect behavior of services that depend on it. To minimize the risk of introducing breaking changes when modifying the grammar, we recommend to use *declared types*. This is especially true for more mature and complex languages where a stable type system is key and breaking changes introduced by inferred types can be hard to detect. Declared types allow the user to **fix** the type of the parser rules and rely on the power of validation errors to detect breaking changes.

Let's look at the example from the previous section:
```
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
We now explicitly declare `MyType` directly in the grammar with the keyword `interface`. The parser rules `X` and `Y` creating AST nodes of type `MyType` need to explicitly declare the type of the AST node they create with the keyword `returns`.

Contrary to [inferred types](#inferred-types), all properties must be explicitly declared in order to be valid inside of a parser rule. The following syntax:
```
Z returns MyType: name=ID age=INT;
```
will throw the following validation error `A property 'age' is not expected` because the declaration of `MyType` does not include the property `age`. In short, *declared types* add a layer of safety via validation to the grammar that prevents mismatches between the generated AST types and what the user expects.

A declared type can also extend another declared type:
```
interface MyType {
    name: string
}

interface MyOtherType extends MyType {
    count: number
}

Y returns MyOtherType: name=ID count=INT;
```

Explicitly declaring type aliases in the grammar is achieved with the keyword `type`:
```
type X = A | B;

// generates:
type X = A | B;
```

Please note that it is not allowed to use an alias type as a return type in a parser rule. The following syntax is invalid:
```
type X = A | B;

Y returns X: name=ID;
```

Using `returns` without explicitly declaring the type of the AST node is not allowed and results in a validation error.

### Cross-references, Arrays, and Alternatives
Declared types come with special syntax to declare cross-references, arrays, and alternatives:
```
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
```
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
Note the absence of the keyword `infer`, contrary to [actions inferring types](#simple-actions).

## Refactoring Dummy Rules
*Dummy rules* are parser rules that are not reachable from the entry rule of the grammar. Despite the fact that they do not participate in the parsing process, they still influence the shape of the AST. They infer types in the same fashion as any other parser rule with type inference. However, because dummy rules are exempt from validation checks they are prone to introduce breaking changes. For this reason, we strongly advise using declared types instead of dummy rules.

Let's look at two dummy rules:
```
X : A | B;

Y: name=ID;
```
The first one is inferring a type alias, and the second one an interface. They are similar to parser rules explained in the [previous section](#inferred-types) but they are not reachable from the entry rule of the grammar. They should be replaced with **declared types** as follows:
```
type X = A | B;

interface Y {
    name: string
}
```
This way, a layer of safety is introduced and the risk of breaking changes is greatly reduced.
