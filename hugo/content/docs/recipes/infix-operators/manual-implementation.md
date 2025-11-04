---
title: "Using non-terminal rules"
weight: 100
---

Infix operators can also be implemented using non-terminal rules. This approach provides more flexibility and allows for better handling of operator precedence and associativity.

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
Expression:
    Addition;

Addition infers Expression:
    Multiplication ({infer BinaryExpression.left=current} operator=('+' | '-') right=Multiplication)*;

Multiplication infers Expression:
    Exponentiation ({infer BinaryExpression.left=current} operator=('*' | '/') right=Exponentiation)*;

Exponentiation infers Expression:
    Primary ({infer BinaryExpression.left=current} operator='^' right=Exponentiation)?;

Primary infers Expression:
    '(' Expression ')'
    | ... //prefix, literals, identifiers
    ;
```

## Explanation

### Precedence

Precedence is handled by creating a hierarchy of non-terminal rules. Each rule corresponds to a level of precedence, with higher-precedence operators being defined in rules that are called by lower-precedence rules. For example, `Addition` calls `Multiplication`, which in turn calls `Exponentiation`. This ensures that multiplication and division are evaluated before addition and subtraction, and exponentiation is evaluated before both.

### Associativity

Associativity is handled by three patterns. They make sure that operators are grouped correctly based on their associativity.

Pattern 1 (Left Associative):

```langium
Current infers Expression:
    Next ({infer BinaryExpression.left=current} operator=('op1' | 'op2' | ...) right=Next)*;
```

Pattern 2 (Right Associative):

```langium
Current infers Expression:
    Next ({infer BinaryExpression.left=current} operator=('op1'| 'op2' | ...) right=Current)?;
```

Pattern 3 (Non-Associative):

```langium
Current infers Expression:
    Next ({infer BinaryExpression.left=current} operator=('op1' | 'op2' | ...) right=Next)?;
```
