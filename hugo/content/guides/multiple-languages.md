---
title: "Multiple dependent languages"
weight: 400
---

This tutorial is about integrating multiple dependent languages in one Langium project.

One common situation were it makes sense to create dependent languages is when you only want to read concepts in one language and predefine them in another file (probably also a built-in one). Think of splitting SQL into a defining `CREATE TABLE table (...)`) and a reading part (`SELECT * FROM table`).

> Note, that for n independent languages can be simply made by creating n independent Langium projects.

## Our plan

The entire change touches several files. Let's summarize what needs to be done:

1. the **grammar** (the `*.langium` file) needs to be split into the three parts that were discussed above
2. the **Langium configuration** (the `langium-config.json` file in the Langium project root) needs to split the language configuration into thre new
3. the **`Djinject` module** of your language (`XXX-module.ts`) needs to create the new language services as well.
4. Last, but not least, you have to **cleanup all dependent files**. Here we can give general hints.
5. if you have a **VSCode extension**
    1. the `package.json` needs to be adapted
    2. the extension entry point file (`src/extension/main.ts`) needs to be changed slightly


## Our scenario

To keep this guide easy, I will use the `hello-world` project.

Let’s imagine to have three languages:

* the first language **defines** persons
* the second language **greets** persons of the first language
* the third language **configures** which person you are+

Just as a finger practice, let's require that you cannot greet yourself.

{{<mermaid>}}
flowchart
    Implementation -->|requires| Definition
    Configuration -->|requires| Definition
    Implementation -->|requires| Configuration
{{</mermaid>}}

### Grammar

The most relevant change might be in the grammar. Here is the original one.

```langium
grammar MultipleLanguages

entry Model:
    (persons+=Person | greetings+=Greeting)*;

Person:
    'person' name=ID;

Greeting:
    'Hello' person=[Person:ID] '!';

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/; 
```

