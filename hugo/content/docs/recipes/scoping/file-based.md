---
title: "File-based scoping"
weight: 300
---

## Goal

By default, Langium will always expose all top-level AST elements to the global scope. That means they are visible to all other documents in your workspace. However, a lot of languages are better served with a JavaScript-like `import`/`export` mechanism:

* Using `export` makes a symbol from the current file available for referencing from another file.
* Using `import` allows to reference symbols for a different file.

To make things easier I will modify the "Hello World" example from the [learning section](/docs/learn/workflow).

## Step 1: Change the grammar

First off, we are changing the grammar to support the `export` and the `import` statements. Let's take a look at the modified grammar:

```langium
grammar HelloWorld

entry Model:
    (
        fileImports+=FileImport  //NEW: imports per file
        | persons+=Person
        | greetings+=Greeting
    )*;

FileImport: //NEW: imports of the same file are gathered in a list
    'import' '{' 
        personImports+=PersonImport (',' personImports+=PersonImport)* 
    '}' 'from' file=STRING; 

PersonImport:
    person=[Person:ID] ('as' name=ID)?;

Person:
    published?='export'? 'person' name=ID; //NEW: export keyword

type Greetable = PersonImport | Person

Greeting:
    'Hello' person=[Greetable:ID] '!';

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
```

After changing the grammar you need to regenerate the abstract syntax tree (AST) and the language infrastructure. You can do that by running the following command:

```bash
npm run langium:generate
```

## Step 2: Exporting persons to the global scope

The index manager shall get all persons that are marked with the export keyword. In Langium this is done by overriding the `ScopeComputation.getExports(…)` function. Here is the implementation:

```typescript
export class HelloWorldScopeComputation extends DefaultScopeComputation {
    override async computeExports(document: LangiumDocument<AstNode>): Promise<AstNodeDescription[]> {
        const model = document.parseResult.value as Model;
        return model.persons
            .filter(p => p.published)
            .map(p => this.descriptions.createDescription(p, p.name));
    }
}
```

After that, you need to register the `HelloWorldScopeComputation` in the `HelloWorldModule`:

```typescript
export const HelloWorldModule: Module<HelloWorldServices, PartialLangiumServices & HelloWorldAddedServices> = {
    //...
    references: {
        ScopeComputation: (services) => new HelloWorldScopeComputation(services)
    }
};
```

Having done this, will make all persons that are marked with the `export` keyword available to the other files through the index manager.

## Step 3: Importing from specific files

The final step is to adjust the cross-reference resolution by overriding the `DefaultScopeProvider.getScope(…)` function:

```typescript
export class HelloWorldScopeProvider extends DefaultScopeProvider {
    override getScope(context: ReferenceInfo): Scope {
        switch(context.container.$type as keyof HelloWorldAstType) {
            case 'PersonImport':
                if(context.property === 'person') {
                    return this.getExportedPersonsFromGlobalScope(context);
                }
                break;
            case 'Greeting':
                if(context.property === 'person') {
                    return this.getImportedPersonsFromCurrentFile(context);
                }
                break;
        }
        return EMPTY_SCOPE;
    }
    //...
}
```

Do not forget to add the new service to the `HelloWorldModule`:

```typescript
export const HelloWorldModule: Module<HelloWorldServices, PartialLangiumServices & HelloWorldAddedServices> = {
    //...
    references: {
        ScopeComputation: (services) => new HelloWorldScopeComputation(services),
        ScopeProvider: (services) => new HelloWorldScopeProvider(services) //NEW!
    }
};
```

You noticed the two missing functions? Here is what they have to do.

The first function (`getExportedPersonsFromGlobalScope(context)`) will take a look at the global scope and return all exported persons respecting the files that were touched by the file imports. Note that we are outputting all persons that are marked with the `export` keyword. The actual name resolution is done internally later by the linker.

```typescript
protected getExportedPersonsFromGlobalScope(context: ReferenceInfo): Scope {
    //get document for current reference
    const document = AstUtils.getDocument(context.container);
    //get model of document
    const model = document.parseResult.value as Model;
    //get URI of current document
    const currentUri = document.uri;
    //get folder of current document
    const currentDir = dirname(currentUri.path);
    const uris = new Set<string>();
    //for all file imports of the current file
    for (const fileImport of model.fileImports) {
        //resolve the file name relatively to the current file
        const filePath = join(currentDir, fileImport.file);
        //create back an URI
        const uri = currentUri.with({ path: filePath });
        //add the URI to URI list
        uris.add(uri.toString());
    }
    //get all possible persons from these files
    const astNodeDescriptions = this.indexManager.allElements(Person, uris).toArray();
    //convert them to descriptions inside of a scope
    return this.createScope(astNodeDescriptions);
}
```

