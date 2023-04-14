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
export const defaultText = `Module basicMath

def a: 5;
def b: 3;
def c: a + b;

def sqrt(x, y):
    x^(1/y);

// This language is case-insensitive regarding symbol names
Sqrt(c, 2); // 4
Sqrt(81, 2); // 9
Sqrt(81, 3); // 4

2 * c; // 16
c % 2; // 1
`


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