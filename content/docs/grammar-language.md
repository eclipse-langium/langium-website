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

### Hidden Terminal Rules
The parser will try to match every character in the document to a terminal rules. It is therefore necessary to specify which characters or sequence of characters need to be ignored during parsing. Generally, you would want to ignore whitespaces and comments. This is achieved by adding the keyword `hidden` in front of the keyword `terminal`. These *hidden terminal rules* are global and will be valid for all parser rules in the document.
```
hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
```
[QUESTION] The Xtext doc says that hidden terminals can be added to specific parser rules. Is this valid for Langium? I couldn't make it work on my test project.
## Parser Rules
[TODO] INTRODUCTION ABOUT PARSER RULES

### Extended Backus-Naur Form Expressions
Parser rules have access to a more restricted set of EBNF expressions compared to terminal rules. Parser and terminal rules share the following expressions:
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
In this example, the parser will create an object of type `Person`. This object will have a property `name` which value and type must match the terminal rule `ID` (i.e. the property `name` is of type `string`).

#### Keywords
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
#### Assignments
There are three different ways to assign an expression (right side) to a property (left side).

1. `=` is used for assigning **only one element** to a property
    ```
    Person:
        'person' name=ID
    ```
    Here, the property `name` will only accept one expression matching the terminal rule `ID`.
2. `+=` is used to assign **multiple expressions** to a list property
    ```
    Paragraph:
        'paragraph' (sentences+=STRING)+;
    ```
    Here, the property `sentences` will accept one or many expressions matching the terminal rule `STRING`. The expressions belong to a single group and must not be interrupted by other expressions. The parsing of a document containing:
    ```
    paragraph "The expression group " 3 "was interrupted"
    ```
    will throw an error since the `STRING` expressions are not continuous. It is however possible to interrupt and resume a sequence of expressions by using [hidden terminal symbols](#hidden-terminal-symbols).
3. `?=` is used to assign a **value to a property of type boolean**. The value of the property of type `boolean` is set to `true` if the right part of the assignment is consumed by the parser
    ```
    Employee:
        'employee' name=ID (remote?='remote')?
    ```
    Here the value of the property `remote` will be set to true if the keyword `remote` appears in the document.
#### Cross-reference
With Langium, you can declare cross-references directly in the grammar.
```
Person:
    'person' name=ID;
Greeting:
    'Hello' person=[Person:ID] '!';
```
The `Person` in square brackets does not refer to the parser rule `Person` but instead refers to an object of type `Person`. It will successfully parse a document like:
```
person Bob
Hello Bob !
```
but will fail to parse:
```
person Bob
Hello Sara !
```
because a `Person` object with the ID of 'Sara' has not been instantiated even though 'Sara' is a valid `ID`.

[QUESTION] I failed to reference an instance with using something else than ID. Reading the Xtext doc and the langium-grammar it seems like it is possible but I couldn't figure out how...
#### Unordered Groups
[NOTE] Unordered group are currently not supported but seems like it's being worked on. I think this is still valuable info that could be added to the documentation at a later stage if needed.

By default, a parser rule has to be implemented in the exact order it is declared.
```
Person:
    'person' name=ID age=INT
```
Here a `Person` object **needs** to first declare the property `name` then `age`.
```
person Bob 25
```
will successfully be parsed to an object of type `Person` while
```
person 25 Bob
```
will throw an error.

However, it is possible to declare a group of properties in an unordered fashion using the `&` operator
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
#### Simple Actions
It is possible for a rule to return different types depending on declaration
```
RuleOne returns TypeOne:
    'keywordOne' name=ID | RuleTwo;

RuleTwo returns TypeTwo:
    'keywordTwo' name=ID;
```
In the above example, we rely on a *rule call* to specify the return type. With more complex rules, the readability will be highly degraded. *Actions* allow to improve the readability of the grammar by explicitly defining the return type
```
RuleName returns FirstType:
    'firstKeyword' name=ID | 'secondKeyword' {SecondType} name=ID;
```
We improved the readability by explicitly declaring the return type inside curly brackets.
#### Unassigned Rule Calls
Parser rules do not necessarily need to return an object, they can also refer to other parser rules which in turn will be responsible for returning the object.
For example, in the [Arithmetics example](https://github.com/langium/langium/blob/main/examples/arithmetics/src/language-server/arithmetics.langium):
```
AbstractDefinition:
	Definition | DeclaredParameter;
```
The parser rule `AbstractDefinition` will not create an object of type AbstractDefinition. Instead, it calls either the `Definition` or `DeclaredParameter` parser rule which will create an object of type Definition or DeclaredParameter respectively. 
#### Assigned Actions
The parser is built using Chevrotain which implements a LL(k) parsing algorithm (left-to-right). By definition, a LL(k) grammar cannot have rules containing left recursion.

Consider the following: 
```
Addition:
    Addition '+' Addition | '(' Addition ')' | value=INT;
```
The parser rule `Addition` is left-recursive and will not be parsable. We can go around this issue by *left-factoring* the rule, *i.e.* by factoring out the common left-factor. We introduce a new rule `Expression`:
```
Expression:
    '(' Addition ')' | value=INT;

Addition:
    Expression ('+' Expression)*;
```
[NOTE] Contrary to the Xtext doc, I had to add `value=` for the code to compile, otherwise is throws a `RangeError: Maximum call stack size exceeded`. Any idea why?

[TODO] Add part about syntax leading to unwanted elements in the tree.
### Syntactic Predicates
Sometimes it is difficult to describe a problem without an ambiguous grammar. We can guide the parser through the grammar language by introducing *syntactic predicates*.
In parser generator, a classical example of such ambiguous grammar is the *dangling else problem*. A simple `if-then else` statement is unambiguous:
```
if conditionA then statementA else statementB
```
A problem arises when we have to deal with nested if-then else statements:
```
if conditionA then if conditionB then statementA else statementB 
```
The `else` clause could either belong to the first or the second if statement.

The parser needs to be guided in order to parse the conditional statement correctly. This is done by using *syntactic predicates* with the operator `=>` in front of the `else` keyword:
```
ConditionalStatement:
    'if' '(' condition=BooleanExpression ')'
    then=Statement
    (=>'else' else=Statement)?
``` 
When the parser encounters the `=>` operator, it will look for the `else` keyword. If it is present, the parser will prioritize that part of the input without trying to match the same token sequence.

Using the *syntactic predicate operator* `=>` on complex rules with many tokens can increase the lookahead and therefore slow down the parser. Often times, disambiguation can be achieved by looking only at the first token. To do so, the *first token predicate* operator `->` can be used instead.
## Data Type Rules
Data type rules are similar to terminal rules as they match a sequence of characters. However, they are parser rules and therefore are context-dependent, and are allowed to use hidden terminal rules. Contrary to terminal rules, they cannot use *regular expressions* to match a stream of character and have to compose with terminal rules.

The following example from the [domain model example]() avoids for the `QualifiedName` data type rule to conflict with the terminal rule `ID`.
```
QualifiedName returns string:
    ID ('.' ID)*;
```
Data type rules need to specify a primitive return type.
## Model