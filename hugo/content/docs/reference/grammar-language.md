---
title: "Grammar Language"
weight: 100
aliases:
  - /grammar-language
  - /docs/grammar-language
---

{{< toc format=html >}}

The grammar language describes the syntax and structure of your language. The [Langium grammar language](https://github.com/eclipse-langium/langium/blob/main/packages/langium/src/grammar/langium-grammar.langium) is implemented using Langium itself and therefore follows the same syntactic rules as any language created with Langium. The grammar language will define the structure of the *abstract syntax tree* (AST) which in Langium is a collection of *TypeScript types* describing the content of a parsed document and organized hierarchically. The individual nodes of the tree are then represented with JavaScript objects at runtime.

In the following, we describe the Langium syntax and document structure.

## Language Declaration

An *entry* Langium grammar file (i.e. a grammar which contains an [entry rule](#the-entry-rule)) always starts with a header which declares the name of the language. For example, a language named `MyLanguage` would be declared with:

```langium
grammar MyLanguage
```

Every grammar file has a `.langium` extension and the *entry grammar file* needs to be referenced in `langium-config.json`. If you used the [Yeoman generator](https://www.npmjs.com/package/generator-langium) to start your project, the configuration is already prepared.

### Import of other grammar languages
It is possible to reuse grammar rules from other `.langium` files by importing them into your own grammar file.
```langium
import './path/to/an/other/langium/grammar';
```
This will import **all grammar rules** from the imported grammar file. It is therefore crucial to ensure that there are no duplicate rules between the different grammar files.

Contrary to *entry grammars*, imported grammars do not need to start with the keyword `grammar`.

## Terminal Rules
The first step in parsing your language is *lexing*, which transforms a stream of characters into a stream of tokens. A token is a sequence of one or many characters which is matched by a *terminal rule*, creating an atomic symbol. The names of terminal rules are conventionally written in upper case. 

The Langium parser is created using [Chevrotain](https://github.com/chevrotain/chevrotain) which has a built-in lexer based on [Javascript Regular Expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions). 

Langium also allows the use of [Extended Backus-Naur Form (EBNF) Expressions](#extended-backus-naur-form-terminals) for terminals, but we *highly* recommend that you write your terminals using Regular Expressions instead. EBNF expressions are internally translated by langium into Regular Expressions, as they are intended to allow porting Xtext grammars into Langium grammars -- given their similarity.

With that said, both types of expressions can be used jointly in the same grammar.

The declaration of a terminal rule starts with the keyword `terminal`:
```langium
terminal ID: /[_a-zA-Z][\w_]*/;
```
Here, the token `ID` will match a stream of characters starting with the character `_`, a small letter, or a capital letter followed by a sequence of zero or many ([cardinality](#cardinalities) *) alphanumeric characters (`\w`) or `_`.

**The order in which terminal rules are defined is critical** as the lexer will always return the first match.

### Return Types
A terminal rule returns an instance of a _TypeScript primitive type_. If no return type is specified, the terminal rule will return a `string` by default. 
```langium
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

### Hidden Terminal Rules
The lexer tries to match every character in the document to a terminal rule or a keyword. It is therefore necessary to specify which characters or sequence of characters need to be ignored during lexing and parsing. Generally, you would want to ignore whitespaces and comments. This is achieved by adding the keyword `hidden` when defining a terminal rule. These *hidden terminal rules* are global and will be valid for all parser rules in the document.
```langium
hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
```

## Parser Rules
While [terminal rules](#terminal-rules) indicate to the lexer what sequence of characters are valid tokens, *parser rules* indicate to the parser what sequence of tokens are valid. Parser rules lay the structure of objects to be created by the parser and result in the creation of the *abstract syntax tree* (AST) which represents the syntactic structure of your language. In Langium, parser rules are also responsible for defining the type of objects to be parsed.

### Declaration
A parser rule always starts with the name of the rule followed by a colon.
```langium
Person:
    'person' name=ID;
```
In this example, the parser will create an object of type `Person`. This object will have a property `name` which value and type must match the terminal rule `ID` (i.e. the property `name` is of type `string` and cannot start with a digit or special character).

By default, the parser will create an object with an inferred type corresponding to the parser rule name. It is possible to override this behavior by explicitly defining the type of the object to be created. This is done by adding the keyword `returns` followed by a separately declared type, or the keyword `infers` followed by the name of the type to be inferred for this rule (more about this [in the next chapter](./semantic-model)):
```langium
Person infers OtherType:
    'person' name=ID;
```
The parser rule `Person` will now lead to the creation of objects of type `OtherType` instead of `Person`.

### The Entry Rule
The *entry rule* is a parser rule that defines the starting point of the parsing step. The *entry rule* starts with the keyword `entry` and matches other parser rules.
```langium
entry Model:
    (persons+=Person | greetings+=Greeting)*;
```
In this example, the *entry rule* `Model` defines a group of alternatives. The parser will go through the input document and try to parse `Person` or `Greeting` objects and add them to the `persons` or `greetings` arrays, respectively. The parser reads the token stream until all inputs have been consumed.

### Extended Backus-Naur Form Expressions
Parser rules are defined using *Extended Backus-Naur Form*-like (EBNF) expressions similar to the [Xtext](https://www.eclipse.org/Xtext/) notation.

#### Cardinalities
A cardinality defines the number of elements in a given set. Four different cardinalities can be defined for any expression:
1. exactly one (no operator)
2. zero or one (operator `?`)
3. zero or many (operator `*`)
4. one or many (operator `+`)

#### Groups
Expressions can be put in sequence specifying the order they have to appear:
```langium
Person:
    'person' name=ID address=Address;
```
In this example, the rule `Person` must start with the `person` keyword followed by an `ID` token and an instance of the `Address` rule.

#### Alternatives
It is possible to match one of multiple valid options by using the pipe operator `|`. The already mentioned `Model` example specifies to parse either `Person` or `Greeting`, zero or many times (cardinality *):
```langium
entry Model:
    (persons+=Person | greetings+=Greeting)*;
```

#### Keywords
Keywords are *inline terminals* which need to match a character sequence surrounded by single or double quotes, for example `'person'` or `"person"`. Keywords must not be empty and must not contain white space.

#### Assignments
Assignments define properties on the type returned by the surrounding rule.
There are three different ways to assign an expression (right side) to a property (left side).

1. `=` is used for assigning **a single value** to a property.
    ```langium
    Person:
        'person' name=ID
    ```
    Here, the property `name` will accept only one expression matching the terminal rule `ID`.

2. `+=` is used to assign **multiple values** to an array property.
    ```langium
    Contact:
        addresses+=STRING addresses+=STRING;
    ```
    Here, the array property `addresses` will accept two expressions matching the terminal rule `STRING`.

3. `?=` is used to assign a **value to a property of type boolean**. The value of the property of type `boolean` is set to `true` if the right part of the assignment is consumed by the parser.
    ```langium
    Employee:
        'employee' name=ID (remote?='remote')?
    ```
    Here the value of the property `remote` will be set to `true` if the keyword `remote` was successfully parsed as a part of the rule call. If the keyword `remote` is not consumed (cardinality is `?`), the property `remote` is set to `false`.

#### Cross-References
With Langium, you can declare *cross-references* directly in the grammar. A *cross-reference* allows to reference an object of a given type. The syntax is:
```langium
property=[Type:TOKEN]
```
The `property` will be a reference to an object of type `Type` identified by the token `TOKEN`. If the `TOKEN` is omitted, the parser will use the terminal or data type rule associated with the `name` assignment of the `Type` rule. If no such rule exists, then the token is mandatory.
```langium
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
but the following:
```
person Bob
Hello Sara !
```
will result in an error message since the cross reference resolution will fail because a `Person` object with the name 'Sara' has not been defined, even though 'Sara' is a valid `ID`.

#### Unassigned Rule Calls
Parser rules do not necessarily need to create an object, they can also refer to other parser rules which in turn will be responsible for returning the object.
For example, in the [Arithmetics example](https://github.com/eclipse-langium/langium/blob/main/examples/arithmetics/src/language-server/arithmetics.langium):
```langium
AbstractDefinition:
	Definition | DeclaredParameter;
```
The parser rule `AbstractDefinition` will not create an object of type AbstractDefinition. Instead, it calls either the `Definition` or `DeclaredParameter` parser rule which will be responsible for creating an object of a given type (or call other parser rules if they are unassigned rule calls themselves).

In contrast, an assigned rule call such as `parameter=DeclaredParameter` means that an object is created in the current parser rule and assigns the result of the `DeclaredParameter` parser rule to the specified property `parameter` of that object.

#### Unordered Groups

In regular groups, expressions must occur in the exact order they are declared.
```langium
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
```langium
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
```langium
interface TypeOne {
    name: string
}
RuleOne returns TypeOne:
    'keywordOne' name=ID | RuleTwo;

interface TypeTwo extends TypeOne {}
RuleTwo returns TypeTwo:
    'keywordTwo' name=ID;
```

A rule call is one of the ways to specify the return type. With more complex rules, the readability will be highly impacted. *Actions* allow to improve the readability of the grammar by explicitly defining the return type. Actions are declared inside of curly braces `{}`:

```langium
RuleOne returns TypeOne:
    'keywordOne' name=ID | {TypeTwo} 'keywordTwo' name=ID;
```

The example above requires that the return types `TypeOne` and `TypeTwo` are declared separately (see [the next chapter](./semantic-model)). If the type returned by the action is created on-the-fly, the keyword `infer` needs to be added:

```langium
RuleOne infers TypeOne:
    'keywordOne' name=ID | {infer TypeTwo} 'keywordTwo' name=ID;
```

Now both `TypeOne` and `TypeTwo` are inferred from the rule definition. Note that we use the keyword `infers` (declarative) for the grammar rule, but `infer` (imperative) for the action.

#### Tree-Rewriting Actions

The parser is built using [Chevrotain](https://github.com/chevrotain/chevrotain) which implements a LL(k) parsing algorithm (left-to-right). Conceptually, a LL(k) grammar cannot have rules containing left recursion.

Consider the following:

```langium
Addition:
    Addition '+' Addition | '(' Addition ')' | value=INT;
```
The parser rule `Addition` is left-recursive and will not be parseable. We can go around this issue by *left-factoring* the rule, *i.e.* by factoring out the common left-factor. We introduce a new rule `SimpleExpression`:
```langium
Addition:
    SimpleExpression ('+' right=SimpleExpression)*;

SimpleExpression:
    '(' Addition ')' | value=INT;
```
Unfortunately, *left-factoring* does not come without consequences and can lead to the generation of unwanted nodes. It is possible to "clean" the tree by using *tree-rewriting actions*.
```langium
Addition returns Expression:
    SimpleExpression ({Addition.left=current} '+' right=SimpleExpression)*;

SimpleExpression:
    '(' Addition ')' | value=INT;
```
Essentially this means that when a `+` keyword is found, a new object of type `Addition` is created and the current object is assigned to the `left` property of the new object. The `Addition` then becomes the new current object. In imperative pseudo code it may look like this:
```js
function Addition() {
    let current = SimpleExpression()
    while (nextToken == '+') {
        let newObject = new Addition
        newObject.left = current
        current = newObject
        current.right = SimpleExpression()
    }
}
```
Please refer to [this blog post](https://www.typefox.io/blog/parsing-expressions-with-xtext) for further details.

### Data Type Rules
Data type rules are similar to terminal rules as they match a sequence of characters. However, they are parser rules and are therefore context-dependent. This allows for more flexible parsing, as they can be interspersed with hidden terminals, such as whitespaces or comments. Contrary to terminal rules, they cannot use *regular expressions* to match a stream of characters, so they have to be composed of keywords, terminal rules or other data type rules.

The following example from the [domain model example](https://github.com/eclipse-langium/langium/blob/main/examples/domainmodel/src/language-server/domain-model.langium) uses the `QualifiedName` data type rule to enable references to other elements using their fully qualified name.
```langium
QualifiedName returns string:
    ID ('.' ID)*;
```
Data type rules need to specify a primitive return type.

### Rule Fragments
If you are facing repetitive patterns in your grammar definition, you can take advantage of *Rule Fragments* to improve the grammar's maintainability.
```langium
Student:
    'student' firstName=ID lastName=ID address=STRING phoneNumber=STRING grades=Grades;
Teacher:
    'teacher' firstName=ID lastName=ID address=STRING phoneNumber=STRING classes=Classes;
TechnicalStaff:
    'tech' firstName=ID lastName=ID address=STRING phoneNumber=STRING;
```
The parser rules Student, Teacher, and TechnicalStaff partly share the same syntax. 
If, for example, the assignment for `phoneNumber` had to be updated, we would need to make changes everywhere the `phoneNumber` assignment was used. 
We can introduce *Rule Fragments* to extract similar patterns and improve maintainability:
```langium
fragment Details:
    firstName=ID lastName=ID address=STRING phoneNumber=STRING;

Student:
    'student' Details grades=Grades;
Teacher:
    'teacher' Details classes=Classes;
TechnicalStaff:
    'tech' Details;
```

Fragment rules are not part of the AST and will therefore never create an object, instead they can be understood as being textually inserted where they are referenced.

### Guard Conditions
It may be useful to group parser rules with small variations inside of a single parser rule. Given the following example:
```langium
entry Model:
    element+=RootElement;

RootElement infers Element:
    isPublic?='public'?
    'element' name=ID '{'
        elements+=Element*
    '}';

Element:
    'element' name=ID '{'
        elements+=Element*
    '}';
```
The only difference between `RootElement` and `Element` is that the former has the boolean property `isPublic`. 
We can refactor the grammar so that only `Element` is present in the grammar with a *guard condition* that will determine which concrete syntax should be used by the parser:
```langium
entry Model:
    element+=Element<true>;

Element<isRoot>:
	(<isRoot> isPublic?='public')? 
	'element' name=ID '{'
		elements+=Element<false>*
	'}';
```
`Element` has the guard `isRoot`, which will determine whether the optional group containing the `isPublic` property is allowed to be parsed.

The *entry rule* `Model` sets the value of `isRoot` to `true` with `element+=Element<true>`, while `isRoot` is set to `false` inside of the `Element<isRoot>` parser rule with `elements+=Element<false>`.

In general, a guard condition on a group decides whether the parser is allowed to parse the group or not depending on the result of the evaluated condition. Logical operations can be applied, such as `&` (and), `|` (or) and `!` (not) to fine-tune the exact conditions in which the group is supposed to be parsed.

Additionally, guard conditions can also be used inside of alternatives. See the following example:
```langium
entry Model:
    element+=Element<true>;

Element<isRoot>:
	(<isRoot> 'root' | <!isRoot> 'element') name=ID '{'
		elements+=Element<false>*
	'}';
```

The parser will always exclude alternatives whose guard conditions evaluate to `false`. All other alternatives remain possible options for the parser to choose from.


### More Examples

Not all parser rules need to be mentioned in the entry rule, as shown in this example:
```langium
entry Model:
    (persons+=Person | greetings+=Greeting)*;

Person:
    'person' name=ID address=Address;

Greeting:
    'Hello' person=[Person] '!';

Address:
    street=STRING city=ID postcode=INT;
```
Here the `Person` parser rule includes a property `address` which matches the parser rule `Address`. We decided that an `Address` will never be present in the input document on its own and will always be parsed in relation to a `Person`. It is therefore not necessary to include an array of `Address` inside of the entry rule.

---

Keywords are meant to provide a visible structure to the language and guide the parser in deciding what type of object needs to be parsed.
Consider the following:
```langium
Student:
    name=ID;

Teacher:
    name=ID;

Person:
    Student | Teacher;
```
In this example, a `Person` can either be a `Student` or a `Teacher`. This grammar is ambiguous because the parser rules `Student` and `Teacher` are identical. The parser will not be able to differentiate between the parser rules for `Student` and `Teacher` when trying to parse a `Person`. 
Keywords can help removing such ambiguity and guide the parser in defining if a `Student` or `Teacher` needs to be parsed.
We can add a keyword to the parser rule `Student`, `Teacher`, or to both of them:
```langium
Student:
    'student' name=ID;

Teacher:
    'teacher' name=ID;

Person:
    Student | Teacher;
```
Now the ambiguity is resolved and the parser is able to differentiate between the two parser rules.

Parser rules can have many keywords:
```langium
Person:
    'person' name=ID 'age' age=INT;
```

---

If an assignment has a cardinality of `+` or `*`, then the expressions belong to a single group and must not be interrupted by other expressions.
```langium
Paragraph:
    'paragraph' (sentences+=STRING)+ id=INT;
```
Here, the property `sentences` will accept one or many expressions matching the terminal rule `STRING` followed by an `INT`. The parsing of a document containing:
```
paragraph "The expression group " 3 "was interrupted"
```
will throw an error since the `STRING` expressions are not continuous. It is however possible to interrupt and resume a sequence of expressions by using [hidden terminal symbols](#hidden-terminal-rules):
```
paragraph "expression one" /* comment */ "expression two" 3
```
The above example will be successfully parsed.

## More on Terminal Rules

### Extended Backus-Naur Form Terminals

*For full disclosure, we recommend using regular expressions when writing your terminals, as EBNF expressions are translated to regular expressions internally anyway. EBNF support is primarily intended for supporting grammars that were originally written in Xtext, but are being ported to Langium.*

As mentioned earlier, terminal rules can be described using *regular expressions* or *EBNF expressions*.

EBNF expressions are very similar to [parser rules](#extended-backus-naur-form-expressions), which are described above. In this section, we describe which EBNF expressions are supported for terminals and their equivalent in *Javascript Regular Expressions* where possible.

#### Terminal Groups
Tokens can be put in sequence specifying the order they have to appear:
```langium
terminal FLIGHT_NUMBER: ('A'..'Z')('A'..'Z')('0'..'9')('0'..'9')('0'..'9')('0'...'9')?;
```
In this example, the token `FLIGHT_NUMBER` must start with two capital letters followed by three or four digits.

#### Terminal Alternatives
It is possible to match one of multiple valid options by using the pipe operator `|`. The terminal rule `STRING` can use alternatives to match a sequence of characters between double quotes `""` or single quotes `''`:
```langium
terminal STRING: '"' !('"')* '"' | ''' !(''')* '''; 
```
In regular expression, alternatives are also possible with the pipe operator `|`:
```langium
terminal STRING: /"[^"]*"|'[^']*'/;
```

#### Character Range
The operator `..` is used to declare a character range. It is equivalent to the operator `-` within a character class in a regular expression. It matches any character in between the left character and the right character (inclusive on both ends).
```langium
terminal INT returns number: ('0'..'9')+;
```
is equivalent to the regular expression:
```langium
terminal INT returns number: /[0-9]+/;
```
Here, `INT` is matched to one or more characters (by using the operand `+`, which defines a [cardinality](#cardinalities) of 'one or many') between `0` and `9` (inclusive on both ends).

#### Wildcard Token
The operator `.` is used to match any character and is similar in regular expression.
```langium
terminal HASHTAG: '#'.+;
```
In this example, the terminal rule `HASHTAG` matches a sequence of character starting with `#` followed by one or many ([cardinality](#cardinalities) +) characters.

Equivalent in regular expression:
```langium
terminal HASHTAG: /#.+/;
```
#### Until Token
The operator `->` indicates that all characters should be consumed from the left token *until* the right token occurs. For example, the terminal rule for multi-line comment can be implemented as:
```langium
terminal ML_COMMENT: '/*' -> '*/';
```
Langium will transform the until token into the regular expression `[\s\S]*?` which matches any character non-greedily:
```langium
terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
``` 

#### Negated Token
It is possible to negate tokens using the operator `!`. In Langium this produces a *negative lookahead*. I.e., it does *not* consume tokens, but it is a 'guard' for what the following expression can recognize.

For example, if you want to recognize a word that doesn't start with `no`, then you could write such an expression in EBNF like so:
```langium
terminal NONO: (!'no')('a'..'z'|'A'..'Z')+;
```

For reference, this would correspond to the following regular expression:
```langium
terminal NONO: /(?!no)[a-zA-Z]+/;
```

Note, if you're coming from Xtext, negated tokens work differently here. In Xtext, negated tokens allow recognizing the *complement* of a set of characters (or anything 'but' what is listed in the negation), very much akin to a negated character class in regular expressions. This is *very* important to keep in mind if you're porting a grammar from Xtext, as Langium's interpretation of negated tokens deviates from that of Xtext.

#### Terminal Rule Calls
A terminal rule can include other terminal rules in its definition.
```langium
terminal DOUBLE returns number: INT '.' INT;
```
Note that it is easy to create conflicts between terminal rules when using *terminal rule calls*. See [Data Type Rules](#data-type-rules) for further details.

### Terminal Fragments
Fragments allow for sub-definition of terminal rules to be extracted. They are not consumed by the lexer and have to be consumed by other terminal rules.
```langium
terminal fragment CAPITAL_LETTER: ('A'..'Z');
terminal fragment SMALL_LETTER: ('a'..'z');
terminal NAME: CAPITAL_LETTER SMALL_LETTER+;
```
In this example, the lexer will not transform a single capital or small letter into a valid token but will match a sequence of one capital letter followed by one or many small letters.
