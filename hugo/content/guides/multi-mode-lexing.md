---
title: "Multi-Mode Lexing"
weight: 400
---

Many modern programming languages such as [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) or [C#](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/tokens/interpolated) support template literals.
They are a way to easily concatenate or interpolate string values while maintaining great code readability.
This guide will show you how to support template literals in Langium.

```antlr
TemplateLiteral:
    // Either just the full content
    content+=TemplateContent | 
    // Or template string parts with expressions in between
    (
        content+=TemplateContentStart 
        content+=Expression? 
        (
            content+=TemplateContentMiddle 
            content+=Expression?
        )* 
        content+=TemplateContentEnd
    );

TemplateContent returns TextLiteral:
    value=RICH_TEXT;

TemplateContentStart returns TextLiteral:
    value=RICH_TEXT_START;

TemplateContentMiddle returns TextLiteral:
    value=RICH_TEXT_INBETWEEN;

TemplateContentEnd returns TextLiteral:
    value=RICH_TEXT_END;

terminal RICH_TEXT:
    '`' IN_RICH_TEXT* '`';

terminal RICH_TEXT_START:
    '`' IN_RICH_TEXT* '{';

terminal RICH_TEXT_INBETWEEN:
    '}' IN_RICH_TEXT* '{';

terminal RICH_TEXT_END:
    '}' IN_RICH_TEXT* '`';

terminal fragment IN_RICH_TEXT:
    /[^{`]|{{|``/;
```

```ts
import { DefaultTokenBuilder, Grammar, isTokenTypeArray, Keyword, TerminalRule } from "langium";
import { IMultiModeLexerDefinition, TokenType, TokenVocabulary } from "chevrotain";

const REGULAR_MODE  = 'regular_mode';
const TEMPLATE_MODE = 'template_mode';

export class CustomTokenBuilder extends DefaultTokenBuilder {

    override buildTokens(grammar: Grammar, options?: { caseInsensitive?: boolean }): TokenVocabulary {
        const tokenTypes = super.buildTokens(grammar, options);

        if(isTokenTypeArray(tokenTypes)) {
            // Regular mode just drops rich text middle & end
            const regularModeTokens = tokenTypes
                .filter(token => !['RICH_TEXT_INBETWEEN','RICH_TEXT_END'].includes(token.name));
            // Template mode needs to exclude the '}' keyword, which causes confusion while lexing
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
        keyword: Keyword,
        terminalTokens: TokenType[],
        caseInsensitive: boolean
    ): TokenType {
        let tokenType = super.buildKeywordToken(keyword, terminalTokens, caseInsensitive);
        
        if (tokenType.name === '}') {
            // The default } token will use [RICH_TEXT_INBETWEEN, RICH_TEXT_END] as longer alts
            // We need to delete the LONGER_ALT, they are not valid for the regular lexer mode
            delete tokenType.LONGER_ALT;
        }

        return tokenType;
    }

    protected override buildTerminalToken(terminal: TerminalRule): TokenType {
        let tokenType = super.buildTerminalToken(terminal);

        // Update token types to enter & exit template mode
        if(tokenType.name === 'RICH_TEXT_START') {
            tokenType.PUSH_MODE = TEMPLATE_MODE;
        } else if(tokenType.name === 'RICH_TEXT_END') {
            tokenType.POP_MODE = true;
        }

        return tokenType;
    }

}
```
