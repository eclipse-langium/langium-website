---
title: "Dependency loops"
weight: 100
---

## What is the problem?

If you are building some composite data structures or have some computation flow, you might be interested whether the product, that you are generating, does contain any loops back to the already used product. We want to implement a validation that does this detection in the background and notifies us by highlighting the lines causing this problem.

Examples for such depndency loops are:

* For data structures you could think of a structure in C that references itself (without using the pointer notation). This would lead to an infinitely expanding data type, which is practically not doable.
* Or for control flows these loops can be interpreted as recursion detection, a function that calls itself (with any number of function calls to other functions in-between).

Regardless of what usecase you have, you might have an interest to detect those loops and get early feedback in the shape of a validation. Another thing you might want to get is a resolution for loop-free dependencies. Think of a net of package imports in
a programming language. You want to know the order in which you can import the packages without getting into trouble.

## How to solve it?

There are two approaches for a loop detection and the loop-free resolution depending on the nature of your situation.

### Simple nature

#### Simple detection

If you have a `1:n` relationship like the `super class`-to-`sub class` relation for classes, you can do it by simply walking along the parent route (or in this specific example the `super class`-route). Just keep in mind all visited places and if one parent is already in that list, you have detected a loop!

#### Simple resolution

Assuming that you have no loops back, you can resolve a list of dependencies.
You do a simple depth-first-search, starting with the parent visiting the children afterwards (recursively).

### Complex nature

#### Complex detection

If you have a `n:m` relationship like it is given for function calls (a function can be called by `m` function and can call `n` functions), you can solve the question for loops by creating a directed graph.

In this example the nodes are the set of all functions and function calls are stored as edges (for each call from function A to every function B).
The key algorithm is the search for the so-called strongly-connected components in the resulting graph.

It is recommended not to implement your own version of that algorithm. Please use an existing solution! The algorithm is able to output every loop with all its members of that loop. You can also use your own implementation. But keep in mind the effort and the quality of the existing solutions that you could get here.

#### Complex resolution

The directed graph approach can be processed further when there were no loops found:

With a "topological sort" you can get an order that respects all dependencies. Means more or less: You start with the node that has no dependencies, remove it, put it into your sorted list and do the same for the resulting graph again and again until all dependencies were resolved.

The topological sort (as well as the strongly-connected component search) is a standard algorithm in every good graph library.

## How to make it work in Langium?

In the following example we will resolve the dependencies for a complex nature of data.

Therefore we will take the `HelloWorld` example from the learning section and extend it with a validation that checks for greeting loops. Greeting loops are forbidden in this example. When `A` greets `B` and `B` greets `C`, then `C` must not greet `A`.

### Adapt the grammar

We will change the `HelloWorld` grammar, so that persons can greet each other. After that, we will introduce a validation in order to forbid "greeting loops".

```langium
grammar HelloWorld

entry Model:
    (persons+=Person | greetings+=Greeting)*;

Person:
    'person' name=ID;

Greeting:
    greeter=[Person:ID] 'greets' greeted=[Person:ID] '!';

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
````

After the change build your grammar with `npm run langium:generate`.

### Loop detection

Now we will add the validation. Here we will use the graph library ‚graphology‘. Please install these three packages (`graphology` contains the data structure, `graphology-components` contains the strongly-connected component search, `graphology-dag` contains the topological sort):

```bash
npm install graphology graphology-components graphology-dag
```

Open the `hello-world-validator.ts` and add another validator for `Model`. It is important to say that we do not create a check on the `Greeting` level, because we need the overview over all greetings. The complete overview is given for the `Model` AST node.

```typescript
const checks: ValidationChecks<HelloWorldAstType> = {
    Model: validator.checkGreetingCycles, // new!!!
    Person: validator.checkPersonStartsWithCapital
};
```

And here is the implementation:

```typescript
checkGreetingCycles(model: Model, accept: ValidationAcceptor): void {
    //arrange the graph
    const graph = new DirectedGraph<{}, {greeting: Greeting}>();
    model.persons.forEach(person => {
        graph.addNode(person.name);
    })
    model.greetings.forEach(greeting => {
        if(greeting.greeter.ref && greeting.greeted.ref && !graph.hasDirectedEdge(greeting.greeter.ref.name, greeting.greeted.ref.name)) {
            graph.addEdge(greeting.greeter.ref.name, greeting.greeted.ref.name, {
                greeting
            });
        }
    });
    
    //compute the components
    const components = stronglyConnectedComponents(graph);

    //evaluate result (filter out size-1-components)
    const actualLoops = components.filter(c => c.length > 1);
    for (const component of actualLoops) {
        const set = new Set<string>(component);
        //for each node in the component...
        for (const from of set) {
            //check whether the out edges...
            for (const { target: to, attributes: { greeting } } of graph.outEdgeEntries(from)) {
                //are within the component
                if(set.has(to)) {
                    //if yes, set an error on the corresponding greeting
                    accept("error", "Greeting loop detected!", {
                        node: greeting
                    });
                }
            }
        }
    }
}
```

After finishing your validator, do not forget to build your project with `npm run build`.
So a `.hello` file like this one, would have 3 greetings with an error:

```plaintext
person Homer
person Marge
person Pinky
person Brain

