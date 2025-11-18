---
title: "Using the infix syntax"
weight: 200
---

## Operator table

Let's implement a simple expression grammar with the following operators:

| Operator | Precedence | Associativity |
|----------|------------|---------------|
| `+`      | 1          | Left          |
| `-`      | 1          | Left          |
| `*`      | 2          | Left          |
| `/`      | 2          | Left          |
| `^`      | 3          | Right         |

## Grammar rules

```langium
Expression: BinaryExpr;

infix BinaryExpr on PrimaryExpression:
    right assoc '^'
    > '*' | '/'
    > '+' | '-'
    ;

PrimaryExpression: '(' expr=Expression ')' | value=Number;
```

In addition to better readability, the new notation also makes use of **performance optimizations** to speed up expression parsing by roughly 50% compared to the typical way of writing expressions.

### Primary expression

The `PrimaryExpression` rule defines the basic building blocks of our expressions, which can be (for example) a parenthesized expression, an unary expression, or a number literal.

```langium
Expression: BinaryExpr;

infix BinaryExpr on PrimaryExpression:
    ...
    ;

PrimaryExpression: '(' expr=Expression ')' | '-' value=PrimaryExpression | value=Number | ...;
```

### Precedence

Use the `>` operator to define precedence levels. Operators listed after a `>` have lower precedence than those before it. In the example above, `^` has the highest precedence, followed by `*` and `/`, and finally `+` and `-` with the lowest precedence.

```langium
infix BinaryExpr on ...:
    A > B > C
    //A has higher precedence than B, B higher than C
    ;
```

If you have multiple operators with the same precedence, list them on the same line separated by `|`.

### Associativity

The default associativity for infix operators is left associative. To specify right associativity, use the `assoc` keyword preceded by `right` before the operator.

```langium
infix BinaryExpr on ...:
    ...> right assoc '^' >...
    ;
```
