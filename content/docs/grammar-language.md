---
title: "The Grammar Language"
---


## Language Declaration

A Langium grammar file starts with a header which declares the name of the language

```
grammar LanguageName
```

Every grammar file have the file extension `.langium` and needs to be referenced in `langium-config.json`

[TODO] ADD IMPORT OF OTHER GRAMMAR FILES

## Terminal Rules

Lexing transforms a stream of character into a stream of tokens. Tokens are a sequence of one or many characters which is matched by a specific *terminal rule*. The names of terminal rules are conventionally written in upper case. The matching of terminal rules follows *regular expressions*.

```
terminal STRING: /"[^"]*"|'[^']*'/;
```

Here, the token `STRING` will match a stream of character surrounded by double quotes `""` or single quotes `''`.

**The order in which terminal rules are defined is critical** as the lexer will always return the first match.

### Return Types

A terminal rule returns a Typescript type. If no return type is specified then the terminal rule will return a `string` by default. 

```
terminal INT returns number: /[0-9]+/;
```

Here, the terminal rule `INT` will return an instance of `number`.
The available return types in Langium are: 
- `string`
- `number`
- `boolean`
- ...

[QUESTION] WHAT ARE ALL THE AVAILABLE RETURN TYPES?

### Extended Backus-Naur Form Expressions
Terminal rules can be described using *regular expressions* or *Extended Backus-Naur Form*-like (EBNF) expressions.
#### Cardinalities
Four different cardinalities can be defined for any expression:
1. exactly one (no operator)
2. zero or one (operator ?)
3. zero or many (operator *)
4. one or many (operator +)
#### Keywords
[QUESTION] SHOULD THIS PART BE ONLY ABOUT THE RESERVED KEYWORDS? KEYWORDS USED FOR TERMINAL RULES ONLY?
Keywords are terminal rules used by the Langium grammar itself. 
- `grammar`
- `import`
- `entry`
- `hidden`
- `fragment`

[QUESTION] WHAT ARE ALL THE KEYWORDS IN THE LANGIUM GRAMMAR AND SHOULD THEY BE EXPLAINED HERE OR IN THEIR RESPECTIVE SECTION?

#### Character Range
The operator `..` is used to declare a character range. It is equivalent to the operator `-`in regular expression.

```
terminal INT returns number: ('0'..'9')+;
```

is equivalent to

```
terminal INT returns number: /[0-9]+/;
```

Here, INT is matched to one or more characters (by using the operand `+`) between '0' and '9' (inclusive).

#### Wildcard
The operator `.` is used to match any character and is similar in regular expression.

[TODO] FIND GOOD EXAMPLE WITH THE WILDCARD USED

#### Until Token
The operator `->` indicates that all characters should be consumed from one token until a specific token occurs. For example, the terminal rule for multi-line comment can be implemented as:

```
terminal ML_COMMENT: '/*' -> '*/';
```
Regular expression equivalent:
```
terminal ML_COMMENT: /\/\*(.*?)\*\//;
```
#### Negated Token

It is possible to negate all tokens using the operator `!`
```
terminal ML_COMMENT: '/*' (!'*/')* '/*'; 
```

#### Rule Calls
A terminal rule can implement other terminal rules. 
```
terminal DOUBLE: INT '.' INT;
```
#### Alternatives
It is possible to match several valid options. The terminal rule for white space can use alternatives as:
```
terminal WS: (' '|'\t'|'\r'|'\n')+;
```
#### Groups
Tokens can be put in sequence specifying the order they have to appear
```
terminal FLIGHTNUMBER: ('A'..'Z')('A'..'Z')('0'..'9')('0'..'9')('0'..'9')('0'...'9')?;
```
In this example, the token `FLIGHTNUMBER` must start with two capital letters and followed by three of four digits.
## Parser Rules
### Extended Backus-Naur Form Expressions
#### Assignements
#### Cross-reference
#### Unordered Groups
#### Simple Actions
#### Unassigned Rule Calls
#### Assigned Actions
### Syntactic Predicates
## Hidden Terminal Symbols
## Data Types Rules
## Enum Rules
## Grammar Annotations

