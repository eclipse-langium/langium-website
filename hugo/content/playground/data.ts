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

// hello world program
export const DSLInitialContent = `person John
person Jane

Hello John!
Hello Jane!
`;
