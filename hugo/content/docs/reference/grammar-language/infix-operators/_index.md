---
title: "Infix Operators"
weight: 125
---

Infix operators are binary operators - they require two operands and an operator in between them. For example, in the expression `a + b`, `+` is an infix operator with operands `a` and `b`.

## Grammar Ambiguities

With infix operator we are confronted with grammar ambiguities.

Ambiguities are a problem for the parsing process, because the parser needs to be able to determine the structure of an expression unambiguously.

For example, consider these expressions:

```plain
a + b * c
a - b - c
```

### Ambiguity between different operators

Without additional rules, the first expression can be interpreted in two different ways:

1. As `(a + b) * c`, where addition is performed first, followed by multiplication.
2. As `a + (b * c)`, where multiplication is performed first, followed by addition.

Solution: The parser needs to know the **precedence** of the operators. In this case, multiplication has higher precedence than addition, so the correct interpretation is `a + (b * c)`. A precedence of an operator is higher, lower or equal to another operator's precedence.

### Ambiguity between same operators

The second expression can also be interpreted in two different ways:

1. As `(a - b) - c`, where the first subtraction is performed first.
2. As `a - (b - c)`, where the second subtraction is performed first.

Solution: The parser needs to know the **associativity** of the operator. In this case, subtraction is left-associative, so the correct interpretation is `(a - b) - c`. An operator can be left-associative, right-associative or non-associative. A way to remember what is what:
Imagine a operand between two same operators (like `... - b - ...`), which operator is executed first? If the left one is executed first, the operator is left-associative. If the right one is executed first, the operator is right-associative. If neither can be executed first (like in `a < b < c`), the operator is non-associative.

Operator candidates for right-associativity are usually assignment operators (e.g., `=`) and exponentiation operators (e.g., `^`).

## Implementation

In order to embed precedence and associativity rules into the parsing process, we can use a technique called **precedence climbing** (also known as operator-precedence parsing). Precedence climbing is a recursive parsing technique that allows us to handle infix operators with different precedences and associativities in a straightforward manner.

Independent of the used parser generator or language framework, this technique can be often implemented using grammar rules. In Langium, you have two options to implement precedence climbing:

* using [non-terminal rules](/docs/recipes/infix-operators/manual-implementation)
* using the [infix syntax](/docs/recipes/infix-operators/syntactical-implementation)
