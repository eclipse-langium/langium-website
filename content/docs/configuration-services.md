---
title: "Configuration via Services"
---
Langium makes possible the configuration of most aspects of your language and Language Server Protocol (LSP) via a set of `Services`. Those services are organized into `Modules` which are essentially mappings from a service name to its implementation.

We can separate modules into two main categories:
1. ***Shared modules*** which contain services which are common across all languages.
2. ***Language specific modules*** which contain services specific to one language. 

## Shared Modules
The *shared modules* contain services shared across all languages. They include :
* The `ServiceRegistry` which is responsible for registering and getting the different services.
* The `Connection` service which holds information about the connection between the client and the server.
* Services to handle `Langium Documents` and `Text Documents`.
* Implementations of the `AstReflection` service (one implementation per language) to access the structure of the AST.

## Language Specific Modules
The *language specific modules* contain all services which are specific to one language:
* Services to build the `parser` for a specific language.
* Services to handle `LSP requests`.
* Services to retrieve information from a given AST.
* Services to manage references during linking and inside of documents.
* Serialization and deserialization of objects to JSON.
* Services to handle document and syntax validation.

## Customization
The entry point to services customization is found in the `src/language-server/...-module.ts` file, where '...' is the name of your language. There, you can register new services or override the default implementation of services. Langium implements the *Inversion of Control* pattern via *Dependency Injection* which promotes loosely-coupled architecture, maintainability and extensibility.

