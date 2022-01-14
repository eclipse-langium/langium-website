---
title: "The Grammar Language"
---
The grammar language describes the syntax and structure of your language. The [Langium grammar language](https://github.com/langium/langium/blob/main/packages/langium/src/grammar/langium-grammar.langium) is implemented using Langium itself and therefore follows the same syntactic rules as any language created with Langium. The grammar language will define the structure of the *abstract syntax tree* (AST) which in Langium is a collection of Javascript objects describing their properties and how they are linked to each other.

In the following, we describe the Langium syntax and document structure.
## Language Declaration
A Langium grammar file always starts with a header which declares the name of the language.  For example, a language named `MyLanguage` would be declared with:

```
grammar MyLanguage
```
Note that this is not the case for grammar files that are meant to be reused by other grammar files. In this case, the `grammar` declaration can be omitted.

Every grammar file has a `.langium` extension and needs to be referenced in `langium-config.json`. If you used the `langium-generator` to start your project then your language was automatically referenced in `langium-config.json`.

### Import of other grammar languages
It is possible to reuse grammar rules from other `.langium` files by importing them into your own grammar file.
```
import 'path/to/an/other/langium/grammar';
```
This will import **all grammar rules** from the imported grammar file. It is therefore crucial to ensure that there are no duplicate rules between the different grammar files.

## Terminal Rules
The first step in parsing your language, *lexing*, transforms a stream of characters into a stream of tokens. Tokens are a sequence of one or many characters which is matched by a *terminal rule*, creating a atomic symbols. The names of terminal rules are conventionally written in upper case. 

The Langium parser is created using [Chevrotain](https://github.com/chevrotain/chevrotain) which has a built-in lexer based on *Javascript Regular Expressions*. However, Langium allows the use of [Extended Backus-Naur Form Expressions](#extended-backus-naur-form-expressions) and both expressions can be used conjointly in the same grammar. 

The declaration of a terminal rule starts with the keyword `terminal`:
```
terminal ID: /[_a-zA-Z][\w_]*/;
```
Here, the token `ID` will match a stream of character starting with the character '\_', a small letter, or a capital letter followed by sequence of zero or many ([cardinality](#cardinalities) *) alphanumeric characters ('\w') or '\_'.

**The order in which terminal rules are defined is critical** as the lexer will always return the first match.

### Return Types
A terminal rule returns an instance of a `Typescript primitive type`. If no return type is specified then the terminal rule will return a `string` by default. 
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
- `Date`

### Extended Backus-Naur Form Expressions
Terminal rules can be described using *regular expressions* or *Extended Backus-Naur Form*-like (EBNF) expressions similar to the [Xtext](https://www.eclipse.org/Xtext/) notation. In this section, we describe which EBNF expressions are supported in Langium and their equivalent in *Javascript Regular Expressions* where possible.

#### Cardinalities
A cardinality defines the number of elements in a given set. Four different cardinalities can be defined for any expression:
1. exactly one (no operator)
2. zero or one (operator `?`)
3. zero or many (operator `*`)
4. one or many (operator `+`)

#### Character Range
The operator `..` is used to declare a character range. It is equivalent to the operator `-` in regular expression. It matches any character in between the left character and the right character (inclusive on both ends).
```
terminal INT returns number: ('0'..'9')+;
```
is equivalent to the regular expression:
```
terminal INT returns number: /[0-9]+/;
```
Here, `INT` is matched to one or more characters (by using the operand `+`, which defines a [cardinality](#cardinalities) of 'one or many') between `0` and `9` (inclusive on both ends).

#### Wildcard
The operator `.` is used to match any character and is similar in regular expression.
```
terminal HASHTAG: '#'.+;
```
In this example, the terminal rule `HASHTAG` matches a sequence of character starting with `#` followed by one or many ([cardinality](#cardinalities) +) characters.

Equivalent in regular expression:
```
terminal HASHTAG: /#.+/;
```
#### Until Token
The operator `->` indicates that all characters should be consumed from the left token *until* the right token occurs. For example, the terminal rule for multi-line comment can be implemented as:
```
terminal ML_COMMENT: '/*' -> '*/';
```
There is no direct equivalent in regular expression for the until token.

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
It is possible to match several valid options. The terminal rule `STRING` can use alternatives to match a sequence of characters between double quotes `""` or single quotes `''`:
```
terminal STRING: /"[^"]*"|'[^']*'/;
```

#### Groups
Tokens can be put in sequence specifying the order they have to appear
```
terminal FLIGHT_NUMBER: ('A'..'Z')('A'..'Z')('0'..'9')('0'..'9')('0'..'9')('0'...'9')?;
```
In this example, the token `FLIGHT_NUMBER` **must** start with two capital letters and followed by three of four digits.

### Terminal Fragments
Fragments allow for sub-definition of terminal rules to be extracted. They are not consumed by the lexer and have to be consumed by other terminal rules.
```
terminal fragment CAPITAL_LETTER: ('A'..'Z');
terminal fragment SMALL_LETTER: ('a'..'z');
terminal NAME: CAPITAL_LETTER SMALL_LETTER+;
```
In this example, the lexer will not transform a single capital or small letter into a valid token but will match a sequence of one capital letter followed by one or many small letters.

### Hidden Terminal Rules
The parser tries to match every character in the document to a terminal rules. It is therefore necessary to specify which characters or sequence of characters need to be ignored during parsing. Generally, you would want to ignore whitespaces and comments. This is achieved by adding the keyword `hidden` in front of the keyword `terminal` when defining a *terminal rule*. These *hidden terminal rules* are global and will be valid for all parser rules in the document.
```
hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
```

## Parser Rules
While [terminal rules](#terminal-rules) indicate to the lexer what sequence of characters are valid tokens, *parser rules* indicate to the parser what sequence of tokens are valid. Parser rules lay the structure of objects to be created by the parser and result in the creation of the *abstract syntax tree* which represents the syntactic structure of your language. In Langium, parser rules are also responsible for defining the type of objects to be parsed.

### Extended Backus-Naur Form Expressions
Parser rules have access to a more restricted set of EBNF expressions compared to terminal rules. Parser and terminal rules share the following expressions:
- Groups
- Alternatives
- Keywords
- Rule calls

Parser rules also have their own expressions as described below.

#### Declaration
A parser rule always starts with the name of the rule followed by an optional return type. If no return type is specified, the parser assumes that the object to be created has the type of the parser rule's name.
```
Person:
    'person' name=ID;
``` 
In this example, the parser will create an object of type `Person`. This object will have a property `name` which value and type must match the terminal rule `ID` (i.e. the property `name` is of type `string` and cannot start with a digit or special character).

#### Keywords
Keywords are meant to guide the parser in defining what type of object needs to be parsed.
A keyword must match the regular expression `/\^?[_a-zA-Z][\w_]*/` and appear in the grammar file between single quotes `''`.

Consider the following:
```
Person:
    name=ID;

City:
    name=ID;
```
The parser will not be able to differentiate between the parsing of `Person` or `City` if it encounters a token matching the terminal rule `ID`. We can include *keywords* to remove the ambiguity:
```
Person:
    'person' name=ID;

City:
    'city' name=ID;
```
Now the parser is able to differentiate between the two parser rules and will successfully parse objects of type `Person` and `City`.

Parser rules can have many keywords:
```
Person:
    'person' name=ID 'age' age=INT;
```

#### Assignments
There are three different ways to assign an expression (right side) to a property (left side).

1. `=` is used for assigning **only one element** to a property
    ```
    Person:
        'person' name=ID
    ```
    Here, the property `name` will accept only one expression matching the terminal rule `ID`.

2. `+=` is used to assign **multiple expressions** to a list property
    ```
    Paragraph:
        'paragraph' (sentences+=STRING)+;
    ```
    Here, the property `sentences` will accept one or many expressions matching the terminal rule `STRING`. The expressions belong to a single group and must not be interrupted by other expressions. The parsing of a document containing:
    ```
    paragraph "The expression group " 3 "was interrupted"
    ```
    will throw an error since the `STRING` expressions are not continuous. It is however possible to interrupt and resume a sequence of expressions by using [hidden terminal symbols](#hidden-terminal-symbols):
    ```
    paragraph "expression one" /* comment */ "expression two"
    ```
    The above example will be successfully parsed.

3. `?=` is used to assign a **value to a property of type boolean**. The value of the property of type `boolean` is set to `true` if the right part of the assignment is consumed by the parser.
    ```
    Employee:
        'employee' name=ID (remote?='remote')?
    ```
    Here the value of the property `remote` will be set to true if the keyword `remote` appears in the document.

#### Cross-reference
With Langium, you can declare *cross-references* directly in the grammar. *Cross-reference* allows to reference an object of a given type. The syntax is:
```
property=[Type:TOKEN]
```
The `property` will be a reference to an object of type `Type` identified by the token `TOKEN`. If the `TOKEN` is omitted, the parser assumes that it is matching the terminal rule `ID`.
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
In the above example, we rely on a *rule call* to specify the return type. With more complex rules, the readability will be highly impacted. *Actions* allow to improve the readability of the grammar by explicitly defining the return type. *Actions* are declared inside of curly brackets `{}`:
```
RuleName returns TypeOne:
    'keywordOne' name=ID | 'keywordTwo' {TypeTwo} name=ID;
```

#### Unassigned Rule Calls
Parser rules do not necessarily need to return an object, they can also refer to other parser rules which in turn will be responsible for returning the object.
For example, in the [Arithmetics example](https://github.com/langium/langium/blob/main/examples/arithmetics/src/language-server/arithmetics.langium):
```
AbstractDefinition:
	Definition | DeclaredParameter;
```
The parser rule `AbstractDefinition` will not create an object of type AbstractDefinition. Instead, it calls either the `Definition` or `DeclaredParameter` parser rule which will be responsible for creating an object of a given type (or call other parser rules if they are unassigned rule calls themselves). 

#### Assigned Actions
The parser is built using [Chevrotain](https://github.com/chevrotain/chevrotain) which implements a LL(k) parsing algorithm (left-to-right). By definition, a LL(k) grammar cannot have rules containing left recursion.

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

[NOTE] I left out the part regarding `tree rewrite actions` as I think it could be part of a more advanced documentation part on the AST/CST. I can add it if we think it belongs here.

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

## The Entry Rule
The *entry rule* is a parser rule that defines the starting point of the parsing step. The *entry rule* starts with the keyword `entry` and matches other parser rules.
 ```
 entry Model:
    (persons+=Person | greetings+=Greeting)*;
 ```
In this example, the *entry rule* `Model` defines a group of alternatives. The parser will go through the input document and try to parse a `Person` or a `Greeting` object and add it to the array `persons` or `greetings`, respectively. Thanks to the grouping and the cardinality of zero or many (`*`), the parser will go through the document until all inputs have been consumed.

Not all parser rules need to be registered in the parser rule.
```
entry Model:
    (persons+=Person | greetings+=Greeting)*;

Person:
    'person' name=ID address=Address;

Greeting:
    'Hello' person=[Person] '!';

Address:
    street=STRING city=ID postcode=INT;
```
We expended the `Person` parser rule to include a property `address` which matches the parser rule `Address`. We decided that an `Address` will never be present in the input document on its own and will always be parsed in relation to a `Person`. It is therefore not necessary to include an array of `Address` inside of the entry rule.