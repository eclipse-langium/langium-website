---
title: "Customizing the CLI"
weight: 2
aliases:
    - /tutorials/customizing_cli
---

{{< toc format=html >}}

In this tutorial, we'll be talking about customizing the command line interface for your language. We recommend reading through previous tutorials about [writing a grammar](/docs/learn/minilogo/writing_a_grammar) and [validation](/docs/learn/minilogo/validation). Once you have a good grasp on those concepts, then you should be all set for setting up a CLI. We will also continue to use the [MiniLogo](https://github.com/langium/langium-minilogo) language as a motivating example.

## Overview

Once you have a grammar and some validation in place, you may want to start configuring a basic CLI for your language. This is an important step where your language begins to become more accessible to other programs. Having a CLI for your language is a powerful way to access functionality that is expressed through Langium, but without having to interact directly with Langium. A well designed CLI can be used by other applications to provide advanced language features, without making those other applications unnecessarily complex.

## About the Command Line Interface

If you've been using a language built with the yeoman generator for Langium, you should be able to find your CLI defined in **src/cli/index.ts**. This file describes the general layout of your languages's command line interface, and lets you register specific commands. By default, you're provided with a single command for your CLI, the **generate** command.

Much like the command implies, it allows you to take a program written in your DSL, parse it, and traverse the AST to produce some sort of generated output. We won't talk about the generator itself in this tutorial (that will come in the [next tutorial on generation](/docs/learn/minilogo/generation)). Instead we'll focus on a simple example for parsing and validating a program, which allows learning more about the CLI itself.

## Adding a Parse and Validate Action

To start, let's write up a custom action to allow us to **parse** and **validate** a program in our language. If we've already written up a grammar, and already added some basic validation, then all we have to do is hookup the CLI action here to get this to work. This action will help us verify that our MiniLogo programs have no syntax errors, and also pass our custom validations.

Feel free to keep (or remove) the existing **generate** action, as we won't be setting that up until the next tutorial. We'll be sure to present example code for that as well, so don't worry about deleting functions that you'll need later.

In order to add our new command, we need to register it in the default export for the **index.ts** file. In this function, there's a **command** object, which is a collection of commands for our CLI. Let's call our command `parseAndValidate`, and give it some extra details, like:

- **arguments**: Indicating that it takes a single file
- a **description** detailing what this action does
- an **action** that performs the actual parsing and validation

We could also add additional options, but we won't be doing that for this action.

We can register our parse and validate action like so:

```ts
program
    .command('parseAndValidate')
    .argument('<file>', 'Source file to parse & validate (ending in ${fileExtensions})')
    .description('Indicates where a program parses & validates successfully, but produces no output code')
    .action(parseAndValidate) // we'll need to implement this function
```

Finally, we need to implement the `parseAndValidate` function itself. This will allow us to be able to parse & validate our programs, but without producing any output. We just want to know when our program is 'correct' by the constraints of our language implementation.

Using parts of the existing `generateAction` function we got by default, we can do our parsing & validation without having to write too much new code at all.

```ts
import { extractDocument } from './cli-util';
...
/**
 * Parse and validate a program written in our language.
 * Verifies that no lexer or parser errors occur.
 * Implicitly also checks for validation errors while extracting the document
 *
 * @param fileName Program to validate
 */
export const parseAndValidate = async (fileName: string): Promise<void> => {
    // retrieve the services for our language
    const services = createHelloWorldServices(NodeFileSystem).HelloWorld;
    // extract a document for our program
    const document = await extractDocument(fileName, services);
    // extract the parse result details
    const parseResult = document.parseResult;
    // verify no lexer, parser, or general diagnostic errors show up
    if (parseResult.lexerErrors.length === 0 && 
        parseResult.parserErrors.length === 0
    ) {
        console.log(chalk.green(`Parsed and validated ${fileName} successfully!`));
    } else {
        console.log(chalk.red(`Failed to parse and validate ${fileName}!`));
    }
};
```

Some amount of the contents for our custom action are shared with the `generateAction` function. This isn't surprising given that we still need to set up our language's services.

## Building and Running the CLI

Now that we have our new action in place, we'll want to build and verify the CLI works for a program written in our language.

If you've been following along from the hello world example produced by the yeoman generator, then you'll have some errors at this point that need to be corrected as follows.

If you have errors with regards to any imports of `HelloWorld...`, this is likely related to your `grammar NAME` in your langium file being something different than the original `HelloWorld`. The name of these imports will change based on your grammar file's name after `npm run langium:generate`, so in each case you should be able to change each import to `MyLanguage...` to resolve the issue.

You may also have build errors related to the generator logic, especially if it was written for the hello-world semantic model. For now, we can comment out the generator function's contents in **src/cli/generator.ts**, return an empty string, and comment/remove the imports to make TypeScript happy. In the next tutorial, we'll come back to it and implement an initial version of a generator for our language.

If you have any other errors while building, double check that the exported & imported names match up. More often than note there's a small discrepancy here, especially when you use a different language name than the default.

At this point, you should be able to run the following with no errors from the project root.

```bash
npm run langium:generate
npm run build
```

If everything looks good, you should have access to the CLI in **/bin/cli**. We also need a program we can test and validate. For the MiniLogo language we have a simple example program that we can validate:

```minilogo
def test() {
    pen(down)
    move(10,10)
    pen(up)
}

test()
```

We'll save this under our project root as **test.logo**, and we can test that it's correct using our CLI like so:

```bash
./bin/cli parseAndValidate test.logo
```
NOTE: The langium-minilogo repo places `test.logo` in an `examples` subdirectory under the project root. So, for that case, the CLI usage would be:
```bash
./bin/cli parseAndValidate examples/test.logo
```
It does not matter where you place your .logo files. Organize them as you see fit.

We should get an output indicating that there were no errors with our program.

> Parsed and validated test.logo successfully!

If you get a message that indicates you need to choose a file with a given extension, you'll want to go back and update your list of extensions in your **package.json** and your **langium-config.json** in your project root. Then you'll need to run `npm run langium:generate` followed by `npm run build` to get that change incorporated into your CLI.

If we wanted to verify that we *can* get errors, we can modify our program a bit to include a duplicate definition (which we should have a validation for, as we implemented in the validation tutorial).

```minilogo
def test() {
    pen(down)
    move(10,10)
    pen(up)
}

// redefinition of test, should 'not' validate
def test() {
    pen(up)
}

test()
```

Running the CLI again should show that this program has an error, and better yet it will show us exactly the error in question.

> There are validation errors:
>
> line 7: Def has non-unique name 'test'. [test]

This is perfect, as we didn't have to implement too much more logic to get validation in our CLI. Since we already hooked up our validation service before, the CLI just handles the interaction with an external program. This separation of concerns makes for a very flexible implementation that is easy to adapt over time.

That sums up how to add basic CLI functionality. [In the next tutorial, we will be talking about generation in more detail](/docs/learn/minilogo/generation), specifically about techniques that you can use to traverse your AST and produce a generated output.
