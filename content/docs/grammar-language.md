---
title: "The Grammar Language"
---
The grammar language describes the syntax and structure of your language. The [Langium grammar langium](https://github.com/langium/langium/blob/main/packages/langium/src/grammar/langium-grammar.langium) is implemented using Langium itself and therefore follows the same syntactic rules as any language created with Langium.

In the following, we describe the Langium syntax and document structure.
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

Here, the token `STRING` will match a stream of character surrounded by double quotes or single quotes.

**The order in which terminal rules are defined is critical** as the lexer will always return the first match.

### Return Types

A terminal rule always returns an instance of a Typescript type. If no return type is specified then the terminal rule will return a `string` by default. 

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
Terminal rules can be described using *regular expressions* or *Extended Backus-Naur Form*-like (EBNF) expressions similar to the [Xtext](https://www.eclipse.org/Xtext/) notation.
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

### Terminal Fragments
Fragments allow for sub-definition of terminal rules to be extracted. They are not consumed by the lexer and have to be consumed by other terminal rules.

```
terminal fragment CAPITAL_LETTER: ('A'..'Z');
terminal fragment SMALL_LETTER: ('a'..'z');
terminal WORD: (CAPITAL_LETTER|SMALL_LETTER)*;
```
## Parser Rules
[TODO] INTRODUCTION ABOUT PARSER RULES
### Extended Backus-Naur Form Expressions
Parser rules have access to a more restricted set of expressions compared to terminal rules. Parser and terminal rules share the following expressions:
- Groups
- Alternatives
- Keywords
- Rule calls

Parser rules also have their own expressions as described below.
#### Declaration
A parser rule always starts with the name of the rule followed by an optional return type. If no return type is specified, the parser assumes that the object created has the type of the parser rule's name.
```
Person:
    'person' name=ID;
``` 
In this example, the parser will create an object of type `Person`. This object will have a property `name` of type `ID` (defined by the terminal rule).

[TODO] ADD SECTION ABOUT KEYWORDS
#### Assignments
There are three different ways to assign an expression (right side) to a property (left side).

1. `=` is used for assigning **only one element** to a property
    ```
    Person:
        'person' name=ID
    ```
    Here, the property `name` will only accept one expression of type `ID`
2. `+=` is used to assign **multiple expressions** to a list property
    ```
    Paragraph:
        'paragraph' (sentences+=STRING)+;
    ```
    [QUESTION] IS THIS DECLARATION VALID? OR SHOULD sentences BE ASSIGNED AN OTHER PARSER RULE INSTEAD OF A TERMINAL RULE?
3. `?=` is used to assign a **value to a property of type boolean**. The value of the property of type `boolean` is set to `true` if the right part of the assignment is consume by the parser
    ```
    Employee:
        'employee' name=ID (remote?='remote')?
    ```
    Here the value of the property `remote` will be set to true if the keyword `remote` appears in the declaration.
#### Cross-reference
[TODO] CHECK IN MORE DETAILS, I DON'T UNDERSTAND THE SYNTAX AND HOW IT'S IMPLEMENTED
#### Unordered Groups
By default, a parser rule has to be implemented in the exact order it is declared.
```
Person:
    'person' name=ID age=INT
```
Here a `Person` object **needs** to first declare the property `name` then `age`
``` 
person Bob 25
```
will successfully create an object of type `Person` while
```
person 25 Bob
```
will throw an error.

It is however possible to declared properties in an unordered fashion using the `&` operator
```
Person:
    'person' name=ID & age=INT
```
will now allow `name` and `age` to be declared in any order.
```
person 25 Bob
```
will then successfully create an object of type `Person`.

Cardinality (?,*,+ operators) also applies to unordered group. Please note that assignments with a cardinality of `+` or `*` have to appear continuously and cannot be interrupted by an other assignment and resumed later.
```

```
[TODO] FIND GOOD EXAMPLE FOR CARDINALITY
#### Simple Actions
It is possible for a rule to return different types depending on declaration
```
FirstRule returns FirstType:
    'firstKeyword' name=ID | SecondRule;

SecondRule returns SecondType:
    'secondKeyword' name=ID;
```
In the above example, we rely on a *rule call* to specify the return type. Actions allow to improve the readability of the grammar by explicitly defining the return type
```
RuleName returns FirstType:
    'firstKeyword' name=ID | 'secondKeyword {SecondType} name=ID;
```

```
PrimaryExpression returns Expression:
	'(' Expression ')' |
	{NumberLiteral} value=NUMBER |
	{FunctionCall} func=[AbstractDefinition] ('(' args+=Expression (',' args+=Expression)* ')')?;
```
#### Unassigned Rule Calls
Parser rules do not necessarily need to return an object, they can also refer to other parser rules which in turn will be responsible for returning the object.
For example, in the Arithmetics example:
```
AbstractDefinition:
	Definition | DeclaredParameter;
```
The parser rule `AbstractDefinition` will not create an object of type AbstractDefinition. Instead, it calls either the `Definition` or `DeclaredParameter` parser rule which will create an object of type Definition or DeclaredParameter respectively. 
#### Assigned Actions

### Syntactic Predicates
## Hidden Terminal Symbols
[QUESTION] THE XTEXT DOC SAYS THAT HIDDEN TERMINALS CAN BE ADDED TO SPECIFIC PARSER RULES. IS THIS VALID FOR LANGIUM? I COULDN'T MAKE IT WORK ON MY SETUP. 
## Data Types Rules
## Enum Rules
[QUESTION] DOES LANGIUM SUPPORTS ENUM? PR#84 removed enum and added primitive instead
## Grammar Annotations
[QUESTION] IS THAT IN THE LANGIUM GRAMMAR?