---
title: 'Glossary'
weight: 800
---

This glossary serves as a short introduction to common terms and concepts used throughout Langium.

## Models

<a name="#meta_model">[_Meta Model_](#meta_model)</a>: The meta model consists of types and interfaces which describe the shape of your domain model. You can either describe your meta model explicitly or let Langium generate it based on your grammar definition. See [here](/docs/ast-types) for more info on types.

<a name="#ast">[_Abstract Syntax Tree_](#ast)</a>: Commonly abbreviated as _AST_. The AST is an instance of your meta model for a single [_document_](#document).

## Workspace

<a name="#document">[_Document_](#document)</a>: An abstract term to refer to a text file on your file system or an open editor document in your IDE.

<a name="#workspace">[_Workspace_](#workspace)</a>:

<a name="#cross_reference">[_Cross Reference_](#cross_reference)</a>: 

<a name="#scope">[_Scope_](#scope)</a>:

<a name="#scoping">[_Scoping_](#scoping)</a>:

<a name="#index">[_Index_](#index)</a>:

## Parsers

<a name="#grammar">[_Grammar_](#grammar)</a>: Defines the form of your language. In Langium, a grammar is also responsible for describing how the _AST_ is built. See [here](/docs/grammar-language/) for more info on the grammar language.

<a name="#terminal">[_Terminal_](#terminal)</a>: A terminal is the smallest parseable part of a document. It usually represents small pieces of text like names, numbers, keywords or comments. Terminals always return a primitive type. Available primitives in Langium are `number`, `string`, `boolean`, `date` and `bigint`.

<a name="#token">[Token](#token)</a>: A token is a substring of the _document_ that matches a certain [_terminal_](#terminal). It contains information about which kind of _terminals_ it represents as well as its location in the document.

<a name="#parser">[_Parser_](#parser)</a>: A computer science term for a program that takes a [_document_](#document) as its input and computes an [_abstract syntax tree_](#ast) as its output. Langium uses the [Chevrotain](https://chevrotain.io/docs/) library for any parsing tasks.

<a name="#parser_rule">[_Parser Rule_](#parser_rule)</a>: A parser rule describes how a certain [_AST_](#ast) element is supposed to be parsed. This is done by invoking other _parser rules_ or [_terminals_](#terminal).

<a name="#data_type_rule">[_Data Type Rule_](#data_type_rule)</a>: A data type rule is a special parser rule which gets transformed into a primitive data type. When parsing complex primitives, such as fully qualified names, using terminals is often not feasible. For these cases, data type rules should be used.

## Editors

<a name="#lsp">[_Language Server Protocol_](#lsp)</a>:

<a name="#syntax_highlighting">[_Syntax Highlighting_](#syntax_highlighting)</a>: 

<a name="#semantic_highlighting">[_Semantic Highlighting_](#semantic_highlighting)</a>:

<a name="#code_actions">[_Code Actions_](#code_actions)</a>: Also known as quick fixes. Code actions allow users to automatically resolve issues in their workspace. 

<a name="#completion">[_Code Completion_](#completion)</a>:

<a name="#validation">[_Diagnostics_](#validation)</a>: Also known as validations.

