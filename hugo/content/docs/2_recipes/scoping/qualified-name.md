---
title: "Qualified Name Scoping"
weight: 100
---

Qualified name scoping refers to a style of referencing elements using a fully qualified name.
Such a fully qualified name is usually composed of the original name of the target element and the names of its container elements. 
You will usually see this method of scoping in C-like languages using namespaces or in Java using packages.
The following code snippet shows an example of how qualified name scoping works from an end-user perspective, by using a function in a C++ namespace:

```cpp
namespace Langium {
    void getDocumentation();
}

void main() {
    // Should call the `getDocumentation` function defined in the `Langium` namespace
    Langium::getDocumentation();
}
```

As can be seen, using qualified name scoping is quite helpful in this case. It allows us to reference the `getDocumentation` function through the scope computed & made available by the `Langium` namespace, even though it's not directly accessible within the scope of `main` by itself.

Note that such behavior can also be accomplished using [class member scoping](./class-member).
However, there is one core advantage to using globally available elements:
Compared to member scoping, this type of scoping requires few resources.
The lookup required for qualified name scoping can be done in near constant time with just a bit of additional computation on a **per-document** basis, whereas member scoping needs to do a lot of computation on a **per-reference** basis.
With large workspaces, complex scoping might become a performance bottleneck.

This behavior can be achieved in Langium by exporting the `getDocumentation` function under the name `Langium::getDocumentation`. To do this, we will first set up a new `ScopeComputation` class that extends the `DefaultScopeComputation`. This class will be responsible for our custom scope computation. Then, we'll want to bind our custom scope computation class in our module:

```ts
// Scope computation for our C++-like language
export class CppScopeComputation extends DefaultScopeComputation {

    constructor(services: LangiumServices) {
        super(services);
    }
}

// Services module for overriding the scope computation
// Your language module is usually placed in your `<dsl-name>-module.ts` file
export const CppModule: Module<CppServices, PartialLangiumServices & CppAddedServices> = {
    references: {
        ScopeComputation: (services) => new CppScopeComputation(services)
    }
}
```

Next, we can start implementing our custom scoping by overriding the `computeExports` function. This function is particularly important, as it allows us to change export nodes of our model using qualified names: We'll also want to annotate this function with `override`, since there's already a default definition provided.

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

Once we start exporting functions using their fully qualified name, references such as `QualifiedName::target` will start working correctly. We can even nest multiple namespaces to create `Fully::Qualified::Name::target`. However, this leads us to another problem. We can now only reference functions using their fully qualified names, even if they're locally available:

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

To rectify this problem, we have to override the `computeLocalScopes` method, which provides access to elements that aren't exported globally. We can also use this method to provide secondary access to globally available objects using a local name.

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

    private processContainer(
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

    private createQualifiedDescription(
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

This new change now allows us to use local names of functions in the local scope, while they are still exported using their fully qualified name to the global scope.
Another example for this style of scoping can be seen in the [domain-model example language](https://github.com/eclipse-langium/langium/tree/main/examples/domainmodel).
Also, click the following note to see the full implementation of the scope computation service.

<details>
<summary>Full Implementation</summary>

```ts
export class CppScopeComputation extends DefaultScopeComputation {

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

    override async computeLocalScopes(document: LangiumDocument): Promise<PrecomputedScopes> {
        const model = document.parseResult.value as CppProgram;
        // This multi-map stores a list of descriptions for each node in our document
        const scopes = new MultiMap<AstNode, AstNodeDescription>();
        this.processContainer(model, scopes, document);
        return scopes;
    }

    private processContainer(
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
                    // This could also be a partially qualified name
                    const qualified = this.createQualifiedDescription(element, description, document);
                    localDescriptions.push(qualified);
                }
            }
        }
        scopes.addAll(container, localDescriptions);
        return localDescriptions;
    }

    private createQualifiedDescription(
        container: Namespace, 
        description: AstNodeDescription, 
        document: LangiumDocument
    ): AstNodeDescription {
        const name = this.getQualifiedName(container.name, description.name);
        return this.descriptions.createDescription(description.node!, name, document);
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
}
```

</details>
