---
title: "Multi-Mode Lexing"
weight: 400
---

Many modern programming languages such as [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) or [C#](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/tokens/interpolated) support template literals.
They are a way to easily concatenate or interpolate string values while maintaining great code readability.
This guide will show you how to support template literals in Langium.

For this specific example, our template literal starts and ends using backticks `` ` ``  and are interupted by expressions that are wrapped in curly braces `{}`.
So in our example, usage of template literals might look something like this:

```js
println(`hello {name}!`);
```

Conceptually, template strings work by reading a start terminal which starts with `` ` `` and ends with `{`, 
followed by an expression and then an end terminal which is effectively just the start terminal in reverse using `}` and `` ` ``.
Since we don't want to restrict users to only a single expression in their template literals, we also need a "middle" terminal reading from `}` to `{`.
Of course, there's also the option that a user only uses a template literal without any expressions in there.
So we additionally need a "full" terminal that reads from the start of the literal all the way to the end in one go.

To achieve this, we will define a `TemplateLiteral` parser rule and a few terminals.
These terminals will adhere to the requirements that we just defined.
To make it a bit easier to read and maintain, we also define a special terminal fragment that we can reuse in all our terminal definitions:

```antlr
TemplateLiteral:
    // Either just the full content
    content+=TEMPLATE_LITERAL_FULL |
    // Or template literal parts with expressions in between
    (
        content+=TEMPLATE_LITERAL_START 
        content+=Expression?
        (
            content+=TEMPLATE_LITERAL_MIDDLE
            content+=Expression?
        )*
        content+=TEMPLATE_LITERAL_END
    )
;

terminal TEMPLATE_LITERAL_FULL:
    '`' IN_TEMPLATE_LITERAL* '`';

terminal TEMPLATE_LITERAL_START:
    '`' IN_TEMPLATE_LITERAL* '{';

terminal TEMPLATE_LITERAL_MIDDLE:
    '}' IN_TEMPLATE_LITERAL* '{';

terminal TEMPLATE_LITERAL_END:
    '}' IN_TEMPLATE_LITERAL* '`';

// '{{' is handled in a special way so we can escape normal '{' characters
// '``' is doing the same for the '`' character
terminal fragment IN_TEMPLATE_LITERAL:
    /[^{`]|{{|``/;
```

If we go ahead and start parsing files with these changes, most things should work as expected.
However, depending on the structure of your existing grammar, some of these new terminals might be in conflict with existing terminals of your language.
For example, if your language supports block statements, chaining multiple blocks together will make this issue apparent:

```js
{
    console.log('hi');
}
{
    console.log('hello');
}
```

The `} ... {` block in this example won't be parsed as separate `}` and `{` tokens, but instead as a single `TEMPLATE_LITERAL_MIDDLE` token, resulting in a parser error due to the unexpected token.
This doesn't make a lot of sense, since we aren't in the middle of a template literal at this point anyway.
However, our lexer doesn't know yet that the `TEMPLATE_LITERAL_MIDDLE` and `TEMPLATE_LITERAL_END` terminals are only allowed to show up within a `TemplateLiteral` rule.
To rectify this, we will need to make use of lexer modes. They will give us the necessary context to know whether we're inside a template literal or outside of it.
Depending on the current selected mode, we can lex different terminals. In our case, we want to exclude the `TEMPLATE_LITERAL_MIDDLE` and `TEMPLATE_LITERAL_END` terminals.

The following implementation of a `TokenBuilder` will do the job for us. It creates two lexing modes, which are almost identical except for the `TEMPLATE_LITERAL_MIDDLE` and `TEMPLATE_LITERAL_END` terminals.
We will also need to make sure that the modes are switched based on the `TEMPLATE_LITERAL_START` and `TEMPLATE_LITERAL_END` terminals. We use `PUSH_MODE` and `POP_MODE` for this.

```ts
import { DefaultTokenBuilder, isTokenTypeArray, GrammarAST } from "langium";
import { IMultiModeLexerDefinition, TokenType, TokenVocabulary } from "chevrotain";

const REGULAR_MODE  = 'regular_mode';
const TEMPLATE_MODE = 'template_mode';

export class CustomTokenBuilder extends DefaultTokenBuilder {

    override buildTokens(grammar: GrammarAST.Grammar, options?: { caseInsensitive?: boolean }): TokenVocabulary {
        const tokenTypes = super.buildTokens(grammar, options);

        if(isTokenTypeArray(tokenTypes)) {
            // Regular mode just drops template literal middle & end
            const regularModeTokens = tokenTypes
                .filter(token => !['TEMPLATE_LITERAL_MIDDLE','TEMPLATE_LITERAL_END'].includes(token.name));
            // Template mode needs to exclude the '}' keyword
            const templateModeTokens = tokenTypes
                .filter(token => !['}'].includes(token.name));

            const multiModeLexerDef: IMultiModeLexerDefinition = {
                modes: {
                    [REGULAR_MODE]: regularModeTokens,
                    [TEMPLATE_MODE]: templateModeTokens
                },
                defaultMode: REGULAR_MODE
            };
            return multiModeLexerDef;
        } else {
            throw new Error('Invalid token vocabulary received from DefaultTokenBuilder!');
        }
    }

    protected override buildKeywordToken(
        keyword: GrammarAST.Keyword,
        terminalTokens: TokenType[],
        caseInsensitive: boolean
    ): TokenType {
        let tokenType = super.buildKeywordToken(keyword, terminalTokens, caseInsensitive);
        
        if (tokenType.name === '}') {
            // The default } token will use [TEMPLATE_LITERAL_MIDDLE, TEMPLATE_LITERAL_END] as longer alts
            // We need to delete the LONGER_ALT, they are not valid for the regular lexer mode
            delete tokenType.LONGER_ALT;
        }
        return tokenType;
    }

    protected override buildTerminalToken(terminal: GrammarAST.TerminalRule): TokenType {
        let tokenType = super.buildTerminalToken(terminal);

        // Update token types to enter & exit template mode
        if(tokenType.name === 'TEMPLATE_LITERAL_START') {
            tokenType.PUSH_MODE = TEMPLATE_MODE;
        } else if(tokenType.name === 'TEMPLATE_LITERAL_END') {
            tokenType.POP_MODE = true;
        }
        return tokenType;
    }
}
```

With this change in place, the parser will work as expected. There is one last issue which we need to resolve in order to get everything working perfectly.
When inspecting our AST, the `TemplateLiteral` object will contain strings with input artifacts in there; mainly `` ` ``, `{` and `}`.
These aren't actually part of the semantic value of these strings, so we should get rid of them.
We will need to create a custom `ValueConverter` and remove these artifacts:

```ts
import { CstNode, GrammarAST, DefaultValueConverter, ValueType, convertString } from 'langium';

export class CustomValueConverter extends DefaultValueConverter {

    protected override runConverter(rule: GrammarAST.AbstractRule, input: string, cstNode: CstNode): ValueType {
        if (rule.name.startsWith('TEMPLATE_LITERAL')) {
            // 'convertString' simply removes the first and last character of the input
            return convertString(input);
        } else {
            return super.runConverter(rule, input, cstNode);
        }
    }
}
```

Of course, let's not forget to bind all of these services:

```ts
export const CustomModule = {
    parser: {
        TokenBuilder: () => new CustomTokenBuilder(),
        ValueConverter: () => new CustomValueConverter()
    },
};
```