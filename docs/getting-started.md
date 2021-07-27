# Getting Started

Before diving into Langium itself, let's get your environment ready for development:

1. You have a working [Node environment](https://nodejs.org/en/download/) with version 12 or higher.
2. Install Yeoman and the Langium extension generator.
```bash
npm i -g yo generator-langium
```

For our getting started example, we would also recommend you to install the latest version of [vscode](https://code.visualstudio.com/).

## Your first example language

To create your first working DSL, execute the yeoman generator:

```bash
yo langium
```

Yeoman will prompt you with a few basic questions about your DSL:

1. _Extension name_: Will be used as the folder name of your extension and its `package.json`.
2. _Language name_: Will be used as the name of the grammar and as a prefix for some generated files and service classes.
3. _File extensions_: A comma separated list of file extensions for your DSL.

Afterwards, it will generate a new project and start installing all dependencies, including the `langium` framework as well as the `langium-cli` command line tool required for generating code based on your grammar definition.

After everything has successfully finished running, open your newly created Langium project with vscode via the UI (File > Open Folder...) or execute the following command, replacing `hello-world` with your chosen project name:

```bash
code hello-world
```

Press F5 or open the debug view and start the available debug configuration to launch the extension in a new _Extension Development Host_ window. Open a folder and create a file with your chosen file extension (`.hello` is the default). The `hello-world` language accepts two kinds of entities: The `person` and `Hello` entity. Here's a quick example on how to use them both:

```
person Alice
Hello Alice!

person Bob
Hello Bob!
```

The file `src/language-server/hello-world.langium` in your newly created project contains your grammar.

## Explaining the terms

If you're already familiar with the terms used in parsing or DSL frameworks, you can skip this short excursion and go straight to the next part. However, anyone who is new to DSL development should carefully read the following primer on the terms we are using in our documentation:

_abstract syntax tree_: A tree of elements that represents a text document. Each element is a simple JS object that combines multiple input tokens into a single object. Commonly abbreviated as _AST_.

_document_: An abstract term to refer to a text file on your file system or an open editor document in your IDE.

_grammar_: Defines the form of your language. In Langium, a grammar is also responsible for describing how the _AST_ is built.

_parser_: A program that takes a _document_ as its input and computes an _abstract syntax tree_ as its output.

_parser rule_: A parser rule describes how a certain _AST_ element is supposed to be parsed. This is done by invoking other _parser rules_ or _terminals_.

_terminal_: A terminal is the smallest parseable part of a document. It usually represents small pieces of text like names, numbers, keywords or comments.

_token_: A token is a substring of the _document_ that matches a certain _terminal_. It contains information about which kind of _terminal_ it represents as well as its location in the document.

For a full explanation of all terms we use throughout Langium, please refer to our [glossary](./glossary.md).

## Explaining the grammar

Here's the grammar that parses the previous text snippet:

```
grammar HelloWorld hidden(WS)

terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;

Model: (persons+=Person | greetings+=Greeting)*;

Person:
    'person' name=ID;

Greeting:
    'Hello' person=[Person] '!';
```

Let's go through this one by one:

```
grammar HelloWorld hidden(WS)
```

Before we tell Langium anything about our grammar contents, we first need to give it a name - in this case it's `HelloWorld`. The `langium-cli` will pick this up to prefix any generated classes with this name. Additionally we define here which terminals we want to hide from our parser. This will make more sense once we go to the next step.

```
terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w]*/;
```

Here we define our two needed terminals for this grammar: The whitespace `WS` and identifier `ID` terminals. Terminals parse a part of our document by matching it against their regular expression. The `WS` terminal parses any whitespace characters with the regex `/\s+/`. This allows us consume whitespaces in our document. As the terminal is referenced by the grammar as a hidden terminal, the parser will parse any whitespace and discard the results. That way, we don't have to care about how many whitespaces a user uses in their document. Secondly, we define our `ID` terminal. As per its regex, it parses any string that starts with an underscore or letter and continues with any amount of characters that match the `\w` regex token. It will match `Alice`, `_alice`, or `_al1c3` but not `4lice` or `#alice`. Langium is using the JS regex dialect for terminal definitions.

```
Model: (persons+=Person | greetings+=Greeting)*;
```

The `Model` parser rule is the entry point to our grammar. Parsing always starts with the entry rule. Here we define a repeating group of alternatives: `persons+=Person | greetings+=Greeting`. This will always try to parse either a `Person` or a `Greeting` and add it to the respective list of `persons` or `greetings` in the `Model` object. Since the alternative is wrapped in a repeating group `*`, the parser will continue until all input has been consumed. 

```
Person: 'person' name=ID;
```

The `Person` rule starts off with the `'person'` keyword. Keywords are like terminals, in the sense that they parse a part of the document. The set of keywords and terminals create the tokens that your language is able to parse. You can imagine that the `'person'` keyword here is like an indicator to tell the parser that an object of type `Person` should be parsed. After the keyword, we assign the `Person` a name by parsing an `ID`.

```
Greeting: 'Hello' person=[Person] '!';
```

Like the previous rule, the `Greeting` starts with a keyword. With the `person` assignment we introduce the _cross reference_, indicated by the brackets `[]`. A cross reference will allow your grammar to reference other elements that are contained in your file or workspace. By default, Langium will try to resolve this cross reference by parsing an `ID` and looking for a `Person` whose `name` property matches the parsed `ID`.

That finishes the short introduction to Langium! Feel free to play around with the grammar and use `npm run langium:generate` to regenerate the generated TypeScript files. You can continue with the [tutorials](./tutorials.md) or take a closer look at the [grammar](./features/grammar.md) and [abstract syntax tree](./features/ast.md) documentation.
