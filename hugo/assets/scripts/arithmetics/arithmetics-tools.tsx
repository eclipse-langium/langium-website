import { monaco } from "langium-website-core/bundle";

type Pos = {
    character: number;
    line: number;
}

export interface Evaluation {
    range: {
        start: Pos;
        end: Pos;
    }
    text: string;
    value: number;
}
export const examples = [`Module basicMath

def a: 5;
def b: 3;
def c: a + b;
def d: (a ^ b);

def root(x, y):
    x^(1/y);

def sqrt(x):
    root(x, 2);

2 * c;
b % 2;

// This language is case-insensitive regarding symbol names
Root(D, 3);
Root(64, 3);
Sqrt(81);`,

    `MODULE priceCalculator

DEF materialPerUnit: 100;

DEF laborPerUnit: 200;

DEF costPerUnit: materialPerUnit + laborPerUnit;

DEF expectedNoOfSales: 200;

DEF costOfGoodsSold: expectedNoOfSales * costPerUnit;

DEF generalExpensesAndSales: 10000;

DEF desiredProfitPerUnit: 50;

DEF netPrice:
    (costOfGoodsSold + generalExpensesAndSales) / expectedNoOfSales + desiredProfitPerUnit;

DEF vat: 0.15;


DEF calcGrossListPrice(net, tax):
    net / (1 - tax);

calcGrossListPrice(netPrice, vat);`
]

/**
 * Monarch grammar for arithmetics
 */
export const syntaxHighlighting = {
    ignoreCase: true,
    keywords: [
        'def', 'module'
    ],
    operators: [
        '*', '+', ',', '-', '/', ':', ';'
    ],
    symbols: /\(|\)|\*|\+|,|-|\/|:|;/,
    tokenizer: {
        initial: [
            { regex: /[_a-zA-Z][\w_]*/, action: { cases: { '@keywords': { "token": "keyword" }, '@default': { "token": "ID" } } } },
            { regex: /[0-9]+(\.[0-9]*)?/, action: { "token": "number" } },
            { include: '@whitespace' },
            { regex: /@symbols/, action: { cases: { '@operators': { "token": "operator" }, '@default': { "token": "" } } } },
        ],
        whitespace: [
            { regex: /\s+/, action: { "token": "white" } },
            { regex: /\/\*/, action: { "token": "comment", "next": "@comment" } },
            { regex: /\/\/[^\n\r]*/, action: { "token": "comment" } },
        ],
        comment: [
            { regex: /[^\/\*]+/, action: { "token": "comment" } },
            { regex: /\*\//, action: { "token": "comment", "next": "@pop" } },
            { regex: /[\/\*]/, action: { "token": "comment" } },
        ],
    }
} as monaco.languages.IMonarchLanguage;