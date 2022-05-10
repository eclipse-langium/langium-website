---
title: "AST Type Inference"
weight: 200
---

When a grammar increases in complexity, it is common to want control over the types of the generated AST nodes. Langium allows for the definition of types directly into the language grammar.

Langium implements the following categories of types:
* *Inferred types*: types that are inferred from the grammar.
* *Declared types*: types that are explicitly defined in the grammar.
* *Unassigned rule calls*: aka *Dummy Rules*, rules that are not reachable from the entry rule and generate *type aliases* in the AST.


## Inferred Types
*Inferred Types* are the default behavior in Langium. The simplest way to write a parser rule is as follows:
```
X: name=ID;
```
With this syntax, Langium will **infer** the type of the AST node to be generated when parsing the rule. By convention, the type of the AST node will be named after the name of the rule, resulting in this **TypeScript's interface** in the AST:
```
export interface X extends AstNode {
    name: string
}
```
It is however possible to control the naming of the interface by using the following syntax:
```
X infers MyType: name=ID;
```
resulting in the following interface in the AST:
```
export interface MyType extends AstNode {
    name: string
}
```
Please note that `interface X` is no longer present in the AST.

By inferring types within the grammar, it is also possible to define several parser rules creating the same AST node type. For example, the following grammar has two rules `X` and `Y` inferring a single AST node type `MyType`:
```
X infers MyType: name=ID;
Y infers MyType: name=ID count=INT;
```
This result in the creation of a single interface in the AST 'merging' the two parser rules with non-common properties made optional:
```
export interface MyType extends AstNode {
    count?: number
    name: string
}
```

## Declared Types
To gain full control over the properties of the generated interfaces, you can explicitly declare an interface directly in the grammar. Let's declare MyType from the previous section directly in the language grammar:
```
interface MyType {
    name: string
    count?: number
}
```
The parser rules creating the AST node type `MyType` will also need to explicitely declare the type of the AST node they create with the `returns` keyword:
```
X returns MyType: name=ID;
Y returns MyType: name=ID count=INT;
```
Using `returns` without explicitly declaring the type of the AST node is not allowed and results in a validation error.

A declared type can also extend another type:
```
interface A {
    name: string
}

interface B extends A {
    count: number
}

Y returns B: name=ID count=INT;
```

## Unassigned Rule Calls
Unassigned rule calls result in a type alias in the AST, giving a name to a *union type*:
```
Dummy: X | Y;

X: 'X' name=ID;
Y: 'Y' name=ID;
```
resulting in the following AST:
```
export type Dummy = X | Y;

export interface X extends AstNode {
    name: string
}

export interface Y extends AstNode {
    name: string
}
```
In this example, the type alias `Dummy` is a *union type* that can be either `X` or `Y` and is *inferred* from the grammar.

A type alias can also be explicitly defined in the grammar:
```
type Dummy = X | Y;

X: 'X' name=ID;
Y: 'Y' name=ID;
```
resulting in the same AST as above.

Parser rules are not allowed to return alias types. The following syntax is invalid:
```
type Dummy = X | Y;
X: 'X' name=ID;
Y: 'Y' name=ID;

Z returns Dummy: name=ID;
```

## Data Type Rules
Data type rules generate a type alias in the AST:
```
QualifiedName returns string: ID ('.' ID)*;

// results in:
type QualifiedName = string;
```

## Controlling the AST with Actions
The AST node types can also be controlled through [actions](../grammar-language/#simple-actions). Actions can be used to improve the readability of more complex grammar.

```
X returns X: 'X' name=ID | {Y} 'Y' name=ID;
```
In this case, the parser rule `X` generate an AST node of type X if the keyword 'X' is consumed and of type 'Y' is the keyword 'Y' is consumed. Both types A and B must be explicitly declared in the grammar.

It is also possible for an action to infer the type of the AST node by using the keyword `infer` inside of the action:

```
A returns A: 'A' name=ID | {infer B} 'B' name=ID;
```

Actions can also be used to guide the structure of an AST node as described [here](../grammar-language/#tree-rewriting-actions). 

//TODO: Add example from the arithmetic grammar with {infer BinaryExpression.left=current} and more complex examples of actions with expected types.
