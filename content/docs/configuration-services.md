---
title: "Configuration via Services"
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
* Services to build the `parser` for a specific language.
* Services to handle *LSP requests*.
* Services to retrieve information from a given AST.
* Services to manage references during linking and inside of documents.
* Serialization and deserialization of objects to JSON.
* Services to handle document and syntax validation.

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

## Default Services
Langium comes with a set of services that implement basic features of your language tooling. The following gives a brief overview of those default services and their dependencies.

### DefaultSharedModule
The `DefaultSharedModule` provides services shared among all languages.
#### ServiceRegistry
The `ServiceRegistry`service is the core of the service pattern and is responsible for registering and accessing all services.
#### Connection
The `Connection` service is responsible for handling the communication between the client and the server.
#### LangiumDocuments
The `LangiumDocuments` service maps Langium documents to their corresponding URI. It also manages the Map by adding, getting, or removing Langium documents.

*Dependencies:* [TextDocuments](#textdocuments) | [TextDocumentFactory](#textdocumentfactory) | [LangiumDocumentFactory](#langiumdocumentfactory)
#### LangiumDocumentFactory
The `LangiumDocumentFactory` service is responsible for creating Langium documents from a `TextDocument`, a `string`, or a `model`.

*Dependencies:* [ServiceRegistry](#serviceregistry)
#### DocumentBuilder
The `DocumentBuilder` is responsible for building and updating Langium documents.

*Dependencies:* [Connection](#connection) | [LangiumDocuments](#langiumdocuments) | [IndexManager](#indexmanager) | [ServiceRegistry](#serviceregistry)
#### TextDocuments
The `TextDocuments` service manages simple text documents.
#### TextDocumentFactory
The `TextDocumentFactory` is responsible for creating `TextDocument` instances and reading their content.

*Dependencies:* [ServiceRegistry](#serviceregistry)
#### IndexManager
The `IndexManager` service is responsible for keeping metadata about symbols and cross-references in the workspace. It is used to look up symbols in the global scope, mostly during linking and completion.

*Dependencies:* [ServiceRegistry](#serviceregistry) | [AstReflection](#astreflection) | [LangiumDocuments](#langiumdocuments)

### LanguageGeneratedSharedModule

#### AstReflection
The `AstReflection` service supports type checking of AST elements at runtime. It is shared between all languages and operates on the superset of types of those languages.

### DefaultModule
The `DefaultModule` contributes services specific to one unique language. Those are the basic services such as the parser and the particular language server services.
#### GrammarConfig
The `GrammarConfig` service is responsible for extracting specific information from the `Grammar`. 

*Dependencies:* [Grammar](#grammar)
#### LangiumParser
The `LangiumParser` service is set up by inspecting the rules and definitions in the grammar. The implementation is based on [Chevrotain](https://chevrotain.io/docs/).

*Dependencies:* [Grammar](#grammar) | [TokenBuilder](#tokenbuilder) | [LanguageMetaData](#languagemetadata) | [Linker](#linker) | [ValueConverter](#valueconverter)
#### ValueConverter
The `ValueConverter` service is responsible for converting string values into corresponding types.
#### TokenBuilder
The `TokenBuilder` service is responsible for creating an array of `TokenType` from the grammar file.
#### CompletionProvider
The `CompletionProvider` service is responsible for handling a *LSP Completion Request* at a given cursor position. When a *LSP Completion Request* is submitted by the client to the server, the `CompletionProvider` will create a `CompletionList` of all possible `CompletionItem` to be presented in the editor. The `CompletionProvider` service computes a new `CompletionList` after every typing.

*Dependencies:* [ScopeProvider](#scopeprovider) | [RuleInterpreter](#ruleinterpreter) | [Grammar](#grammar)
#### RuleInterpreter
The `RuleInterpreter` service is used by the `CompletionProvider` service to identify any `AbstractElement` that could be present at a given cursor position. The parser uses the best-fitting grammar rule for a given text input. However, if there are multiple rules that could be applied, only one of them will be successfully parsed. The `RuleInterpreter` service solves this issue by returning **all** possible features that could be applied at a cursor position.
#### DocumentSymbolProvider
The `DocumentSymbolProvider` service is responsible for handling a *LSP Document Symbols Request*. The `DocumentSymbolProvider` is used to return a hierarchy of all symbols found in a document as an array of `DocumentSymbol`. 

*Dependencies:* [NameProvider](#nameprovider)
#### HoverProvider
The `HoverProvider` service is responsible for handling a *LSP Hover Request* at a given text document position. By default, Langium implements the possibility to generate tooltips with the content of a multiline comment while hovering a symbol.

*Dependencies:* [References](#references)
#### FoldingRangeProvider
The `FoldingRangeProvider` service is responsible for handling a *Folding Range Request*. This service identifies all the blocks that can be folded in a document.

*Dependencies:* [GrammarConfig](#grammarconfig)
#### ReferenceFinder
The `ReferenceFinder` service is responsible for handling a *Find References Request*. This service is used to find all references to a given symbol inside of a document.

*Dependencies:* [NameProvider](#nameprovider) | [References](#references)#### GoToResolver
#### DocumentHighlighter
The `DocumentHighlighter` service is responsible for handling a *Document Highlights Request*. This service will find all references to a symbol at a given position (via the `References` service) and highlight all these references in a given document.

*Dependencies:* [References](#references) | [NameProvider](#nameprovider)
#### RenameHandler
The `RenameHandler` service is responsible for handling a *Rename Request* or a *Prepare Rename Request*. First, the service will check the validity of the *Prepare Rename Request*. If the request is valid, the service will find all references to the selected symbol inside of a document and replace all occurrences with the new value.

*Dependencies:* [ReferenceFinder](#referencefinder) | [References](#references) | [NameProvider](#nameprovider)
#### AstNodeLocator
The `AstNodeLocator` is responsible for finding a particular `AstNode` based on its location inside of a document.
#### AstNodeDescriptionProvider
The `AstNodeDescriptionProvider` is responsible for creating a description for a given `AstNode`. By default the description includes the `node`, its `name`, `type`, and `path`, as well as the `documentUri` of the document where the `AstNode` is located. This service is used during indexing to create `AstNodeDescription` for each node. This is the relevant hook for customization of language specific indexing and add more info to the index, which might later be consumed by other services.

*Dependencies:* [AstNodeLocator](#astnodelocator) | [NameProvider](#nameprovider)
#### ReferenceDescriptionProvider
The `ReferenceDescriptionProvider` is responsible for creating a description for a given reference. By default the description includes the `sourceUri`, `sourcePath`, `targetUri`, `targetPath`, `segment`, and if the reference is `local`.

*Dependencies:* [Linker](#linker) | [AstNodeLocator](#astnodelocator)
#### Linker
The `Linker` service is responsible for resolving cross-references in the AST.

*Dependencies:* [AstReflection](#astreflection) | [LangiumDocuments](#langiumdocuments) | [ScopeProvider](#scopeprovider) | [AstNodeLocator](#astnodelocator)
#### NameProvider
The `NameProvider` service is responsible for getting the name of a given `AstNode`. If the `AstNode` does not have a name, the `NameProvider` returns `undefined`.
#### ScopeProvider

*Dependencies:* [AstReflection](#astreflection) | [IndexManager](#indexmanager)
#### ScopeComputation

*Dependencies:* [NameProvider](#nameprovider) | [AstNodeDescriptionProvider](#astnodedescriptionprovider)
#### References
The `References` service is responsible for finding all references to some target node, as e.g. offered in VS Code's text editors.

*Dependencies:* [NameProvider](#nameprovider) | [IndexManager](#indexmanager) | [AstNodeLocator](#astnodelocator)
#### JsonSerializer
The `JsonSerializer` service is responsible for serializing and deserializing JSON. It is used by Langium to serialize and parse the grammar.

*Dependencies:* [Linker](#linker)
#### DocumentValidator
The `DocumentValidator` service is responsible for validating an entire document.

*Dependencies:* [ValidationRegistry](#validationregistry)
#### ValidationRegistry
The `ValidationRegistry` service manages a set of `ValidationCheck` that are defined inside of a `Validator` service.

*Dependencies:* [AstReflection](#astreflection)

### LanguageGeneratedModule
The `LanguageGeneratedModule` contributes language specific services. It is automatically (re)generated by Langium and should not be modified manually.
#### Grammar
The `Grammar` service provides information on the lexer and parser rules defined in the language grammar.
#### LanguageMetaData
The `LanguageMetaData` service contributes metadata about the language.
```typescript
export interface LanguageMetaData {
    languageId: string;
    fileExtensions: string[];
    caseInsensitive: boolean;
}
```
