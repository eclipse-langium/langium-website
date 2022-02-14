---
title: "Configuration via Services"
weight: 200
---
Langium supports the configuration of most aspects of your language and language server via a set of *Services*. Those services are organized into *Modules*, which are essentially mappings from a service name to its implementation.

We can separate modules into two main categories:
1. ***Shared modules*** which contain services that are shared across all languages.
2. ***Language specific modules*** which contain services specific to one language. 

## Shared Modules
The *shared modules* contain services shared across all languages:
* The `ServiceRegistry` is responsible for registering and accessing the different services.
* The `Connection` service sends messages to the client and register message handlers for incoming messages.
* Services to handle *Langium Documents* and *Text Documents*.
* Implementations of the `AstReflection` service (one implementation per language) to access the structure of the AST.

## Language Specific Modules
The *language specific modules* contain all services which are specific to one language:
* Services for [LSP features](#language-server-protocol)
* Services involved in the document lifecycle (future documentation)
* Utility services

## Customization
If you used the [Yeoman generator](https://www.npmjs.com/package/generator-langium), the entry point to services customization is found in the `src/language-server/...-module.ts` file, where '...' is the name of your language. There, you can register new services, or override the default implementation of services. Langium implements the *Inversion of Control* principle via *Dependency Injection* pattern, which promotes loosely-coupled architectures, maintainability, and extensibility.

For the following sections, we will use the [arithmetics example](https://github.com/langium/langium/tree/main/examples/arithmetics) to describe the procedure for replacing or adding services. Note that all names prefixed with *Arithmetics* should be understood as being specific to the language named *Arithmetics*, and in your project those services' names will be prefixed with your own language name.

Please note that it is *not mandatory* to implement all custom code via dependency injection. The main reason for using dependency injection is when your custom code *depends* on other services.

### Overriding and Extending Services
Thanks to the *inversion of control* via *dependency injection*, your can change the behavior of a service or add to its functionality in one place without having to modify every piece of code that depends on the service to be overridden or extended.

The [arithmetics example](https://github.com/langium/langium/tree/main/examples/arithmetics) provides a custom implementation of the `ScopeProvider` service, which overrides functionalities from the default implementation `DefaultScopeProvider`.

First, we need to register the new implementation of `ScopeProvider` inside of the `ArithmeticsModule`:

```Typescript
export const ArithmeticsModule: Module<ArithmeticsServices, PartialLangiumServices & ArithmeticsAddedServices> = {
    references: {
        ScopeProvider: (services) => new ArithmeticsScopeProvider(services)
    }
};
```
In the `ArithmeticsModule` singleton instance, we map a property with the name of our service (here `ScopeProvider`) to a concrete implementation of the service. This means that every time we need to call the service named *ScopeProvider*, a new instance of the class `ArithmeticsScopeProvider` will be created instead of the default implementation `DefaultScopeProvider`. 

In order to successfully override an existing service, the property name (here `ScopeProvider`) must match exactly that of the default implementation. A list of default services can be found [here](#default-services).

The `ArithmeticsScopeProvider` overrides two methods from `DefaultScopeProvider`:
```TypeScript
export class ArithmeticsScopeProvider extends DefaultScopeProvider {

    protected createScope(elements: Stream<AstNodeDescription>, outerScope: Scope): Scope {
        return new SimpleScope(elements, outerScope, { caseInsensitive: true });
    }

    protected getGlobalScope(referenceType: string): Scope {
        return new SimpleScope(this.indexManager.allElements(referenceType), undefined, { caseInsensitive: true });
    }

}
```
The functions `createScope` and `getGlobalScope` are already defined in `DefaultScopeProvider` but needed to be overridden to add the option `{caseInsensitive: true}`. This is achieved through inheritance. By using the keyword `extends`, `ArithmeticsScopeProvider` inherits from `DefaultScopeProvider`, which means that it can access properties and methods as well as override methods declared in the parent class.

In the `DefaultScopeProvider`, those two methods are declared as:
```Typescript
protected createScope(elements: Stream<AstNodeDescription>, outerScope: Scope): Scope {
    return new SimpleScope(elements, outerScope);
}

protected getGlobalScope(referenceType: string): Scope {
    return new SimpleScope(this.indexManager.allElements(referenceType));
}
```

Now, when we call either `createScope` or `getGlobalScope` from the `ScopeProvider` service, the call will be made from the `ArithmeticsScopeProvider` instead of the `DefaultScopeProvider`. Functions that were not overridden will still be called from `DefaultScopeProvider` via inheritance.

### Adding New Services
To add services that are not available by default in Langium, e.g. application specific ones, we first need to edit the type `ArithmeticsAddedService`.
By default, the langium generator adds a validator service where you can implement validation rules specific to your language. New services are added as *type properties* following the pattern `Property name: Property Type`:
```Typescript
export type ArithmeticsAddedServices = {
    ArithmeticsValidator: ArithmeticsValidator
}
```
`ArithmeticsAddedService` type now has a property `ArithmeticsValidator` of type `ArithmeticsValidator`.

For the sake of organization and clarity, the services can be nested inside of other properties acting as "groups":
```Typescript
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
```Typescript
export const ArithmeticsModule: Module<ArithmeticsServices, PartialLangiumServices & ArithmeticsAddedServices> = {
    validation: {
        ArithmeticsValidator: () => new ArithmeticsValidator()
    }
};
```
Similarly to [overridden services](#overriding-and-extending-services), a call to the `ArithmeticsValidator` property will create a new instance of the class `ArithmeticsValidator`.

The `ArithmeticsValidator` service does not depend on other services, and no argument is passed during the instantiation of the class. If you implement a service that depends on other services, the constructor of your service should expect `<yourDslName>Services` as argument. The initializer function can expect that object as argument and pass it to your services constructor, such as:
```Typescript
export const ArithmeticsModule: Module<ArithmeticsServices, PartialLangiumServices & ArithmeticsAddedServices> = {
    ServiceWithDependencies = (services) => new ServiceClass(services);
}
```
The services which `ServiceClass` depends on need to be registered in the constructor:
```Typescript
export class ServiceClass{
    readonly serviceOne: ServiceOne;
    readonly serviceTwo: ServiceTwo;
    readonly serviceN: ServiceN;

    constructor(services: ArithmeticsServices){
        this.serviceOne = services.ServiceOne;
        this.serviceTwo = services.Group.ServiceTwo;
        this.serviceN = services.Group.SubGroup.ServiceN;
    }
    /* service logic */
}
```

#### Using ArithmeticsValidator in other services
The `ArithmeticsValidator` needs to be registered inside of the `ValidationRegistry`. This done by [overriding](#overriding-and-extending-services) `ValidationRegistry` with `ArithmeticsValidationRegistry`.

Briefly, `ArithmeticsValidator` implements two checks, `checkDivByZero` and `checkNormalisable`:
```Typescript
    export class ArithmeticsValidator {
    checkDivByZero(binExpr: BinaryExpression, accept: ValidationAcceptor): void {
        ...
    }

    checkNormalisable(def: Definition, accept: ValidationAcceptor): void {
        ...
    }
}
``` 
These two new checks need to be registered inside of the `ValidationRegistry`. Instead of directly modifying `ValidationRegistry` inside of the Langium code base, we extend `ValidationRegistry` with `ArithmeticsValidationRegistry` to implement our new functionalities:
```Typescript
export class ArithmeticsValidationRegistry extends ValidationRegistry {
    constructor(services: ArithmeticsServices) {
        super(services);
        const validator = services.validation.ArithmeticsValidator;
        const checks: LangiumGrammarChecks = {
            BinaryExpression: validator.checkDivByZero,
            Definition: validator.checkNormalisable
        };
        this.register(checks, validator);
    }
}
```
Inside of the `ArithmeticsValidationRegistry`, we call our `ArithmeticsValidator` via the `ServiceRegistry` with `const validator = services.validation.ArithmeticsValidator` which will create a new instance of `ArithmeticsValidator`. Then, we declare the `checks` to be registered and register them inside of the registry via the function `register` which is declared in the parent class. The `ArithmeticsValidationRegistry` only adds functionality to the `ValidationRegistry` but does not override any functionality from it.

The implementation of `ArithmeticsValidationRegistry` needs to be registered in `ArithmeticsModule`. The complete `ArithmeticsModule` is:
```Typescript
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
The `CompletionProvider` service is responsible for handling a [LSP Completion Request](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#textDocument_completion) at a given cursor position. When a *LSP Completion Request* is submitted by the client to the server, the `CompletionProvider` will create a `CompletionList` of all possible `CompletionItem` to be presented in the editor. The `CompletionProvider` service computes a new `CompletionList` after every typing.

#### DocumentSymbolProvider
The `DocumentSymbolProvider` service is responsible for handling a [LSP Document Symbols Request](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#textDocument_documentSymbol). The `DocumentSymbolProvider` is used to return a hierarchy of all symbols found in a document as an array of `DocumentSymbol`. 

#### HoverProvider
The `HoverProvider` service is responsible for handling a [LSP Hover Request](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#textDocument_hover) at a given text document position. By default, Langium implements the possibility to generate tooltips with the content of a multiline comment while hovering a symbol.

#### FoldingRangeProvider
The `FoldingRangeProvider` service is responsible for handling a [Folding Range Request](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#textDocument_foldingRange). This service identifies all the blocks that can be folded in a document.

#### ReferenceFinder
The `ReferenceFinder` service is responsible for handling a [Find References Request](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#textDocument_references). This service is used to find all references to a given symbol inside of a document.

#### DocumentHighlighter
The `DocumentHighlighter` service is responsible for handling a [Document Highlights Request](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#textDocument_documentHighlight). This service will find all references to a symbol at a given position (via the `References` service) and highlight all these references in a given document.

#### RenameHandler
The `RenameHandler` service is responsible for handling a [Rename Request](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#textDocument_rename) or a [Prepare Rename Request](https://microsoft.github.io/language-server-protocol/specifications/specification-current/#textDocument_prepareRename). First, the service will check the validity of the *Prepare Rename Request*. If the request is valid, the service will find all references to the selected symbol inside of a document and replace all occurrences with the new value.
