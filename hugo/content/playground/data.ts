/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

export const LangiumMonarchContent = {
  keywords: [
    "bigint",
    "boolean",
    "current",
    "Date",
    "entry",
    "extends",
    "false",
    "fragment",
    "grammar",
    "hidden",
    "import",
    "infer",
    "infers",
    "interface",
    "number",
    "returns",
    "string",
    "terminal",
    "true",
    "type",
    "with",
  ],
  operators: [
    "->",
    ",",
    ";",
    ":",
    "!",
    "?",
    "?=",
    ".",
    "..",
    "@",
    "*",
    "&",
    "+",
    "+=",
    "<",
    "=",
    "=>",
    ">",
    "|",
  ],
  symbols:
    /->|,|;|:|!|\?|\?=|\.|\.\.|\(|\)|\[|\[\]|\]|\{|\}|@|\*|&|\+|\+=|<|=|=>|>|\|/,

  tokenizer: {
    initial: [
      {
        regex: /\/(?![*+?])(?:[^\r\n\[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+\//,
        action: { token: "string" },
      },
      {
        regex: /\^?[_a-zA-Z][\w_]*/,
        action: {
          cases: {
            "@keywords": { token: "keyword" },
            "@default": { token: "ID" },
          },
        },
      },
      { regex: /"[^"]*"|'[^']*'/, action: { token: "string" } },
      { include: "@whitespace" },
      {
        regex: /@symbols/,
        action: {
          cases: {
            "@operators": { token: "operator" },
            "@default": { token: "" },
          },
        },
      },
    ],
    whitespace: [
      { regex: /\s+/, action: { token: "white" } },
      { regex: /\/\*/, action: { token: "comment", next: "@comment" } },
      { regex: /\/\/[^\n\r]*/, action: { token: "comment" } },
    ],
    comment: [
      { regex: /[^\/\*]+/, action: { token: "comment" } },
      { regex: /\*\//, action: { token: "comment", next: "@pop" } },
      { regex: /[\/\*]/, action: { token: "comment" } },
    ],
  },
};

export const HelloWorldGrammar = `grammar HelloWorld

entry Model:
    (persons+=Person | greetings+=Greeting)*;

Person:
    'person' name=ID;

Greeting:
    'Hello' person=[Person:ID] '!';

hidden terminal WS: /\\s+/;
terminal ID: /[_a-zA-Z][\\w_]*/;

hidden terminal ML_COMMENT: /\\/\\*[\\s\\S]*?\\*\\//;
hidden terminal SL_COMMENT: /\\/\\/[^\\n\\r]*/;
`;

// seriealized AST of the hello world grammar above
export const HelloWorldAst = `{"$type":"Grammar","isDeclared":true,"name":"HelloWorld","rules":[{"$type":"ParserRule","name":"Model","entry":true,"definition":{"$type":"Alternatives","elements":[{"$type":"Assignment","feature":"persons","operator":"+=","terminal":{"$type":"RuleCall","rule":{"$ref":"#/rules@1"},"arguments":[]}},{"$type":"Assignment","feature":"greetings","operator":"+=","terminal":{"$type":"RuleCall","rule":{"$ref":"#/rules@2"},"arguments":[]}}],"cardinality":"*"},"definesHiddenTokens":false,"fragment":false,"hiddenTokens":[],"parameters":[],"wildcard":false},{"$type":"ParserRule","name":"Person","definition":{"$type":"Group","elements":[{"$type":"Keyword","value":"person"},{"$type":"Assignment","feature":"name","operator":"=","terminal":{"$type":"RuleCall","rule":{"$ref":"#/rules@4"},"arguments":[]}}]},"definesHiddenTokens":false,"entry":false,"fragment":false,"hiddenTokens":[],"parameters":[],"wildcard":false},{"$type":"ParserRule","name":"Greeting","definition":{"$type":"Group","elements":[{"$type":"Keyword","value":"Hello"},{"$type":"Assignment","feature":"person","operator":"=","terminal":{"$type":"CrossReference","type":{"$ref":"#/rules@1"},"terminal":{"$type":"RuleCall","rule":{"$ref":"#/rules@4"},"arguments":[]},"deprecatedSyntax":false}},{"$type":"Keyword","value":"!"}]},"definesHiddenTokens":false,"entry":false,"fragment":false,"hiddenTokens":[],"parameters":[],"wildcard":false},{"$type":"TerminalRule","hidden":true,"name":"WS","definition":{"$type":"RegexToken","regex":"\\\\s+"},"fragment":false},{"$type":"TerminalRule","name":"ID","definition":{"$type":"RegexToken","regex":"[_a-zA-Z][\\\\w_]*"},"fragment":false,"hidden":false},{"$type":"TerminalRule","hidden":true,"name":"ML_COMMENT","definition":{"$type":"RegexToken","regex":"\\\\/\\\\*[\\\\s\\\\S]*?\\\\*\\\\/"},"fragment":false},{"$type":"TerminalRule","hidden":true,"name":"SL_COMMENT","definition":{"$type":"RegexToken","regex":"\\\\/\\\\/[^\\\\n\\\\r]*"},"fragment":false}],"definesHiddenTokens":false,"hiddenTokens":[],"imports":[],"interfaces":[],"types":[],"usedGrammars":[]}`;

// hello world program
export const DSLInitialContent = `person John
person Jane

Hello John!
Hello Jane!
`;
