---
title: "Configuration via Services"
weight: 200
---

Langium supports the configuration of most aspects of your language and language server via a set of *services*. Those services are configured by *modules*, which are essentially mappings from a service name to its implementation.

We can separate services and modules into two main categories:

#### Shared Services
The *shared services* are services that are shared across all Langium languages. In many applications there is only one Langium language, but the overall structure of the services is the same.
* The `ServiceRegistry` is responsible for registering and accessing the different languages and their services.
* The `Connection` service is used in a language server context; it sends messages to the client and registers message handlers for incoming messages.
* The `AstReflection` service provides access the structure of the AST types.
* Shared services involved in the document lifecycle (future documentation)

#### Language Specific Services
The *language specific services* are services specific to one Langium language and isolated from other languages.
* Services for [LSP features](#language-server-protocol)
* Services involved in the document lifecycle (future documentation)
* Utility services (e.g. `References`, `JsonSerializer`)

## Customization
If you have used the [Yeoman generator](https://www.npmjs.com/package/generator-langium), the entry point to services customization is found in the `src/language/...-module.ts` file, where '...' is the name of your language. There you can register new services or override the default implementations of services. Langium implements the *Inversion of Control* principle via the *Dependency Injection* pattern, which promotes loosely-coupled architectures, maintainability, and extensibility.

For the following sections, we will use the [arithmetics example](https://github.com/eclipse-langium/langium/tree/main/examples/arithmetics) to describe the procedure for replacing or adding services. Note that all names prefixed with *Arithmetics* should be understood as being specific to the language named *Arithmetics*, and in your project those services' names will be prefixed with your own language name.

Please note that it is *not mandatory* to implement all custom code via dependency injection. The main reason for using dependency injection is when your custom code *depends* on other services. In many cases you can use plain functions instead of service classes to implement your application logic.

### Overriding and Extending Services
Thanks to the dependency injection pattern used in Langium, your can change the behavior of a service or add to its functionality in one place without having to modify every piece of code that depends on the service to be overridden or extended.

The [arithmetics example](https://github.com/eclipse-langium/langium/tree/main/examples/arithmetics) provides a custom implementation of the `ScopeProvider` service, which overrides functionalities from the default implementation `DefaultScopeProvider`.

First, we need to register the new implementation of `ScopeProvider` inside of the `ArithmeticsModule`:

```ts
export const ArithmeticsModule: Module<ArithmeticsServices, PartialLangiumServices & ArithmeticsAddedServices> = {
    references: {
        ScopeProvider: (services) => new ArithmeticsScopeProvider(services)
    }
};
```
In the `ArithmeticsModule` singleton instance, we map a property with the name of our service (here `ScopeProvider`) to a concrete implementation of the service. This means that the first time we access the service named `ScopeProvider`, a new instance of the class `ArithmeticsScopeProvider` will be created instead of the default implementation `DefaultScopeProvider`. The provided factory function is invoked only once, which means that all services are handled as singletons.

In order to successfully override an existing service, the property name (here `ScopeProvider`) must match exactly that of the default implementation.

The `ArithmeticsScopeProvider` overrides two methods from `DefaultScopeProvider`:
```TypeScript
export class ArithmeticsScopeProvider extends DefaultScopeProvider {

    protected createScope(elements: Stream<AstNodeDescription>, outerScope: Scope): Scope {
        return new StreamScope(elements, outerScope, { caseInsensitive: true });
    }

    protected getGlobalScope(referenceType: string): Scope {
        return new StreamScope(this.indexManager.allElements(referenceType), undefined, { caseInsensitive: true });
    }

}
```
The functions `createScope` and `getGlobalScope` are already defined in `DefaultScopeProvider` but needed to be overridden to add the option `{caseInsensitive: true}`. This is achieved through inheritance: By using the keyword `extends`, `ArithmeticsScopeProvider` inherits from `DefaultScopeProvider`, which means that it can access properties and methods as well as override methods declared in the superclass.

In the `DefaultScopeProvider`, those two methods are declared as:
```ts
protected createScope(elements: Stream<AstNodeDescription>, outerScope: Scope): Scope {
    return new StreamScope(elements, outerScope);
}

protected getGlobalScope(referenceType: string): Scope {
    return new StreamScope(this.indexManager.allElements(referenceType));
}
```

Now, when we call either `createScope` or `getGlobalScope` from the `ScopeProvider` service, the call will be made from the `ArithmeticsScopeProvider` instead of the `DefaultScopeProvider`. Functions that were not overridden will still be called from `DefaultScopeProvider` via inheritance.

Of course it is also possible to replace the default implementation with a completely separate one that does not inherit from the default service class.

### Adding New Services
To add services that are not available by default in Langium, e.g. application specific ones, we first need to edit the type `ArithmeticsAddedService`.
By default, the Yeoman-based generator adds a validator service where you can implement validation rules specific to your language. New services are added as properties to the type declaration:
```ts
export type ArithmeticsAddedServices = {
    ArithmeticsValidator: ArithmeticsValidator
}
```
The `ArithmeticsAddedService` type now has a property `ArithmeticsValidator` of type `ArithmeticsValidator`.

For the sake of organization and clarity, the services can be nested inside of other properties acting as "groups":
```ts
export type ArithmeticsAddedServices = {
    validation: {
        ArithmeticsValidator: ArithmeticsValidator
    },
    secondGroup: {
        AnotherServiceName: AnotherServiceType
    },
    nthGroup: {
        withASubGroup: {
             YetAnotherServiceName: YetAnotherServiceType
        }
    }
}
```

Now that we have declared our new services inside of the `ArithmeticsAddedServices` type definition, we need to specify to the module how we want them to be implemented. To do so, we need to update the `ArithmeticsModule`:
```ts
export const ArithmeticsModule: Module<ArithmeticsServices, PartialLangiumServices & ArithmeticsAddedServices> = {
    validation: {
        ArithmeticsValidator: () => new ArithmeticsValidator()
    }
};
```
Similarly to [overridden services](#overriding-and-extending-services), the first access to the `ArithmeticsValidator` property will create a new instance of the class `ArithmeticsValidator`.

The `ArithmeticsValidator` service does not depend on other services, and no argument is passed during the instantiation of the class. If you implement a service that depends on other services, the constructor of your service should expect `<yourDslName>Services` as argument. The initializer function can expect that object as argument and pass it to your services constructor, such as:
```ts
export const ArithmeticsModule: Module<ArithmeticsServices, PartialLangiumServices & ArithmeticsAddedServices> = {
    ServiceWithDependencies = (services) => new ServiceClass(services);
}
```
The services which `ServiceClass` depends on need to be registered in the constructor:
```ts
export class ServiceClass {
    private readonly serviceOne: ServiceOne;
    private readonly serviceTwo: ServiceTwo;
    private readonly serviceN: ServiceN;

    constructor(services: ArithmeticsServices) {
        this.serviceOne = services.ServiceOne;
        this.serviceTwo = services.Group.ServiceTwo;
        this.serviceN = services.Group.SubGroup.ServiceN;
    }
    /* service logic */
}
```

#### Resolving cyclic dependencies

In case one of the services the `ServiceClass` above depends on, also has a dependency back to the `ServiceClass`, your module will throw an error similar to this: `Cycle detected. Please make "ServiceClass" lazy.` Ideally, such cyclic dependencies between services should be avoided. Sometimes, cycles are unavoidable though. In order to make them lazy, assign a lambda function that returns the service in the constructor. You can then invoke this function in your service logic to get access to the depending service:
```ts
export class ServiceClass {
    private readonly serviceOne: () => ServiceOne;

    constructor(services: ArithmeticsServices) {
        this.serviceOne = () => services.ServiceOne; // <-- lazy evaluated service
    }
    /* service logic */
    method() {
        this.serviceOne().methodOne();
    }
}
```

#### Using ArithmeticsValidator in other services
The `ArithmeticsValidator` needs to be registered inside of the `ValidationRegistry`. This done by [overriding](#overriding-and-extending-services) `ValidationRegistry` with `ArithmeticsValidationRegistry`.

Briefly, `ArithmeticsValidator` implements two checks, `checkDivByZero` and `checkNormalisable`:
```ts
export class ArithmeticsValidator {
    checkDivByZero(binExpr: BinaryExpression, accept: ValidationAcceptor): void {
        ...
    }

    checkNormalisable(def: Definition, accept: ValidationAcceptor): void {
        ...
    }
}
``` 
These two new checks need to be registered inside of the `ValidationRegistry`. We extend `ValidationRegistry` with `ArithmeticsValidationRegistry` to implement our new functionalities:
```ts
export class ArithmeticsValidationRegistry extends ValidationRegistry {
    constructor(services: ArithmeticsServices) {
        super(services);
        const validator = services.validation.ArithmeticsValidator;
        const checks: ArithmeticsChecks = {
            BinaryExpression: validator.checkDivByZero,
            Definition: validator.checkNormalisable
        };
        this.register(checks, validator);
    }
}
```
Inside of the `ArithmeticsValidationRegistry`, we obtain our `ArithmeticsValidator` with `const validator = services.validation.ArithmeticsValidator`, which will create a new instance of `ArithmeticsValidator`. Then we declare the `checks` to be registered and register them inside of the registry via the function `register` which is declared in the superclass. The `ArithmeticsValidationRegistry` only adds validation checks to the `ValidationRegistry`, but does not override any functionality from it.

The implementation of `ArithmeticsValidationRegistry` needs to be registered in `ArithmeticsModule`. The complete `ArithmeticsModule` is:
```ts
export const ArithmeticsModule: Module<ArithmeticsServices, PartialLangiumServices & ArithmeticsAddedServices> = {
    references: {
        ScopeProvider: (services) => new ArithmeticsScopeProvider(services)
    },
    validation: {
        ValidationRegistry: (services) => new ArithmeticsValidationRegistry(services),
        ArithmeticsValidator: () => new ArithmeticsValidator()
    }
};
```

## Language Server Protocol
If you want to modify aspects of the Language Server, this section will help you find the relevant service for handling a given LSP request.

#### CompletionProvider
The `CompletionProvider` service is responsible for handling a [Completion Request](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#textDocument_completion) at a given cursor position. When a *Completion Request* is submitted by the client to the server, the `CompletionProvider` will create a `CompletionList` of all possible `CompletionItem` to be presented in the editor. The `CompletionProvider` service computes a new `CompletionList` after each keystroke.

#### DocumentSymbolProvider
The `DocumentSymbolProvider` service is responsible for handling a [Document Symbols Request](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#textDocument_documentSymbol). The `DocumentSymbolProvider` is used to return a hierarchy of all symbols found in a document as an array of `DocumentSymbol`. 

#### HoverProvider
The `HoverProvider` service is responsible for handling a [Hover Request](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#textDocument_hover) at a given text document position. By default, Langium implements tooltips with the content of the preceding multiline comment when hovering a symbol.

#### FoldingRangeProvider
The `FoldingRangeProvider` service is responsible for handling a [Folding Range Request](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#textDocument_foldingRange). This service identifies all the blocks that can be folded in a document.

#### ReferenceFinder
The `ReferenceFinder` service is responsible for handling a [Find References Request](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#textDocument_references). This service is used to find all references to a given symbol inside of a document.

#### DocumentHighlighter
The `DocumentHighlighter` service is responsible for handling a [Document Highlights Request](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#textDocument_documentHighlight). This service will find all references to a symbol at a given position (via the `References` service) and highlight all these references in a given document.

#### RenameHandler
The `RenameHandler` service is responsible for handling a [Rename Request](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#textDocument_rename) or a [Prepare Rename Request](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#textDocument_prepareRename). First, the service will check the validity of the *Prepare Rename Request*. If the request is valid, the service will find all references to the selected symbol inside of a document and replace all occurrences with the new value.
