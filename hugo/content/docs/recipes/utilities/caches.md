---
title: "Caches"
weight: 0
---

## What is the problem?

You have parsed a document and you would like to execute some computation on the AST. But you don’t want to do this every time you see a certain node. You want to do it once for the lifetime of a document. Where to save it?

## How to solve it?

For data that depends on the lifetime of a document or even the entire workspace, Langium has several kinds of caches.

* the document cache saves key-value-pairs of given types `K` and `V` for each document. If the document gets changed or deleted the cache gets cleared automatically for the single files
* the workspace cache also save key-value-pairs of given types `K` and `V` but gets cleared entirely when something in the workspace gets changed.

Besides those specific caches, Langium also provides

* a simple cache that can be used for any kind of key-value-data
* a context cache that stores a simple cache for each context object. The document cache and workspace cache are implemented using the context cache.

## How to use it?

Here we will use the `HelloWorld` example from the learning section. Let's keep it simple and just list persons in the document, that come from a comic book.

We will have a computation for each person that determines from which publisher it comes from.

### Add a database

Let's build a "publisher inferer service". First let's create a small database of known publishers and known persons:

```typescript
type KnownPublisher = 'DC'|'Marvel'|'Egmont';
const KnownPersonNames: Record<KnownPublisher, string[]> = {
    DC: ['Superman', 'Batman', 'Aquaman', 'Wonderwoman', 'Flash'],
    Marvel: ['Spiderman', 'Wolverine', 'Deadpool'],
    Egmont: ['Asterix', 'Obelix']
};
```

### Define the computation service

For our service we define an interface:

```typescript
export interface InferPublisherService {
    inferPublisher(person: Person): KnownPublisher|undefined;
}
```

Now we implement the service:

```typescript
class UncachedInferPublisherService implements InferPublisherService {
    inferPublisher(person: Person): KnownPublisher|undefined {
        for (const [publisher, persons] of Object.entries(KnownPersonNames)) {
            if(persons.includes(person.name)) {
                return publisher as KnownPublisher;
            }
        }
        return undefined;
    }
}
```

### Add a cache

Now we want to cache the results of the `inferPublisher` method. We can use the `DocumentCache` for this. We will reuse the uncached service as base class and override the `inferPublisher` method:

```typescript
export class CachedInferPublisherService extends UncachedInferPublisherService {
    private readonly cache: DocumentCache<Person, KnownPublisher|undefined>;
    constructor(services: HelloWorldServices) {
        super();
        this.cache = new DocumentCache(services.shared);
    }
    override inferPublisher(person: Person): KnownPublisher|undefined {
        const documentUri = AstUtils.getDocument(person).uri;
        //get cache entry for the documentUri and the person
        //if it does not exist, calculate the value and store it
        return this.cache.get(documentUri, person, () => super.inferPublisher(person));
    }
}
```

### Use the service

To use this service, let's create a validator that checks if the publisher of a person is known. Go to the `hello-world-validator.ts` file and add the following code:

```typescript
import type { ValidationAcceptor, ValidationChecks } from 'langium';
import type { HelloWorldAstType, Person } from './generated/ast.js';
import type { HelloWorldServices } from './hello-world-module.js';
import { InferPublisherService } from './infer-publisher-service.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: HelloWorldServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.HelloWorldValidator;
    const checks: ValidationChecks<HelloWorldAstType> = {
        Person: validator.checkPersonIsFromKnownPublisher
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class HelloWorldValidator {
    private readonly inferPublisherService: InferPublisherService;

    constructor(services: HelloWorldServices) {
        this.inferPublisherService = services.utilities.inferPublisherService;
    }

    checkPersonIsFromKnownPublisher(person: Person, accept: ValidationAcceptor): void {
        if(this.inferPublisherService.inferPublisher(person) === undefined) {
            accept('warning', `"${person.name}" is not from a known publisher.`, {
                node: person
            });
        }
    }

}
```

### Register the service

Finally, we need to register the service in the module. Go to the `hello-world-module.ts` file and add the following code:

```typescript
export type HelloWorldAddedServices = {
    utilities: {
        inferPublisherService: InferPublisherService
    },
    validation: {
        HelloWorldValidator: HelloWorldValidator
    }
}
//...
export const HelloWorldModule: Module<HelloWorldServices, PartialLangiumServices & HelloWorldAddedServices> = {
    utilities: {
        inferPublisherService: (services) => new CachedInferPublisherService(services)
    },
    validation: {
        //add `services` parameter here
        HelloWorldValidator: (services) => new HelloWorldValidator(services)
    }
};
```

### Test the result

Start the extension and create a `.hello` file with several persons, like this one:

```plaintext
person Wonderwoman
person Spiderman
person Homer //warning: unknown publisher!!
person Obelix
```

## Last words

Caching can improve the performance of your language server. It is especially useful for computations that are expensive to calculate. The `DocumentCache` and `WorkspaceCache` are the most common caches to use. The `ContextCache` is useful if you need to store data for a specific context object. If you only need a key-value store, you can use the `SimpleCache`.
All of them are disposable compared to a simple `Map<K, V>`. If you dispose them by calling `dispose()` the entries will be removed and the memory will be freed.

## Appendix

<details>
<summary>Ful implementation</summary>

```typescript
import { AstUtils, DocumentCache } from "langium";
import { Person } from "./generated/ast.js";
import { HelloWorldServices } from "./hello-world-module.js";

type KnownPublisher = 'DC'|'Marvel'|'Egmont';
const KnownPersonNames: Record<KnownPublisher, string[]> = {
    DC: ['Superman', 'Batman', 'Aquaman', 'Wonderwoman', 'Flash'],
    Marvel: ['Spiderman', 'Wolverine', 'Deadpool'],
    Egmont: ['Asterix', 'Obelix']
};

export interface InferPublisherService {
    inferPublisher(person: Person): KnownPublisher|undefined;
}

class UncachedInferPublisherService implements InferPublisherService {
    inferPublisher(person: Person): KnownPublisher|undefined {
        for (const [publisher, persons] of Object.entries(KnownPersonNames)) {
            if(persons.includes(person.name)) {
                return publisher as KnownPublisher;
            }
        }
        return undefined;
    }
}

export class CachedInferPublisherService extends UncachedInferPublisherService {
    private readonly cache: DocumentCache<Person, KnownPublisher|undefined>;
    constructor(services: HelloWorldServices) {
        super();
        this.cache = new DocumentCache(services.shared);
    }
    override inferPublisher(person: Person): KnownPublisher|undefined {
        const documentUri = AstUtils.getDocument(person).uri;
        return this.cache.get(documentUri, person, () => super.inferPublisher(person));
    }
}
```

</details>
