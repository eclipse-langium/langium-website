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

export const LangiumInitialContent = `grammar Statemachine

entry Statemachine:
    'statemachine' name=ID
    ('events' events+=Event+)?
    ('commands'    commands+=Command+)?
    'initialState' init=[State]
    states+=State*;

Event:
    name=ID;

Command:
    name=ID;

State:
    'state' name=ID
        ('actions' '{' actions+=[Command]+ '}')?
        transitions+=Transition*
    'end';

Transition:
    event=[Event] '=>' state=[State];

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"[^"]*"|'[^']*'/;

hidden terminal ML_COMMENT: /\\/\\*[\\s\\S]*?\\*\\//;
hidden terminal SL_COMMENT: /\\/\\/[^\\n\\r]*/;
`;

export const StateMachineInitialContent = `statemachine TrafficLight

events
    switchCapacity
    next

initialState PowerOff

state PowerOff
    switchCapacity => RedLight
end

state RedLight
    switchCapacity => PowerOff
    next => GreenLight
end

state YellowLight
    switchCapacity => PowerOff
    next => RedLight
end

state GreenLight
    switchCapacity => PowerOff
    next => YellowLight
end`;
