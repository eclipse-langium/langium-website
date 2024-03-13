---
title: "Keywords as Identifiers"
weight: 300
---

When your language uses keywords, which is the usual case, e.g. `var` or `function` keywords in programming languages, all occurrances of these strings are treated as keyword tokens.
That means, that these strings are marked like keywords (in blue in this tutorial, while other text is white/black) whenever they are used. In particular, these keywords cannot be used as values for names, identifiers or other properties.

To keep this tutorial short, let's look at the "hello-world" example, in the [playground](https://langium.org/playground?grammar=OYJwhgthYgBAEgUwDbIPYHU0mQEwFD6IB2ALiAJ6wCyauKAXPrC7ABQAOiIAzmsTwDUAXgAK3PsVgAfWKESJSAS2LAhwgOIgFy1QEoAVAG5C43vyatYAci7ni12MUiJhASQAiJ-Fp0rglqzWSKhojnaSwgDaZpIMngC6NgCE1t4AFkq49FKk3BAqYMiwGADKDLAA9AA6QpUmeSAFzsWeFZVRAPpgALQAXgCCPQBaCVHVAO6dCQb1hJnZJLCNzUU0ADKdAMIA8tTUAKIAcgAq7dU1BuM81aUzAPzVBhdzCznL%2BYXFpZu7%2B8dnKoXC5RAB61WI1RAMzmQA&content=A4UwTgzg9gdgBAKQIYxAKABIgDbaolEAQjTVElji1yjSA) or as a new local project created with `yo langium` (for details, how to set up your first Langium project, read [getting started](/docs/getting-started/)):

![screenshot with the editor, an example and an error message](problem.png)

Here, it is not possible to introduce a person whose name is "Hello", since `Hello` is a dedicated keyword of the language. Additionally, we cannot greet a person called "Hello" as well.
The same counts for the keyword "person", but in this tutorial, we focus on enabling "Hello" as name for persons. Afterwards, you will be able to add support for "person" as name by your own.

To enable keywords as identifiers, you need to apply the following three steps:

1. Tweak the grammar to explicitly parse keywords as property values.
2. Change the semantic type of the resulting token.
3. Ensure, that your editor supports styles for the chosen semantic type.


The __first step__ is to tweak the grammar to explicitly parse keywords as property values:
At the moment, the parser rule for introducing persons looks like this:

```langium
Person: 'person' name=ID;
terminal ID: /[_a-zA-Z][\w_]*/;
```

Note, that the terminal rule for `ID` already includes the string "Hello",
but since the parser rule for greeting persons uses "Hello" as keyword, the keyword wins:

```langium
Greeting: 'Hello' person=[Person:ID] '!';
```

In order to explicitly enable parsing "Hello" as name as well, tweak the parser rule for persons in this way:

```langium
Person: 'person' name=(ID | 'Hello');
terminal ID: /[_a-zA-Z][\w_]*/; // this terminal rule is unchanged!
```

Now Langium knows, that "Hello" not always indicates the keyword of the greeting parser rule, but can also be used as alternative value for the `name` property of the parser rule for persons.
That's it! (Don't forget to run `npm run langium:generate` after updating the grammar.)

![screenshot with fixed grammar](fixed-1-grammar.png)

Since the `name` property is used for cross-references by the parser rule for greetings, "Hello" needs to be supported here as well. For that, we recommend to introduce a [data type rule](/docs/grammar-language/#data-type-rules) like "PersonID" in the example, since it makes it easier to support more keywords in the future:

```langium
Person: 'person' name=PersonID;

Greeting: 'Hello' person=[Person:PersonID] '!';

PersonID returns string: ID | 'Hello';
```


As you can see, Langium accepts "Hello" as value for person's names now.
Nevertheless, the name "Hello" still is marked in blue and looks like a keyword "Hello". This leads us to the second step.


The __second step__ is to change the semantic type of the resulting token:
In the token stream, a token called "Hello" now is supported by the grammar to be used for the `name` property, but it is marked as a keyword token (TODO überprüfen), due to the parser rule for greetings.
Therefore, we need to change the semantic type of this token.

In Langium, the `SemanticTokenProvider` service is capable for doing this.
Therefore, we need to customize the default semantic token provider like this:

```ts
import { AbstractSemanticTokenProvider, AstNode, SemanticTokenAcceptor } from "langium";
import { isPerson } from "./generated/ast.js";
import { SemanticTokenTypes } from 'vscode-languageserver';

export class HelloWorldSemanticTokenProvider extends AbstractSemanticTokenProvider {
	protected override highlightElement(node: AstNode, acceptor: SemanticTokenAcceptor): void | "prune" | undefined {
		if (isPerson(node)) {
			acceptor({
				node,
				property: 'name',
				type: SemanticTokenTypes.class
			});
		}
	}
}
``````

For all persons (`isPerson(...)` in line 7), we explicitly specify the semantic type for the token of their `'name'` properties.
Here, we use `SemanticTokenTypes.class` as semantic type.
For your case, select a predefined type which fits your domain best.

After creating the semantic token provider, you need to register the `HelloWorldSemanticTokenProvider` in `hello-world-module.ts` in the following way:

```ts
export const HelloWorldModule: Module<HelloWorldServices, PartialLangiumServices & HelloWorldAddedServices> = {
    lsp: {
        SemanticTokenProvider: (services) => new HelloWorldSemanticTokenProvider(services)
    },
    validation: {
        HelloWorldValidator: () => new HelloWorldValidator()
    }
};
```

Now rebuild and restart your application and test the improvements of the second step:

![screenshot with fixed semantic token](fixed-2-token.png)

The `HelloWorldSemanticTokenProvider` works, but you might see or might not see any difference, e.g. "Hello" is still blue here. This leads us to the third step.

The __third step__ is to ensure, that your editor supports semantic tokens:
Depending on your editor and the currently selected color theme, the semantic token type selected in `HelloWorldSemanticTokenProvider` might not be supported and didn't got a different color in the color theme.
The easiest way to detect this possible problem is to change the current color theme and to try some others.

After switching from "Dark (Visual Studio)" to "Dark Modern" in VS Code, the example looks as expected.
You can switch the current color theme in VS Code with `cmd + K` `cmd + T` (or via the menu: Code -> Settings... -> Theme -> Color Theme).

![screenshot with supporting color theme](fixed-3-style-2.png)

"Hello" is marked in purple, when it is used as keyword, and in green, when it is used as value for the name of a person.
As another solution is to select another semantic type for your token in step two.
A more elaborate solution is to create your own color theme and to ship it with your VS Code extension of your DSL.

While __step one__ is mandatory to enable keywords as values in general,
__step two__ improves the user experience of your DSL.
While step one and step two can be handled in the LSP server once for your DSL, __step three__ highly depends on your editor and its color themes (in the LSP clients), which makes step three quite complicated to handle.

Note, that in [multi-grammar projects](/guides/multiple-languages.md), only keywords of the included grammars are affected by this general problem, not keywords of other languages.

Now you know, how to technically enable keywords as regular values for properties.
As "home work", it is your task to enable the keyword "person" as name for persons in the example.
Whether it makes sense to support keywords as values at all in your DSL is up to you to discuss with the users of your DSL!
