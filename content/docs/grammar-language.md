---
title: "The Grammar Language"
---
The grammar language describes the syntax and structure of your language. The [Langium grammar langium](https://github.com/langium/langium/blob/main/packages/langium/src/grammar/langium-grammar.langium) is implemented using Langium itself and therefore follows the same syntactic rules as any language created with Langium.

In the following, we describe the Langium syntax and document structure.
## Language Declaration

A Langium grammar file always starts with a header which declares the name of the language. For example, a language named `MyLanguage` would be declared with:

```
grammar MyLanguage
```

Every grammar file has a `.langium` extension and needs to be referenced in `langium-config.json`. If you used the `langium-generator` to start your project then your language was automatically referenced in `langium-config.json`.

### Import other grammar languages
It is possible to reuse grammar rules from other `.langium` files by importing them into your grammar file.

```
import 'path/to/an/other/langium/grammar';
```
This will import **all grammar rules** from the imported grammar file. It is therefore crucial to ensure that there are no duplicate rules between the different grammar files.

[QUESTION] Is the above sentence true? Or is there a way to import only part of a grammar?
## Terminal Rules
The first step in parsing your language, *lexing*, transforms a stream of characters into a stream of tokens. Tokens are a sequence of one or many characters which is matched by a *terminal rule*. The names of terminal rules are conventionally written in upper case. 
The Langium parser is created using [Chevrotain](https://chevrotain.io/docs/) which has a built-in lexer based on *Javascript Regular Expressions*. However, Langium allows the use of [Extended Backus-Naur Form Expressions](#extended-backus-naur-form-expressions) and both expressions can be used conjointly in the same grammar. The declaration of a terminal rule starts with the [keyword](#keywords) `terminal`:

```
terminal ID: /[_a-zA-Z][\w_]*/;
```

Here, the token `ID` will match a stream of character starting with the character '\_', a small letter, or a capital letter followed by sequence of zero or many ([cardinality](#cardinalities) *) alphanumeric characters ('\w') or '\_'.

**The order in which terminal rules are defined is critical** as the lexer will always return the first match.

### Return Types

A terminal rule always returns an instance of a `Typescript primitive type`. If no return type is specified then the terminal rule will return a `string` by default. 

[QUESTION] Is the return type always a primitive type?

```
terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
```

Here, the terminal rule `ID` will return an instance of `string` while the terminal rule `INT` will return an instance of `number`.

The available return types in Langium are: 
- `string`
- `number`
- `boolean`
- `bigint`
[QUESTION] What are the available return types?

### Extended Backus-Naur Form Expressions
Terminal rules can be described using *regular expressions* or *Extended Backus-Naur Form*-like (EBNF) expressions similar to the [Xtext](https://www.eclipse.org/Xtext/) notation. In this section, we describe which EBNF expressions are supported in Langium and their equivalent in *Javascript Regular Expressions* where possible.
#### Cardinalities
A cardinality defines the number of elements in a given set. Four different cardinalities can be defined for any expression:
1. exactly one (no operator)
2. zero or one (operator ?)
3. zero or many (operator *)
4. one or many (operator +)

[QUESTION]Is it possible with EBNF to have a "range cardinality" similar to the {x,y} in regex?

[QUESTION]Should we add examples of cardinalities here?
#### Character Range
The operator `..` is used to declare a character range. It is equivalent to the operator `-`in regular expression. It matches any character in between the left character and the right character (inclusive on both ends) depending on their UTF-16 code.

[QUESTION] I could find where in the langium code base we parse this range. I assumed it would be based on String.prototype.charCodeAt() or something similar. Please correct if I'm wrong.

```
terminal INT returns number: ('0'..'9')+;
```

is equivalent to the regular expression:

```
terminal INT returns number: /[0-9]+/;
```

Here, `INT` is matched to one or more characters (by using the operand `+`, which defines a cardinality of 'one or many') between `0` and `9` (inclusive on both ends).

#### Wildcard
The operator `.` is used to match any character and is similar in regular expression.
```
terminal HASHTAG: '#'.+;
```
In this example, the terminal rule `HASHTAG` matches a sequence of character starting with `#` followed by one or many (cardinality +) characters.

Equivalent in regular expression:
```
terminal HASHTAG: /#.+/;
```
#### Until Token
The operator `->` indicates that all characters should be consumed from the left token *until* the right token occurs. For example, the terminal rule for multi-line comment can be implemented as:

[QUESTION] Is the matching greedy or lazy in this case? 

```
terminal ML_COMMENT: '/*' -> '*/';
```

There is no equivalent in regular expression for the until token.

[QUESTION]At least no equivalent in regex I'm aware of or could find with a quick search...
#### Negated Token

It is possible to negate all tokens using the operator `!`, in regular expression the operator `^` is used for negation.
```
terminal BETWEEN_HASHES:'#' (!'#')* '#';
```
In regular expression:
```
terminal BETWEEN_HASHES: /#[^#]*#/;
```

#### Rule Calls
A terminal rule can implement other terminal rules. 
```
terminal DOUBLE returns number: INT '.' INT;
```
Note: it is easy to create conflict between terminal rules by using *terminal rule calls*. See [Data Type Rules](#data-type-rules) for further details.
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
terminal NAME: CAPITAL_LETTER SMALL_LETTER+;
```
## Parser Rules
[TODO] INTRODUCTION ABOUT PARSER RULES
### Keywords
A parser rule that creates an object starts with a keyword. The keyword must match the regular expression `/\^?[_a-zA-Z][\w_]*/` and appear in the grammar file between single quotes.

```
Person:
    'person' name=ID;
```
In this example, the keyword `person` indicates to the parser that an object of type `Person` must be parsed. A parser rule can have many keywords:
```
Person:
    'person' name=ID 'age' age=INT;
```
[QUESTION] Are there keywords that are reserved for the Langium grammar ('grammar', 'terminal', 'fragment' ...)? Or can a rule "override" the use of those keywords?
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
## Data Type Rules
## Enum Rules
[QUESTION] DOES LANGIUM SUPPORTS ENUM? PR#84 removed enum and added primitive instead
## Grammar Annotations
[QUESTION] IS THAT IN THE LANGIUM GRAMMAR?