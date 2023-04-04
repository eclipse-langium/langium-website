import { monaco } from "monaco-editor-wrapper/.";
import { AstNode, Diagnostic, Pos } from "../langium-utils/langium-ast";

export interface Evaluation {
    range: {
        start: Pos;
        end: Pos;
    }
    text: string;
    value: number;
}
export const defaultText = `Module example1

Def y: 1 + 3 - 99828932 / 2 + 2 - 1;

DEF x: 12 / 3 - 1; // 3

x * 2 - 4;

def t: 4;

DEF func(t, x):
    t * t * t + x;

// This language is case-insensitive regarding symbol names
Func(T, X); // 67
Func(X, T); // 31
Func(T, Func(T, X)); // 131`;


export const syntaxHighlighting = {
    ignoreCase: true,
    keywords: [
        'def','module'
    ],
    operators: [
        '*','+',',','-','/',':',';'
    ],
    symbols:  /\(|\)|\*|\+|,|-|\/|:|;/,
    tokenizer: {
        initial: [
            { regex: /[_a-zA-Z][\w_]*/, action: { cases: { '@keywords': {"token":"keyword"}, '@default': {"token":"ID"} }} },
            { regex: /[0-9]+(\.[0-9]*)?/, action: {"token":"number"} },
            { include: '@whitespace' },
            { regex: /@symbols/, action: { cases: { '@operators': {"token":"operator"}, '@default': {"token":""} }} },
        ],
        whitespace: [
            { regex: /\s+/, action: {"token":"white"} },
            { regex: /\/\*/, action: {"token":"comment","next":"@comment"} },
            { regex: /\/\/[^\n\r]*/, action: {"token":"comment"} },
        ],
        comment: [
            { regex: /[^\/\*]+/, action: {"token":"comment"} },
            { regex: /\*\//, action: {"token":"comment","next":"@pop"} },
            { regex: /[\/\*]/, action: {"token":"comment"} },
        ],
    }
} as monaco.languages.IMonarchLanguage;