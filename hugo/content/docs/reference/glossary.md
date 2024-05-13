---
title: "Glossary"
weight: 50
---

Anyone who is new to DSL development should carefully read the following primer on the terms we are using in our documentation:

_abstract syntax tree_: A tree of elements that represents a text document. Each element is a simple JS object that combines multiple input tokens into a single object. Commonly abbreviated as _AST_.

_document_: An abstract term to refer to a text file on your file system or an open editor document in your IDE.

_grammar_: Defines the form of your language. In Langium, a grammar is also responsible for describing how the _AST_ is built.

_parser_: A program that takes a _document_ as its input and computes an _abstract syntax tree_ as its output.

_parser rule_: A parser rule describes how a certain _AST_ element is supposed to be parsed. This is done by invoking other _parser rules_ or _terminals_.

_terminal_: A terminal is the smallest parsable part of a document. It usually represents small pieces of text like names, numbers, keywords or comments.

_token_: A token is a substring of the _document_ that matches a certain _terminal_. It contains information about which kind of _terminal_ it represents as well as its location in the document.