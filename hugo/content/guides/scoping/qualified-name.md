---
title: "Qualified Name Scoping"
weight: 100
---

Qualified name scoping refers to a style of referencing elements using a fully qualified name. This is done in C-like languages using namespaces or in Java using packages.
The following shows an example of this using a function in a C++ namespace:

```cpp
namespace QualifiedName {
    void target();
}

void h() {
    // Should call the `target` function defined in the `QualifiedName` namespace
    QualifiedName::target();
}
```

This behavior can be achieved in Langium by exporting the `target` function under the name `QualifiedName::target`. We will first set up a new `ScopeComputation` class that extends the `DefaultScopeComputation` and bind it in our module:

```ts
// Scope computation for C++
export class CppScopeComputation extends DefaultScopeComputation {

    constructor(services: LangiumServices) {
        super(services);
    }
}

// Services module for overriding the scope computation
export const CppModule: Module<CppServices, PartialLangiumServices & CppAddedServices> = {
    references: {
        ScopeComputation: (services) => new CppScopeComputation(services)
    }
}
```

Next, we can already start building our custom `computeExports` override which allows us to change export nodes of our model using qualified names:

```ts
export class CppScopeComputation extends DefaultScopeComputation {

    // Emitting previous implementation for brevity

    /**
     * Export all functions using their fully qualified name
     */
    override async computeExports(document: LangiumDocument): Promise<AstNodeDescription[]> {
        const exportedDescriptions: AstNodeDescription[] = [];
        for (const childNode of streamAllContents(document.parseResult.value)) {
            if (isFunctionDeclaration(childNode)) {
                const fullyQualifiedName = this.getQualifiedName(childNode, childNode.name);
                // `descriptions` is our `AstNodeDescriptionProvider` defined in `DefaultScopeComputation`
                // It allows us to easily create descriptions that point to elements using a name.
                exportedDescriptions.push(this.descriptions.createDescription(modelNode, fullyQualifiedName, document));
            }
        }
        return exportedDescriptions;
    }

    /**
     * Build a qualified name for a model node
     */
    private getQualifiedName(node: AstNode, name: string): string {
        let parent: AstNode | undefined = node.$container;
        while (isNamespace(parent)) {
            // Iteratively prepend the name of the parent namespace
            // This allows us to work with nested namespaces
            name = `${parent.name}::${name}`;
            parent = parent.$container;
        }
        return name;
    }
```

Once we start exporting functions using their fully qualified name, references such as `QualifiedName::target` start working correctly. We can even nest multiple namespaces to create `Fully::Qualified::Name::target`. However, this leads us to another problem. We can now **only** reference functions using their fully qualified names, even if they're locally available:

```cpp
namespace QualifiedName {
    void target();
    void test() {
        // Will not link correctly
        target(); 
        // Requires the new fully qualified name
        QualifiedName::target();
    }
}
```

To rectify this change, we have to override the `computeLocalScopes` method. It serves as a way of providing access to elements which aren't exported globally. We can also use it to provide secondary access to the globally available objects using a local name.

```ts
export class CppScopeComputation extends DefaultScopeComputation {

    // Emitting previous implementation for brevity

    override async computeLocalScopes(document: LangiumDocument): Promise<PrecomputedScopes> {
        const model = document.parseResult.value as CppProgram;
        // This map stores a list of descriptions for each node in our document
        const scopes = new MultiMap<AstNode, AstNodeDescription>();
        this.processContainer(model, scopes, document);
        return scopes;
    }

    protected processContainer(
        container: CppProgram | Namespace, 
        scopes: PrecomputedScopes, 
        document: LangiumDocument
    ): AstNodeDescription[] {
        const localDescriptions: AstNodeDescription[] = [];
        for (const element of container.elements) {
            if (isFunctionDeclaration(element)) {
                // Create a simple local name for the function
                const description = this.descriptions.createDescription(element, element.name, document);
                localDescriptions.push(description);
            } else if (isNamespace(element)) {
                const nestedDescriptions = this.processContainer(element, scopes, document, cancelToken);
                for (const description of nestedDescriptions) {
                    // Add qualified names to the container
                    // This could also be a partial qualified name
                    const qualified = this.createQualifiedDescription(element, description, document);
                    localDescriptions.push(qualified);
                }
            }
        }
        scopes.addAll(container, localDescriptions);
        return localDescriptions;
    }

    protected createQualifiedDescription(
        container: Namespace, 
        description: AstNodeDescription, 
        document: LangiumDocument
    ): AstNodeDescription {
        // `getQualifiedName` has been implemented in the previous section
        const name = this.getQualifiedName(container.name, description.name);
        return this.descriptions.createDescription(description.node!, name, document);
    }
}
```

This new change now allows us to use local names of functions in the local scope, while they are still being exported using their fully qualified name to the global scope.
Another example for this style of scoping can be seen in the [domain-model example language](https://github.com/langium/langium/tree/main/examples/domainmodel).
