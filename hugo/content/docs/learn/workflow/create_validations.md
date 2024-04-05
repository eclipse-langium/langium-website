---
title: "Create validations"
weight: 700
url: /docs/learn/workflow/create_validations
---

After resolving the cross-references, you can assume that the syntax tree is complete. Now you can start with the validation of the input files. The validation process is a crucial part of the language engineering workflow. The parser ensures the syntactic correctness of the input files. The validation process ensures the semantic correctness of the input files.

As an example, let's consider the Hello-World example from the Yeoman generator. One semantic of this language could be that each declared person must be greeted at most once. To be clear, the following input file is invalid, we are greeting John twice:

```text
person John
person Jane

Hello John!
Hello Jane!
Hello John! //should throw: You can great each person at most once! This is the 2nd greeting of John.
```

To accomplish this, you need to implement a validator. The validator is a visitor that traverses a certain part of the syntax tree and checks for semantic errors. The following code snippet shows how you can implement a validator for the Hello-World example. Mind that the Hello-World already has a validator, you just need to add the following one.

```ts
import type { ValidationAcceptor, ValidationChecks } from 'langium';
import type { HelloWorldAstType, Model, Person } from './generated/ast.js';
import type { HelloWorldServices } from './hello-world-module.js';

export function registerValidationChecks(services: HelloWorldServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.HelloWorldValidator;
    const checks: ValidationChecks<HelloWorldAstType> = {
        //registers a validator for all Model AST nodes
        Model: validator.checkPersonAreGreetedAtMostOnce
    };
    registry.register(checks, validator);
}

export class HelloWorldValidator {
    checkPersonAreGreetedAtMostOnce(model: Model, accept: ValidationAcceptor): void {
        //create a multi-counter variable using a map
        const counts = new Map<Person, number>();
        //initialize the counter for each person to zero
        model.persons.forEach(p => counts.set(p, 0));
        //iterate over all greetings and count the number of greetings for each person
        model.greetings.forEach(g => {
            const person = g.person.ref;
            //Attention! if the linker was unsucessful, person is undefined
            if(person) {
                //set the new value of the counter
                const newValue = counts.get(person)!+1;
                counts.set(person, newValue);
                //if the counter is greater than 1, create a helpful error
                if(newValue > 1) {
                    accept('error', `You can great each person at most once! This is the ${newValue}${newValue==2?'nd':'th'} greeting of ${person.name}.`, {
                        node: g
                    });
                }
            }
        });
    }
}
```