The second function (`getImportedPersonsFromCurrentFile(context)`) will take a look at the current file and return all persons that are imported from other files.

```typescript
private getImportedPersonsFromCurrentFile(context: ReferenceInfo) {
    //get current document of reference
    const document = AstUtils.getDocument(context.container);
    //get current model
    const model = document.parseResult.value as Model;
    //go through all imports
    const descriptions = model.fileImports.flatMap(fi => fi.personImports.map(pi => {
        //if the import is name, return the import
        if (pi.name) {
            return this.descriptions.createDescription(pi, pi.name);
        }
        //if import references to a person, return that person
        if (pi.person.ref) {
            return this.descriptions.createDescription(pi.person.ref, pi.person.ref.name);
        }
        //otherwise return nothing
        return undefined;
    }).filter(d => d != undefined)).map(d => d!);
    return this.createScope(descriptions);
}
```

## Result

Now, let's test the editor by `npm run build` and starting the extension.
Try using these two files. The first file contains the Simpsons family.

```plain
export person Homer
export person Marge
person Bart
person Lisa
export person Maggy
```

The second file tries to import and greet them.

```plain
import { 
    Marge,
    Homer,
    Lisa, //reference error, because not exported
    Maggy as Baby
} from "persons.hello"

Hello Lisa! //reference error, because no valid import
Hello Maggy! //reference error, because name was overwritten with 'Baby'
Hello Homer!
Hello Marge!
Hello Baby!
```

<details>
<summary>Full Implementation</summary>

```ts
import { AstNode, AstNodeDescription, AstUtils, DefaultScopeComputation, DefaultScopeProvider, EMPTY_SCOPE, LangiumDocument, ReferenceInfo, Scope } from "langium";
import { CancellationToken } from "vscode-languageclient";
import { HelloWorldAstType, Model, Person } from "./generated/ast.js";
import { dirname, join } from "node:path";

export class HelloWorldScopeComputation extends DefaultScopeComputation {
    override async computeExports(document: LangiumDocument<AstNode>, _cancelToken?: CancellationToken | undefined): Promise<AstNodeDescription[]> {
        const model = document.parseResult.value as Model;
        return model.persons
            .filter(p => p.published)
            .map(p => this.descriptions.createDescription(p, p.name))
        ;
    }
}

export class HelloWorldScopeProvider extends DefaultScopeProvider {
    override getScope(context: ReferenceInfo): Scope {
        switch(context.container.$type as keyof HelloWorldAstType) {
            case 'PersonImport':
                if(context.property === 'person') {
                    return this.getExportedPersonsFromGlobalScope(context);
                }
                break;
            case 'Greeting':
                if(context.property === 'person') {
                    return this.getImportedPersonsFromCurrentFile(context);
                }
                break;
        }
        return EMPTY_SCOPE;
    }

    protected getExportedPersonsFromGlobalScope(context: ReferenceInfo): Scope {
        //get document for current reference
        const document = AstUtils.getDocument(context.container);
        //get model of document
        const model = document.parseResult.value as Model;
        //get URI of current document
        const currentUri = document.uri;
        //get folder of current document
        const currentDir = dirname(currentUri.path);
        const uris = new Set<string>();
        //for all file imports of the current file
        for (const fileImport of model.fileImports) {
            //resolve the file name relatively to the current file
            const filePath = join(currentDir, fileImport.file);
            //create back an URI
            const uri = currentUri.with({ path: filePath });
            //add the URI to URI list
            uris.add(uri.toString());
        }
        //get all possible persons from these files
        const astNodeDescriptions = this.indexManager.allElements(Person, uris).toArray();
        //convert them to descriptions inside of a scope
        return this.createScope(astNodeDescriptions);
    }

    private getImportedPersonsFromCurrentFile(context: ReferenceInfo) {
        //get current document of reference
        const document = AstUtils.getDocument(context.container);
        //get current model
        const model = document.parseResult.value as Model;
        //go through all imports
        const descriptions = model.fileImports.flatMap(fi => fi.personImports.map(pi => {
            //if the import is name, return the import
            if (pi.name) {
                return this.descriptions.createDescription(pi, pi.name);
            }
            //if import references to a person, return that person
            if (pi.person.ref) {
                return this.descriptions.createDescription(pi.person.ref, pi.person.ref.name);
            }
            //otherwise return nothing
            return undefined;
        }).filter(d => d != undefined)).map(d => d!);
        return this.createScope(descriptions);
    }
}
```

</details>