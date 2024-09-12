---
title: "7. Generate artifacts"
weight: 800
---
The syntax was ensured. The semantics were checked. Your workspace is free of errors. Now the AST is a valid representation of your input file written in your language. It is time to generate some cool stuff!

Depending on your domain and on your requirements there are different ways to generate artifacts from your AST.

## How to write the generator?

The simplest way is to generate text into a string. Let's print out every greeting from the `hello-world` example.

```typescript
import type { Model } from '../language/generated/ast.js';

export function generateJavaScript(model: Model): string {
    return `"use strict";
${model.greetings
    .map(greeting => `console.log('Hello, ${greeting.person.ref?.name}!');`)
    .join("\n")
}`;
}
```

## How to test the generator?

You can test the generator by comparing the generated text with the expected text. Here is an example.

```typescript
import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import { createHelloWorldServices } from "./your-project/hello-world-module.js";
import { Model } from "./your-project/generated/ast.js";
import { generateJavaScript } from "./your-project/generator.js";

//arrange
const services = createHelloWorldServices(EmptyFileSystem);
const parse = parseHelper<Model>(services.HelloWorld);
const document = await parse(`
    person Langium
    Hello Langium!
`, {validation: true});
expect(document.parseResult.lexerErrors).toHaveLength(0);
expect(document.parseResult.parserErrors).toHaveLength(0);
expect(document.diagnostics ?? []).toHaveLength(0);

//act
const javaScript = generateJavaScript(document.parseResult.value);

//assert
expect(javaScript).toBe(`"use strict";
console.log('Hello, Langium!');`);
```

The `expect` function can be any assertion library you like. The `Hello world` example uses Vitest.
