---
title: "Class Member Scoping"
weight: 200
---

For this guide, we will use excerpts from the [langium-lox](https://github.com/langium/langium-lox) project.
It implements a strongly-typed version of the [Lox language](https://craftinginterpreters.com/the-lox-language.html) from the popular book [Crafting Interpreters](https://craftinginterpreters.com/).



```ts
type NamedElement = Parameter | FunctionDeclaration | VariableDeclaration | MethodMember | FieldMember | Class;

MemberCall infers Expression:
    // Reference a named element of our grammar
    // Variables, functions, etc.
    element=[NamedElement:ID]
    // Create a new `MemberCall` and assign the old one to the `previous` property
	({infer MemberCall.previous=current} 
        // Member call with function call
        ("." element=[NamedElement:ID] (
		explicitOperationCall?='('
		(
		    arguments+=Expression (',' arguments+=Expression)*
		)?
		')')? 
        // Chained function call without a member
        | (
		explicitOperationCall?='('
		(
		    arguments+=Expression (',' arguments+=Expression)*
		)?
		')'))
    )*;
```

```ts
export class LoxScopeProvider extends DefaultScopeProvider {

    constructor(services: LangiumServices) {
        super(services);
    }

    override getScope(context: ReferenceInfo): Scope {
        // target element of member calls
        if (context.property === 'element' && isMemberCall(context.container)) {
            const memberCall = context.container;
            const previous = memberCall.previous;
            if (!previous) {
                return super.getScope(context);
            }
            const previousType = inferType(previous, new Map());
            if (isClassType(previousType)) {
                return this.scopeClassMembers(previousType.literal);
            }
            // When the target of our member call isn't a class
            // Simply return an empty scope
            return EMPTY_SCOPE;
        }
        return super.getScope(context);
    }

    private scopeClassMembers(classItem: Class): Scope {
        const allMembers = getClassChain(classItem).flatMap(e => e.members);
        return this.createScopeForNodes(allMembers);
    }
}
```
