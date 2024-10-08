---
title: Indentation-sensitive languages
weight: 300
---

Some programming languages (such as Python, Haskell, and YAML) use indentation to denote nesting, as opposed to special non-whitespace tokens (such as `{` and `}` in C++/JavaScript).
This can be difficult to express in the EBNF notation used for defining a language grammar in Langium, which is context-free.
To achieve that, you can make use of synthetic tokens in the grammar which you would then redefine in a custom token builder.

Starting with Langium 3.2.0, such token builder (and an accompanying lexer) are provided for easy plugging into your language.
They work by modifying the underlying token type generated for your indentation terminal tokens to use a custom matcher function instead that has access to more context than simple Regular Expressions, allowing it to store state and detect _changes_ in indentation levels.

## Configuring the token builder and lexer

To be able to use the indendation tokens in your grammar, you first have to import and register the [`IndentationAwareTokenBuilder`](https://github.com/eclipse-langium/langium/blob/bfca81f9e2411dd25a73f6b2711470e2c33788ed/packages/langium/src/parser/indentation-aware.ts#L78)
and [`IndentationAwareLexer`](https://github.com/eclipse-langium/langium/blob/bfca81f9e2411dd25a73f6b2711470e2c33788ed/packages/langium/src/parser/indentation-aware.ts#L358)
services in your module as such:

```ts
import { IndentationAwareTokenBuilder, IndentationAwareLexer } from 'langium';

export const HelloWorldModule: Module<HelloWorldServices, PartialLangiumServices & HelloWorldAddedServices> = {
    // ...
    parser: {
        TokenBuilder: () => new IndentationAwareTokenBuilder(),
        Lexer: (services) => new IndentationAwareLexer(services),
        // ...
    },
};
```

The `IndentationAwareTokenBuilder` constructor optionally accepts an object defining the names of the tokens you used to denote indentation and whitespace in your `.langium` grammar file, as well as a list of delimiter tokens inside of which indentation should be ignored. It defaults to:
```ts
{
    indentTokenName: 'INDENT',
    dedentTokenName: 'DEDENT',
    whitespaceTokenName: 'WS',
    ignoreIndentationDelimiters: [],
}
```

### Ignoring indentation between specific tokens

Sometimes, it is necessary to ignore any indentation token inside some expressions, such as with tuples and lists in Python. For example, in the following statement:

```py
x = [
    1,
    2
]
```

any indentation between `[` and `]` should be ignored.

To achieve similar behavior with the `IndentationAwareTokenBuilder`, the `ignoreIndentationDelimiters` option can be used.
It accepts a list of pairs of token names (terminal or keyword) and turns off indentation token detection between each pair.

For example, if you construct the `IndentationAwareTokenBuilder` with the following options:

```ts
new IndentationAwareTokenBuilder({
    ignoreIndentationDelimiters: [
        ['[', ']'],
        ['(', ')'],
    ],
})
```

then no indentation tokens will be emitted between either of those pairs of tokens.

### Configuration options type safety

The `IndentationAwareTokenBuilder` supports generic type parameters to improve type-safety and IntelliSense of its options.
This helps detect when a token name has been mistyped or changed in the grammar.
The first generic parameter corresponds to the names of terminal tokens, while the second one corresonds to the names of keyword tokens.
Both parameters are optional and can be imported from `./generated/ast.js` and used as such:

```ts
import { MyLanguageTerminalNames, MyLanguageKeywordNames } from './generated/ast.js';
import { IndentationAwareTokenBuilder, IndentationAwareLexer } from 'langium';

// ...
export const HelloWorldModule: Module<HelloWorldServices, PartialLangiumServices & HelloWorldAddedServices> = {
    parser: {
        TokenBuilder: () => new IndentationAwareTokenBuilder<MyLanguageTerminalNames, MyLanguageKeywordNames>({
            ignoreIndentationDelimiters: [
                ['L_BRAC', 'R_BARC'], // <-- This typo will now cause a TypeScript error
            ]
        }),
        Lexer: (services) => new IndentationAwareLexer(services),
    },
};
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

```py
if true:
    return false
else:
    if true:
        return true
```

the lexer will output the following sequence of tokens: `if`, `BOOLEAN`, `INDENT`, `return`, `BOOLEAN`, `DEDENT`, `else`, `INDENT`, `if`, `BOOLEAN`, `INDENT`, `return`, `BOOLEAN`, `DEDENT`, `DEDENT`.
