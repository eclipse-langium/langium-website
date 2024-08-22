---
title: Indentation-sensitive languages
weight: 300
---

Some programming languages (such as Python, Haskell, and YAML) use indentation to denote nesting, as opposed to special non-whitespace tokens (such as `{` and `}` in C++/JavaScript).
This can be difficult to express in the EBNF notation used for defining a language grammar in Langium, which is context-free.
To achieve that, you can make use of synthetic tokens in the grammar which you would then redefine using Chevrotain in a custom token builder.

Starting with Langium v3.2, such token builder (and an accompanying lexer) are provided for easy plugging into your language.
They work by modifying the underlying Chevrotain token generated for your indentation terminal tokens to use a custom matcher function instead that has access to more context than simple Regular Expressions, allowing it to store state and detect _changes_ in indentation levels. This is why you should provide it with the names of the tokens you used to denote indentation: so it can override the correct tokens for your grammar.

## Configuring the token builder and lexer

To be able to use the indendation tokens in your grammar, you first have to import and register the [`IndentationAwareTokenBuilder`](https://github.com/eclipse-langium/langium/blob/bfca81f9e2411dd25a73f6b2711470e2c33788ed/packages/langium/src/parser/indentation-aware.ts#L78)
and [`IndentationAwareLexer`](https://github.com/eclipse-langium/langium/blob/bfca81f9e2411dd25a73f6b2711470e2c33788ed/packages/langium/src/parser/indentation-aware.ts#L358)
services in your module as such:

```ts
import { IndentationAwareTokenBuilder, IndentationAwareLexer } from 'langium';

// ...
export const HelloWorldModule: Module<HelloWorldServices, PartialLangiumServices & HelloWorldAddedServices> = {
    // ...
    parser: {
        TokenBuilder: () => new IndentationAwareTokenBuilder(),
        Lexer: (services) => new IndentationAwareLexer(services),
    },
};
// ...
```

The `IndentationAwareTokenBuilder` constructor optionally accepts an object defining the names of the tokens you used to denote indentation and whitespace in your `.langium` grammar file. It defaults to:
```ts
{
    indentTokenName: 'INDENT',
    dedentTokenName: 'DEDENT',
    whitespaceTokenName: 'WS',
}
```

## Writing the grammar

In your langium file, you have to define terminals with the same names you passed to `IndentationAwareTokenBuilder` (or the defaults shown above if you did not override them).
For example, let's define the grammar for a simple version of Python with support for only `if` and `return` statements, and only booleans as expressions:

```langium
grammar PythonIf

entry Statement: If | Return;

If:
    'if' condition=BOOLEAN ':'
        INDENT thenBlock+=Statement+
        DEDENT
    ('else' ':'
        INDENT elseBlock+=Statement+
        DEDENT)?;

Return: 'return' value=BOOLEAN;

terminal BOOLEAN returns boolean: /true|false/;
terminal INDENT: 'synthetic:indent';
terminal DEDENT: 'synthetic:dedent';
hidden terminal WS: /[\t ]+/;
hidden terminal NL: /[\r\n]+/;
```

The important terminals here are `INDENT`, `DEDENT`, and `WS`.
`INDENT` and `DEDENT` are used to delimit a nested block, similar to `{` and `}` (respectively) in C-like languages.
Note that `INDENT` indicates an **increase** in indentation, not just the existence of leading whitespace, which is why in the example above we used it only at the beginning of the block, not before every `Statement`.
Additionally, the separation of `WS` from simply `\s+` to `[\t ]+` and `[\r\n]+` is necessary because a simple `\s+` will match the new line character, as well as any possible indentation after it. To ensure correct behavior, the token builder modifies the pattern of the `whitespaceTokenName` token to be `[\t ]+`, so a separate hidden token for new lines needs to be explicitly defined.

The content you choose for these 3 terminals doesn't matter since it will overridden by `IndentationAwareTokenBuilder` anyway. However, you might still want to choose tokens that don't overlap with other terminals for easier use in the playground.

With the default configuration and the grammar above, for the following code sample:
```
if true:
    return false
else:
    if true:
        return true
```

the lexer will output the following sequence of tokens: `if`, `BOOLEAN`, `INDENT`, `return`, `BOOLEAN`, `DEDENT`, `else`, `INDENT`, `if`, `BOOLEAN`, `INDENT`, `return`, `BOOLEAN`, `DEDENT`, `DEDENT`.

## Drawbacks

Using this token builder, all leading whitespace becomes significant, no matter the context.
This means that it will no longer be possible for an expression to span multiple lines if one of these lines starts with whitespace and an `INDENT` token is not explicitly allowed in that position.

For example, the following Python code wouldn't parse:
```python
x = [
    1, # ERROR: Unexpected INDENT token
]
```
without explicitly specifying that `INDENT` is allowed after `[`.

This can be worked around by using [multi-mode lexing](https://github.com/eclipse-langium/langium-website/pull/132).

<!-- TODO: change link from PR to webpage after it's published. -->
