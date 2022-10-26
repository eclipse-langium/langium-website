---
title: "Customizing the CLI"
weight: 2
draft: true
---

In this guide, we'll be talking about customizing the command line interface for your language. We recommend reading through previous guides about [writing your grammar](/guides/writing_a_grammar) and [validation](/guides/validation). Once you have a good grasp on those concepts, then you should be all set for setting up your CLI. We will also continue to use the [MiniLogo](https://github.com/langium/langium-minilogo) language as a motivating example in this guide.

## Overview

Once you have a grammar and some validation place, you may be wanting to start exploring how you can configure a basic CLI for your language. This is an important step where your language begins to become more accessible to other programs. Having a CLI for your language is a powerful way to access functionality that is contained within Langium, but without having to interact directly with Langium or any of its components directly. A well designed CLI can be used by other applications to provide advanced language features, without making those other applications unnecessarily complex.

## About the Command Line Interface

If you've been using the yeoman generator for Langium, you should be able to find your CLI defined in **src/cli/index.ts**. This file describes the general layout of your languages's command line interface, and lets you register specific commands. By default, you're provided with a single command for your CLI, the **generate** command. 

Much like the command implies, it allows you to take a program written in your DSL, parse it, and traverse the AST to produce some sort of generated output. We won't talk about the generator in this guide (that will come in the [next guide on generation](/guides/generation)), but we'll present a simple example for parsing and validating a program.

The most important takeway from the CLI is that it exposes language features to external applications, but abstracts away all the Langium-related functionality. External programs can utilize the CLI to enrich or add functionality that revolves around your languge. This is a great choice when you have an existing application that you would like to integrate your language into, but without having to integrate Langium (or Typescript) into the project directly.

## Adding a Parse and Validate Action

Let's write up a custom action to allow us to **parse** and **validate** a program in our language. If we've already written up a grammar, and already added some basic validation, then all we have to do is hookup the CLI action here to get this to work. This kind of action will help us verify that a program has no syntax errors, and also passes our additional validations.

Feel free to keep (or remove) the existing **generate** action, as we won't be setting that up until the next guide. We'll be sure to present example code for that as well, so don't worry about losing logic that you'll need to add later.

In order to add our new command, we need to register it in the default export for the **index.ts** file. In this function, there's a **command** object, which is really going to be a collection of commands for our CLI. Let's call our command `parseAndValidate`, and give it some extra details, like:

- **arguments**: Indicating that it takes a single file
- a **description** detailing what this action does
- an **action** that performs the actual parsing and validation

We can write this like so:

```ts
program
    .command('parseAndValidate')
    .argument('<file>', 'Source file to parse & validate (ending in ${fileExtensions})')
    .description('Indicates where a program parses & validates successfully, but produce no output code')
    .action(parseAndValidate) // we'll need to implement this function
```

Finally, we need to implement the `parseAndValidate` function. This will allow us to be able to parse & validate our programs, but without producing any output. We just want to know when our program is 'correct' by the constraints of our language implementation.

Using the existing `generateAction` function, we can effectively do our parsing & validation without having to write much new code at all.

```ts
import { extractDocument } from './cli-util';
...
/**
 * Parse and validate a program written in our language.
 * Verifies that no lexer or parser errors occur.
 * Also verifies that no 'Error' diagnostics are generated (such as for failed validation)
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

A good amount of the contents for our custom action are shared with a generator action function. This isn't surprising, given that we still need to set up the basic services for the LSP, and we still need to be able to extract the AST.

## Building and Running the CLI

Now that we have our new action in place, we'll want to build a the CLI, and verify that it works for a program written in our language.

If you've been following along from the hello world example produced by the yeoman generator, then you'll have some errors that we'll need to correct.

If you have errors with regards to any imports of `HelloWorld...`, this is likely related to your `grammar NAME` in your langium file being something different. The name of these imports will change based on your grammar file's name after `npm run langium:generate`, so in each case you should be able to change each import to `MyLanguage...` to resolve the issue.

You may also have build errors related to the generator logic, especially if it was written for the hello-world semantic model. For now, we can comment out the generator function's contents in **src/cli/generator.ts**, return an empty string, and comment/remove the imports to make TS happy. In the next guide, we'll come back to it and implement an initial version of a generator for our language.

At this point, you should be able to run the following with no errors from the project root.

```bash
npm run langium:generate
npm run build
```

If all looks good, we should have access to our cli in **/bin/cli**. We also need a program we can test and validate. For the MiniLogo language we have a simple example program that we can validate:

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

We should get an output indicating that there were no errors with our program.

> Parsed and validated test.logo successfully!

If you get a message that indicates you need to choose a file with a given extension, you'll want to go back and update your list of extensions in your **package.json** and your **langium-config.json** in your project root. Then you'll need to run `npm run langium:generate` followed by `npm run build` to get that change incorporated into your CLI.

If we wanted to verify that we *can* get errors, we can modify our program a bit to include a duplicate definition (which we should have a validation for, as we implemented in the validation guide).

```minilogo
def test() {
    pen(down)
    move(10,10)
    pen(up)
}

// redefinition of test, disallowed by our validation
def test() {
    pen(up)
}

test()
```

Running the cli again should show that this program has an error, and better yet it will show us exactly the error in question.

> There are validation errors:
>
> line 7: Def has non-unique name 'test'. [test]

This is perfect, as we didn't have to implement too much more logic to get validation in our CLI. Since we already did the work in our validation, the CLI just handles the interaction with an external program. This separation of concerns makes for a very flexible implementation that is easy to adapt over time.

That sums up how to add basic CLI functionality. [In the next guide, we will be talking about generation in more detail](/guides/generation), specifically about techniques that you can use to traverse your AST and produce a clean generated output.