For the following sections, we will use the [arithmetics example](https://github.com/langium/langium/tree/main/examples/arithmetics) to describe the procedure for adding or replacing services. Note that all notation containing *Arithmetics* should be understood as being specific to the language named *Arithmetics* and should be replaced with your own language name.

### Adding New Services
To add services which are not implemented by default by Langium, we first need to edit the type `ArithmeticsAddedService`.
A language with no added services would have the type `ArithmeticsAddedService` declared as:
```Typescript
export type ArithmeticsAddedServices = {}
```
Inside of this type declaration, you can add new services as *type properties* following the pattern `Property name: Property Type`:
```Typescript
export type ArithmeticsAddedServices = {
    ArithmeticsValidator: ArithmeticsValidator
}
```
Our `ArithmeticsAddedService` type now has a property `ArithmeticsValidator` of type `ArithmeticsValidator`.

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

Now that we have declared our new services inside of the `ArithmeticsAddedServices` type, we need to specify to the module how we want them to be implemented. To do so, we need to modify the `ArithmeticsModule`:
```Typescript
export const ArithmeticsModule: Module<ArithmeticsServices, PartialLangiumServices & ArithmeticsAddedServices> = {
    validation: {
        ArithmeticsValidator: () => new ArithmeticsValidator()
    }
};
```
In the `ArithmeticsModule`, we map a property with the name of our service (here `ArithmeticsValidator`) to a concrete implementation of the service. This means that every time we need to call the service named "ArithmeticsValidator", a new instance of the class `ArithmeticsValidator` will be created. 

The `ArithmeticsValidator` service does not depend on other services, and no argument is passed during the instantiation of the class. If you implement a service which depends on other service, you need to pass all services from the `ServiceRegistry` as an argument to the arrow function such as:
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

### Overriding and Extending Services
Sometimes, you would want to change the behavior of a service or add to its functionality. Thanks to the *inversion of control* via *dependency injection*, this can be achieved in one place without having to modify every piece of code that depends on the service to be overridden or extended.

Let's say that you want to fully replace a service named `MyService` which implements `MyServiceInterface` interface and instantiate an instance of the class `DefaultServiceClass`.

You would find the module declaration with the following line inside:
```Typescript
MyService: () => new DefaultServiceClass()
```
And `DefaultServiceClass` declared as:
```Typescript
export class DefaultServiceClass implements MyServiceInterface {
    /* service logic */
}
```
Now, you want to replace `DefaultServiceClass` with a custom implementation `MyNewServiceClass`. To do so, you would first create your class `MyNewServiceClass` containing the service logic. `MyNewServiceClass` **needs to implement** `MyServiceInterface`.
```Typescript
export class MyNewServiceClass implements MyServiceInterface {
    /* service logic */
}
```
You then need to change how the module instantiate your service:
```Typescript
MyService: () => new MyNewServiceClass()
```
Now, every call to `MyService` will create an instance of `MyNewServiceClass` instead of `DefaultServiceClass`.

In real scenarios, it is not recommend to completely replace a service. Instead, it is possible to extend a class and override only specific parts of it. Let's take a look at the `ArithmeticsModule` from the [arithmetics example](https://github.com/langium/langium/tree/main/examples/arithmetics).

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
The `ArithmeticsValidator` is an [added service](#adding-new-services) while `ArithmeticsValidationRegistry` and `ArithmeticsScopeProvider` override `ValidationRegistry` and `DefaultScopeProvider`, respectively. When a call is made to `ValidationRegistry` or `ScopeProvider`, it will now create an instance of `ArithmeticsValidationRegistry` or `ArithmeticsScopeProvider` instead of the defaults `ValidationRegistry` or `DefaultScopeProvider`.

In `ArithmeticsValidationRegistry`, we want to register our new `ArithmeticsValidator` to the `ValidationRegistry`.
`ArithmeticsValidator` implements two checks, `checkDivByZero` and `checkNormalisable`:
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

It is however possible for a child class to override functionalities from its parent. `ArithmeticsScopeProvider` overrides two functions from its parent class.
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
The functions `createScope` and `getGlobalScope` are already defined in `DefaultScopeProvider` but needed to be overridden to add the option `{caseInsensitive: true}`. In the `DefaultScopeProvider` they are defined as:
```Typescript
protected createScope(elements: Stream<AstNodeDescription>, outerScope: Scope): Scope {
    return new SimpleScope(elements, outerScope);
}

protected getGlobalScope(referenceType: string): Scope {
    return new SimpleScope(this.indexManager.allElements(referenceType));
}
```
Now, when we call either `createScope` or `getGlobalScope` from the `ScopeProvider` service, the call will be made from teh `ArithmeticsScopeProvider` instead of the `DefaultScopeProvider`. Functions that were not overridden will still be called from `DefaultScopeProvider` via inheritance.

## Default Services
Langium comes pre-packed with a set of services which will handle the most usual features of your language and the LSP. The following gives a brief overview of these default services and their dependencies.

### DefaultSharedModule
The `DefaultSharedModule` contains services shared between all languages.
#### ServiceRegistry
The `ServiceRegistry`service is the core of the service pattern and is responsible for registering and accessing all services.
#### Connection
The `Connection` service is responsible for handling the communication between the client and the server.
#### LangiumDocuments
The `LangiumDocuments` service manages Langium documents. It is responsible for adding, getting, and removing Langium documents.

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
The `AstReflection` service is responsible for accessing the structure of the AST. It is shared between all languages and operates on the superset of types of those languages.

### DefaultModule
The `DefaultModule` contains services specific to one unique language. These are the basic services such as configuring the parser or the LSP.
#### GrammarConfig
#### GrammarConfig
The `GrammarConfig` service is responsible for extracting specific information from the `Grammar`. By default, the `GrammarConfig` service extracts rules for multiline comments.

*Dependencies:* [Grammar](#grammar)
#### LangiumParser
The `LangiumParser` service is responsible for creating the parser. It extracts information from the grammar and creates the parser using Chevrotain.

*Dependencies:* [Grammar](#grammar) | [TokenBuilder](#tokenbuilder) | [LanguageMetaData](#languagemetadata) | [Linker](#linker) | [ValueConverter](#valueconverter)
#### ValueConverter
The `ValueConverter` service is responsible for converting an input into its correct primitive type. The parser parses the input file as a collection of strings which need to be converted to their respective type.
#### TokenBuilder
The `TokenBuilder` service is responsible for creating an array of `TokenType` from the grammar file.
#### CompletionProvider
The `CompletionProvider` service is responsible for handling a *Completion Request* at a given cursor position. When a *Completion Request* is submitted by the client to the server, the `CompletionProvider` will create a `CompletionList` of all possible `CompletionItem` to be presented in the editor. The `CompletionProvider` service computes a new `CompletionList` after every typing.

*Dependencies:* [ScopeProvider](#scopeprovider) | [RuleInterpreter](#ruleinterpreter) | [Grammar](#grammar)
#### RuleInterpreter
The `RuleInterpreter` service is used by the `CompletionProvider` service to identify any `AbstractElement` that could be present at a given cursor position. The parser uses the best-fitting grammar rule for a given text input. However, if there are multiple rules that could be applied, only one of them will be successfully parsed. The `RuleInterpreter` service solves this issue by returning **all** possible features that could be applied at a cursor position.
#### DocumentSymbolProvider
The `DocumentSymbolProvider` service is responsible for handling a *Document Symbols Request*. The `DocumentSymbolProvider` is used to return a hierarchy of all symbols found in a document as an array of `DocumentSymbol`. 

*Dependencies:* [NameProvider](#nameprovider)
#### HoverProvider
The `HoverProvider` service is responsible for handling a *Hover Request* at a given text document position. By default, Langium implements the possibility to generate tooltips with the content of a multiline comment while hovering a symbol.

*Dependencies:* [References](#references)
#### FoldingRangeProvider
The `FoldingRangeProvider` service is responsible for handling a *Folding Range Request*. This service identifies all the blocks that can be folded in a document. By default, Langium adds the possibility to fold multiline comments.

*Dependencies:* [GrammarConfig](#grammarconfig)
#### ReferenceFinder
The `ReferenceFinder` service is responsible for handling a *Find References Request*. This service is used to find all references to a given symbol inside of a document.

*Dependencies:* [NameProvider](#nameprovider) | [References](#references)#### GoToResolver
#### DocumentHighlighter
The `DocumentHighlighter` service is responsible for handling a *Document Highlights Request*. This service will find all references to a symbol at a given position (via the `References` service) and highlight all these references in a given document.

*Dependencies:* [References](#references) | [NameProvider](#nameprovider)
#### RenameHandler
The `RenameHandler` service is responsible for handling a *Rename Request* or a *Prepare Rename Request*. First, the service will check the validity of the *Prepare Rename Request*. If the request is valid, the service will find all references to the selected symbol inside of a document and replace all occurences with the new value.

*Dependencies:* [ReferenceFinder](#referencefinder) | [References](#references) | [NameProvider](#nameprovider)
#### AstNodeLocator
The `AstNodeLocator` is responsible for finding a particular `AstNode` inside of a document and return its path or the node itself.
#### AstNodeDescriptionProvider
The `AstNodeDescriptionProvider` is responsible for creating a description for a given `AstNode`. By default the description includes the `node`, its `name`, `type`, and `path`, as well as the `documentUri` of the document where the `AstNode` is located.

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
The `References` service is responsible for finding all references to the target node.

*Dependencies:* [NameProvider](#nameprovider) | [IndexManager](#indexmanager) | [AstNodeLocator](#astnodelocator)
#### JsonSerializer
The `JsonSerializer` service is responsible for serializing and deserializing JSON.

*Dependencies:* [Linker](#linker)
#### DocumentValidator
The `DocumentValidator` service is responsible for validating an entire document.

*Dependencies:* [ValidationRegistry](#validationregistry)
#### ValidationRegistry
The `ValidationRegistry` service manages a set of `ValidationCheck` that are defined inside of a `Validator` service.

*Dependencies:* [AstReflection](#astreflection)

### LanguageGeneratedModule
The `LanguageGeneratedModule` contains services specific to the grammar of a given language. They are automatically generated by Langium and should not be modified.
#### Grammar
The `Grammar` service holds a collection of terminal and parser rules defined by the language grammar.
#### LanguageMetaData
The `LanguageMetaData` service holds metadata about the language.
```typescript
export interface LanguageMetaData {
    languageId: string;
    fileExtensions: string[];
    caseInsensitive: boolean;
}
```

### LanguageModule
The `LanguageModule` contains the added and overridden services. See [this section](#customization) for more information.
