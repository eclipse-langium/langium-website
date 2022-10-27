---
title: "Validation"
weight: 1
draft: true
---

In this guide, we will be talking about implementing validation for your Langium-based language. We recommend first reading the previous guide about [writing your grammar](/guides/writing_a_grammar/), as we will assume you're familiar with the topics covered there. We'll also assume that you have a working language to add validation to, so double check that `npm run langium:generate` succeeds without errors before you proceed.

For this guide, we'll be implementing validation for the [MiniLogo language](https://github.com/langium/langium-minilogo), but you can use your own language to follow along as well.

## Overview

Adding validation is an important step to building a language, as there are often invalid cases that cannot be filtered out through your grammar alone.

Consider the case of having unique names for identifiers. In MiniLogo we have definitions with names, and we also have parameters that are identifiefd by name. One problem here is if we have several definitions that share the same name. We could also have a similar problem with parameters, where perhaps the same name is used multiple times in the same definition. In the second case, this is most certainly undesirable, but in the first it depends on how you want your language to handle redefinitions.

Let's consider the case where you want to allow redeclaring a previous definition. This opens the door to allowing redeclaring or shadowing of definitions. If you ever wanted to extend your language down the road, such as by adding the ability to import other programs (along with their definitions) then you might consider allowing a definition to be redefined. However, it could also lead to uintended redeclarations that may be harder to track down. Ultimately, this choice depends on the desired semantics for your language, and is something you should consider carefully.

In this example we're going to *disallow* names that are non-unique for definitions, and we'll be doing the same for arguments of a definition as well.

## Validation Registry

In order to express these constraints, we need to modify our language's **validator**. By default, this can be found in **src/language-server/YOUR-LANGUAGE-validator.ts**; with a name that corresponds to your language. This file begins with a validation registry that extends the default validation registry. The validation registry allows us to register validation checks for our language.

The constructor for the registry is of particular interest, as it allows associating validation functions with *specific* nodes in your AST. Here you can see an example of the constructor below for the default hello world language from the yeoman generator.

```ts
/**
 * Registry for validation checks.
 */
export class HelloWorldValidationRegistry extends ValidationRegistry {
    constructor(services: HelloWorldServices) {
        super(services);
        const validator = services.validation.HelloWorldValidator;
        const checks: ValidationChecks<HelloWorldAstType> = {
            // we want to add checks here...
            Person: validator.checkPersonStartsWithCapital
        };
        this.register(checks, validator);
    }
}
```

From this example, we have a single validation for the `Person` node.

```ts
Person: validator.checkPersonStartsWithCapital
```

Before we changed our grammar in the last guide, the `Person` node corresponded with a parser rule named `Person`. Similarly, most nodes that we can validate will share the name of the parser rule that instantiates them. However, there are a couple cases where this is different:

- when `Rule infers AnotherName` (or uses `return`), the node's type will be `AnotherName`
- when the body of a parser rule has an action (like `{AnotherName}`, possibly starting with `infer`) this new name will exist instead for this *part* of the rule body

With this in mind, we can look back at our grammar that we've written for MiniLogo (from the last guide), and find the parser rules that refer to the nodes we want to validate. For this language we have a pair of cases to check, as mentioned above:

- Validate that definitions have unique names in a Model
- Validate that arguments have unique names in a Definition

In order to perform a validation, we need to know the type of that node to validate. Beyond checking our grammar to find this, we can also check the semantic model (akin to the abstract syntax) of our language. This was generated while running `npm run langium:generate`, and is located in **src/language-server/generated/ast.ts**. Peeking into this model, we can see that our rule for `Model` was written like so:

```antlr
entry Model: (stmts+=Stmt | defs+=Def)*;
```

which produces the following node type in our semantic model:

```ts
export interface Model extends AstNode {
    defs: Array<Def>
    stmts: Array<Stmt>
}
```

So, we can register a validation on all nodes of type `Model` (which should be just the root), like so. Note the import coming from the generated file, which contains the definitions that compose our semantic model. The name **ast.ts** reflects it's usage as identifying node types that constitute an AST in our language (akin to an abstract syntax).

```ts
import { Model } from './generated/ast';
...
const checks: ValidationChecks<HelloWorldAstType> = {
    Model: (m: Model, accept: ValidationAcceptor) => {
        // and validate the model 'm' here
    }
};
```

We also have a perfectly good validator class that's just below this part of the file that we can use, but it's still setup to perform validation on the old `Person` node. We can safely remove the old function, add our custom validation there, and associate it back with our validation registry checks.

The updated validator class looks like so:

```ts
/**
 * Implementation of custom validations.
 */
export class HelloWorldValidator {

    // our new validation function for defs
    checkUniqueDefs(model: Model, accept: ValidationAcceptor): void {
        // create a set of visited functions
        // and report an error when we see one we've already seen
        const reported = new Set();
        model.defs.forEach(d => {
            if (reported.has(d.name)) {
                accept('error',  `Def has non-unique name '${d.name}'.`,  {node: d, property: 'name'});
            }
            reported.add(d.name);
        });
    }

}
```

To call this validator in our registry, we can modify the check that is listed in our registry like so (removing the previously written lambda/arrow function).

```ts
const checks: MiniLogoChecks = {
    Model: validator.checkUniqueDefs,
};
```

Great! Now we have a simple validation in place to guard against duplicate definitions in MiniLogo.

Now that we've shown how this can be done, we can implement this for parameters as well. Looking at our grammar, we can see params are contained as part of a Definition, so we'll register validation for Definition nodes and report if any parameter are duplicated.

```ts
const checks: MiniLogoChecks = {
    Model: validator.checkUniqueDefs,
    Def:   validator.checkUniqueParams
};
```

And we can define this new function in our validator class, which is very close in structure to our first function.

```ts
checkUniqueParams(def: Def, accept: ValidationAcceptor): void {
    const reported = new Set();
    def.params.forEach(p => {
        if (reported.has(p.name)) {
            accept('error', `Param ${p.name} is non-unique for Def '${def.name}'`, {node: p, property: 'name'});
        }
        reported.add(p.name);
    });
}
```

Although we've only implemented a pair of validations, hopefully this demonstrates the flexibility of the validator API. The validator can help enforce constraints or features of your language, and ensure that your programs are correct. You could also explore more customized validations for specific cases, perhaps where a parameter and a definition share the same name -- which is not handled here. So long as you can identify the AST node type that you need to validate, you can implement the logic here.

That's all for validation. Next we'll be talking about how we can [customize our CLI](/guides/customizing_cli).