Homer greets Marge! //error
Marge greets Brain! //error
Brain greets Homer! //error
Pinky greets Marge!
```

### Dependency resolution

The topological sort can be done like this:

```typescript
import { topologicalSort } from 'graphology-dag‘;

//resolvedOrder is an array of person names!
const resolvedOrder = topologicalSort(graph);
```

This will give you back an order of greeters. The rule would be like: `You can only greet if every greeting addressed to you was already spoken out.`
For a `.hello` file like this, we would get the order: `Homer`, `Brain`, `Pinky`, `Marge`.

```plaintext
person Homer
person Marge

person Pinky
person Brain

Homer greets Marge!
Brain greets Pinky!
Pinky greets Marge!
```

* `Homer` is not greeted by anyone, so he can start greeting `Marge`.
* `Marge` and `Pinky` are blocked by `Pinky` and `Brain`.
* `Brain` is the next and unblocks `Pinky`.
* After `Pinky` is done, `Marge` is unblocked as well.
* But `Marge` has no one to greet.
* So, we are done.

## Appendix

<details>
<summary>Full Implementation</summary>

```ts
import type { ValidationAcceptor, ValidationChecks } from 'langium';
import type { Greeting, HelloWorldAstType, Model } from './generated/ast.js';
import type { HelloWorldServices } from './hello-world-module.js';
import { DirectedGraph } from 'graphology';
import { stronglyConnectedComponents } from 'graphology-components';
import { topologicalSort } from 'graphology-dag';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: HelloWorldServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.HelloWorldValidator;
    const checks: ValidationChecks<HelloWorldAstType> = {
        Model: validator.checkGreetingCycles,
        //Not needed for this example
        //Person: validator.checkPersonStartsWithCapital
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class HelloWorldValidator {
    checkGreetingCycles(model: Model, accept: ValidationAcceptor): void {
        //arrange the graph
        const graph = new DirectedGraph<{}, {greeting: Greeting}>();
        model.persons.forEach(person => {
            graph.addNode(person.name);
        })
        model.greetings.forEach(greeting => {
            if(greeting.greeter.ref && greeting.greeted.ref && !graph.hasDirectedEdge(greeting.greeter.ref.name, greeting.greeted.ref.name)) {
                graph.addEdge(greeting.greeter.ref.name, greeting.greeted.ref.name, {
                    greeting
                });
            }
        });
        
        //compute the components
        const components = stronglyConnectedComponents(graph);

        //evaluate result (filter out size-1-components)
        const actualLoops = components.filter(c => c.length > 1);
        for (const component of actualLoops) {
            const set = new Set<string>(component);
            //for each node in the component...
            for (const from of set) {
                //check whether the out edges...
                for (const { target: to, attributes: { greeting } } of graph.outEdgeEntries(from)) {
                    //are within the component
                    if(set.has(to)) {
                        //if yes, set an error on the corresponding greeting
                        accept("error", "Greeting loop detected!", {
                            node: greeting
                        });
                    }
                }
            }
        }

        //resolve all dependencies
        if(actualLoops.length === 0) {
            const resolvedOrder = topologicalSort(graph);
            //this is done as a hint, just for demonstration purposes
            accept('hint', "Please greet in the following greeter order: "+resolvedOrder.join(", "), {
                node: model
            });
        }
    }
}
```

</details>
