export interface LoxMessage {
    type: LoxMessageType;
    content: unknown;
};

export type LoxMessageType = "notification" | "output" | "error";


export const exampleCode = `fun factorial(n: number): number {
  if (n <= 1) {
    return 1;
  } else {
    return n * factorial(n - 1);
  }
}

fun binomial(n: number, k: number): number {
    return factorial(n) / (factorial(k) * factorial(n - k));
}

fun pow(x: number, n: number): number {
    var result = 1;
    for (var i = 0; i < n; i = i + 1) {
        result = result * x;
    }
    return result;
}

fun mod(x: number, y: number): number {
    return x - y * (x / y);
}

fun floor(x: number): number {
    return x - mod(x, 1);
}

print("factorial(5) = " + factorial(5));
print("binomial(5, 2) = " + binomial(5, 2));
print("pow(2, 10) = " + pow(2, 10));
print("mod(10, 3) = " + mod(10, 3));
print("floor(3.14) = " + floor(3.14));


for (var i = 0; i <= 1000; i = i + 1) {
    print(i);
}

`;

export const syntaxHighlighting = {
    keywords: [
        'and', 'boolean', 'class', 'else', 'false', 'for', 'fun', 'if', 'nil', 'number', 'or', 'print', 'return', 'string', 'super', 'this', 'true', 'var', 'void', 'while'
    ],
    operators: [
        '-', ',', ';', ':', '!', '!=', '.', '*', '/', '+', '<', '<=', '=', '==', '=>', '>', '>='
    ],
    symbols: /-|,|;|:|!|!=|\.|\(|\)|\{|\}|\*|\+|<|<=|=|==|=>|>|>=/,

    tokenizer: {
        initial: [
            { regex: /[_a-zA-Z][\w_]*/, action: { cases: { '@keywords': { "token": "keyword" }, '@default': { "token": "ID" } } } },
            { regex: /[0-9]+(\.[0-9]+)?/, action: { "token": "number" } },
            { regex: /"[^"]*"/, action: { "token": "string" } },
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
};
