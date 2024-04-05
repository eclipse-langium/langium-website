---
title: "Scaffold a Langium project"
weight: 300
url: /docs/learn/worflow/scaffold
---

To create your first working DSL, execute the Yeoman generator:

```bash
> yo langium 
┌─────┐ ─┐
┌───┐    │  ╶─╮ ┌─╮ ╭─╮ ╷ ╷ ╷ ┌─┬─╮
│ ,´     │  ╭─┤ │ │ │ │ │ │ │ │ │ │
│╱       ╰─ ╰─┘ ╵ ╵ ╰─┤ ╵ ╰─╯ ╵ ╵ ╵
`                   ╶─╯

Welcome to Langium! This tool generates a VS Code extension with a "Hello World" language
 to get started quickly. The extension name is an identifier used in the extension 
marketplace or package registry.
❓ Your extension name: hello-world
The language name is used to identify your language in VS Code. Please provide a name to 
be shown in the UI. CamelCase and kebab-case variants will be created and used in 
different parts of the extension and language server.
❓ Your language name: Hello World
Source files of your language are identified by their file name extension. You can 
specify multiple file extensions separated by commas.
❓ File extensions: .hello
Your language can be run inside of a VSCode extension.
❓ Include VSCode extension? Yes
You can add CLI to your language.
❓ Include CLI? Yes
You can run the language server in your web browser.
❓ Include Web worker? Yes
You can add the setup for language tests using Vitest.
❓ Include language tests? Yes
```

Yeoman will prompt you with a few basic questions about your DSL:

1. _Extension name_: Will be used as the folder name of your extension and its `package.json`.
2. _Language name_: Will be used as the name of the grammar and as a prefix for some generated files and service classes.
3. _File extensions_: A comma separated list of file extensions for your DSL.

The following questions are about the project parts you want to include in your project:

* _VS Code extension_: will be used to run your language inside of a VS Code extension.
* _CLI_: will add a CLI to your language.
* _Web worker_: will add the setup for running the language server in your web browser.
* _Language tests_: will add the setup for language tests.

Afterwards, it will generate a new project and start installing all dependencies, including the `langium` framework as well as the `langium-cli` command line tool required for generating code based on your grammar definition.

After everything has successfully finished running, open your newly created Langium project with vscode via the UI (File > Open Folder...) or execute the following command, replacing `hello-world` with your chosen project name:

```bash
code hello-world
```

## Sneak peek using the VS Code extension

Press `F5` or open the debug view and start the available debug configuration to launch the extension in a new _Extension Development Host_ window. Open a folder and create a file with your chosen file extension (`.hello` is the default). The `hello-world` language accepts two kinds of entities: The `person` and `Hello` entity. Here's a quick example on how to use them both:

```text
person Alice
Hello Alice!

person Bob
Hello Bob!
```

The file `src/language/hello-world.langium` in your newly created project contains your grammar.