Now, split it into three new files (let's call them units):

Our definition grammar:
```langium
grammar MultiDefinition

entry DefinitionUnit:
    (persons+=Person)*;

Person:
    'person' name=ID;

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
```

Our configuration grammar (note the import):
```langium
grammar MultiConfiguration

import "multiple-languages-definition";

entry ConfigurationUnit: 'I' 'am' who=[Person:ID] '.';
```

Our implementation grammar (note the imports again):
```langium
grammar MultiImplementation

import "multiple-languages-definition";

entry ImplementationUnit:
    (greetings+=Greeting)*;

Greeting:
    'Hello' person=[Person:ID] '!';
```

### Langium configuration

Splitting the grammar alone is not sufficient to generate anything using the CLI. You need to change the `langium-config.json` in the root folder as well. Let's make it happen!

The initial version of this file was:

```js
{
    "projectName": "MultipleLanguages",
    "languages": [{
        "id": "multiple-languages",
        "grammar": "src/language/multiple-languages.langium",
        "fileExtensions": [".hello"],
        "textMate": {
            "out": "syntaxes/multiple-languages.tmLanguage.json"
        },
        "monarch": {
            "out": "syntaxes/multiple-languages.monarch.ts"
        }
    }],
    "out": "src/language/generated"
}
```

The actual change is simple: Triple the object in the `languages` list and fill in reasonable values. Like here:

```js
{
    "projectName": "MultipleLanguages",
    "languages": [{
        "id": "multiple-languages-configuration",
        "grammar": "src/language/multiple-languages-configuration.langium",
        "fileExtensions": [".me"],
        "textMate": {
            "out": "syntaxes/multiple-languages-configuration.tmLanguage.json"
        },
        "monarch": {
            "out": "syntaxes/multiple-languages-configuration.monarch.ts"
        }
    }, {
        "id": "multiple-languages-definition",
        "grammar": "src/language/multiple-languages-definition.langium",
        "fileExtensions": [".who"],
        "textMate": {
            "out": "syntaxes/multiple-languages-definition.tmLanguage.json"
        },
        "monarch": {
            "out": "syntaxes/multiple-languages-definition.monarch.ts"
        }
    }, {
        "id": "multiple-languages-implementation",
        "grammar": "src/language/multiple-languages-implementation.langium",
        "fileExtensions": [".hello"],
        "textMate": {
            "out": "syntaxes/multiple-languages-implementation.tmLanguage.json"
        },
        "monarch": {
            "out": "syntaxes/multiple-languages-implementation.monarch.ts"
        }
    }],
    "out": "src/language/generated"
}
```

From now on you are able to run the Langium CLI using the NPM scripts (`npm run langium:generate`). It will generate one file for the abstract syntax tree (AST) containing all languages concepts (it is also a good idea to keep the names of these concepts disjoint).

For the next step you need to run the Langium generator once:

```sh
npm run langium:generate
```

### `Djinject` language module

The `Djinject` module describes how your language services are built.
After adding two more languages, some important classes get generated - which need to be registered properly.

1. Open the module file (`/src/language/multiple-languages-module.ts`).
2. You will notice a wrong import (which is ok, we renamed it in the previous steps and derived new classes by code generation).
3. Import the new generated modules instead.
   Replace this line:
   ```ts
   import { 
     MultipleLanguagesGeneratedModule, 
     MultipleLanguagesGeneratedSharedModule
   } from './generated/module.js';
   ```
   with the following:
   ```ts
   import {
     MultiConfigurationGeneratedModule,
     MultiDefinitionGeneratedModule,
     MultiImplementationGeneratedModule,
     MultipleLanguagesGeneratedSharedModule
   } from './generated/module.js';
   ```
4. In the function `createMultipleLanguagesServices` you will notice an error line now, because we deleted the old class name by the previous step. The code there needs basically be tripled. But before we do this, we need to define the new output type of `createMultipleLanguagesServices`. In the end this should lead to this definition:
    ```ts
    export function createMultipleLanguagesServices(context: DefaultSharedModuleContext): {
        shared: LangiumSharedServices,
        Configuration: MultipleLanguagesServices,
        Definition: MultipleLanguagesServices,
        Implementation: MultipleLanguagesServices
    } {
        const shared = inject(
            createDefaultSharedModule(context),
            MultipleLanguagesGeneratedSharedModule
        );
        const Configuration = inject(
            createDefaultModule({ shared }),
            MultiConfigurationGeneratedModule,
            MultipleLanguagesModule
        );
        const Definition = inject(
            createDefaultModule({ shared }),
            MultiDefinitionGeneratedModule,
            MultipleLanguagesModule
        );
        const Implementation = inject(
            createDefaultModule({ shared }),
            MultiImplementationGeneratedModule,
            MultipleLanguagesModule
        );
        shared.ServiceRegistry.register(Configuration);
        shared.ServiceRegistry.register(Definition);
        shared.ServiceRegistry.register(Implementation);
        registerValidationChecks(Configuration);
        registerValidationChecks(Definition);
        registerValidationChecks(Implementation);
        return { shared, Configuration, Definition, Implementation };
    }
    ```

After this step, Langium is set up correctly. But if you try to build now, the compiler will throw you some errors back, because old concepts are not existing anymore.

### Cleanup

Let's clean up the error lines. Here are some general hints:

* keep in mind, that you are dealing with three file types now, namely `*.me`, `*.who` and `*.hello`
    * you can distinguish them very easy by selecting the right sub service from the result object of `createMultipleLanguagesServices`, which is either `Configuration`, `Definition` or `Implementation`
    * all these services have a sub service with file extensions: `*.LanguageMetaData.fileExtensions: string[]`
    * so, when you are obtaining any documents from the `DocumentBuilder` youu can be sure that they are parsed by the right language service
    * to distinguish them, use the AST functions for the root, for example for the Configuration language: `isConfigurationUnit(document.parseResult.value)`

### VSCode extension



### FINISHED!

## Troubleshooting

In this section we will list common mistakes.

* ???

If you encounter any problems, we are happy to help in our discussions page or our issue tracker.
