---
title: "Class Member Scoping"
weight: 200
---

In this guide we will take a look at member based scoping. It's a mechanism you are likely familiar with from object oriented languages such as Java, C# and JavaScript:

```ts
class A {
    b: B;
}

class B {
    value: string;
}

function test(): void {
    const a = new A();
    const b = a.b; // Refers to the `b` defined in class `A`
    const value = b.value; // Refers to the `value` defined in class `B`
}
```

Member based scoping like this requires not only a modification of the default scoping provider, but also some other prerequisites.
This includes adding a member call mechanism in your grammar and a rudimentary type system.
For this guide, we will use excerpts from the [langium-lox](https://github.com/eclipse-langium/langium-lox) project to demonstrate how you can set this up yourself.
This project implements a strongly-typed version of the [Lox language](https://craftinginterpreters.com/the-lox-language.html) from the popular book [Crafting Interpreters](https://craftinginterpreters.com/).

We'll first start with the `MemberCall` grammar rule, which references one of our `NamedElements`. These elements could be variable declarations, functions, classes or methods and fields of those classes. Additionally, we want to allow function calls on elements. Note that the grammar has no notion of whether these elements can actually be executed as functions. Instead, we always allow function calls on every named element, and simply provide validation errors in case an element is called erroneously. After parsing the first member call, we continue parsing further members as long as the input text provides us with further references to elements; which are separated by dots.

```langium
type NamedElement = FunctionDeclaration | VariableDeclaration | MethodMember | FieldMember | Class;

MemberCall:
    // Reference a named element of our grammar
    // Variables, functions, etc.
    element=[NamedElement:ID]
    // Parse an operation call on this element
    (explicitOperationCall?='(' (
        // Parse any arguments for the operation call
	    arguments+=Expression (',' arguments+=Expression)*
	)? ')')?
    // Create a new `MemberCall` and assign the old one to the `previous` property
    // The previous member call can either be the member call that was parsed in the previous section
    // Or one that is parsed in the next section due to the repetition at the end of this group
    ({infer MemberCall.previous=current} 
        // We repeat the named element reference
        ("." element=[NamedElement:ID] (
        // Parse an operation call again
		explicitOperationCall?='('
		(
		    arguments+=Expression (',' arguments+=Expression)*
		)?
		')')?
        // Our language allows to return functions in functions
        // So we need to be able to call multiple functions without any element references
        | (
		explicitOperationCall?='('
		(
		    arguments+=Expression (',' arguments+=Expression)*
		)?
		')'))
    )*;
```

A very important aspect of these chained member calls is the action (`{infer MemberCall.previous=current}`) which rewrites the resulting AST. In this case, it reverses the direction of member call AST nodes. Instead of starting with the first encountered member call and then traversing down to the last, we start with the last and traverse the list of member calls up using the `previous` property. The reason for doing this becomes clear when looking at the scope provider for the Lox language:

```ts
export class LoxScopeProvider extends DefaultScopeProvider {

    override getScope(context: ReferenceInfo): Scope {
        // target element of member calls
        if (context.property === 'element' && isMemberCall(context.container)) {
            const memberCall = context.container;
            const previous = memberCall.previous;
            if (!previous) {
                return super.getScope(context);
            }
            const previousType = inferType(previous);
            if (isClassType(previousType)) {
                return this.scopeClassMembers(previousType.literal);
            }
            // When the target of our member call isn't a class
            // This means it is either a primitive type or a type resolution error
            // Simply return an empty scope
            return EMPTY_SCOPE;
        }
        return super.getScope(context);
    }

    private scopeClassMembers(classItem: Class): Scope {
        // Since Lox allows class-inheritance,
        // we also need to look at all members of possible super classes for scoping
        const allMembers = getClassChain(classItem).flatMap(e => e.members);
        return this.createScopeForNodes(allMembers);
    }
}
```

When trying to compute the type of an expression, we are only interested in the final piece of the member call. However, to derive the type and scope of the final member call, we have to recursively identify the type of the previous member call. This is done by looking at the member call stored in the `previous` property and inferring its type. See [here for the full implementation of the type inference system in Lox](https://github.com/eclipse-langium/langium-lox/blob/main/src/language-server/type-system/infer.ts). This kind of type inference requires scoping.

To illustrate this behavior a bit better, take a look at the following code snippet:

```ts
class Container {
    sub: SubContainer
}

class SubContainer {
    name: string
}

// Constructor call
var element = Container();
// Member access
println(element.sub.name);
```

We recursively alternate between the scope provider and the type inference system until we arrive at a member call without any previous member call. At this point we resolve the reference using the default lexical scoping which is builtin into Langium. With our scope provider in place, we can visualize how it interacts with Langium's implementation of Lox in the following sequence diagram:

{{<mermaid>}}
sequenceDiagram
    participant R as Language Runtime
    participant T as Type System
    participant S as Scope Provider
    participant L as Lexical Scope
    R->>T: Ask for type of expression<br>`element.sub.name`
    T->>S: Ask for `name` node
    S->>T: Ask for `sub` type
    T->>S: Ask for `sub` node
    S->>T: Ask for `element` type
    T->>S: Ask for `element` node
    S->>L: Ask for `element` node
    L->>S: Give `element` node
    S->>T: Give `element` node
    T->>S: Ask for `Container` node
    S->>L: Ask for `Container` node
    L->>S: Give `Container` node
    S->>T: Give `Container` node
    T->>S: Give `Container` type result
    S->>T: Give `sub` node
    T->>S: Give `SubContainer` type result
    S->>T: Give `name` node
    T->>R: Give `string` type result
{{</mermaid>}}

When trying to infer the type of the expression `element.sub.name`,
we can see that this results in quite a lot of computations throughout the scoping and type systems. It is therefore recommended to cache type inference information as this naive approach to inference can quickly lead to performance issues.
