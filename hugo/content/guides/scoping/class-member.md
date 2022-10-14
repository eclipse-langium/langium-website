---
title: "Class Member Scoping"
weight: 200
---

In this guide we will take at member based scoping. It's a mechanism you are likely familiar with from object oriented languages such as Java, C# and JavaScript:

```java
class A {
    public B b;
}

class B {
    public String value;
}

void test() {
    A a = new A();
    B b = a.b; // Refers to the `b` defined in class `A`
    String value = b.value; // Refers to the `value` defined in class `B`
}
```

Member based scoping like this requires not only a modification of the default scoping provider, but also some other prerequisites.
This includes a member call mechanism in your grammar and a rudamentary type system.
For this guide, we will use excerpts from the [langium-lox](https://github.com/langium/langium-lox) project.
It implements a strongly-typed version of the [Lox language](https://craftinginterpreters.com/the-lox-language.html) from the popular book [Crafting Interpreters](https://craftinginterpreters.com/).

We first start with the `MemberCall` grammar rule. It references one of our `NamedElements`, which could be variable declarations, functions, classes or methods and fields of those classes. Additionally, we allow function calls. Note that the grammar has no notion of whether these elements can actually be executed as functions. Instead, we always allow function calls on every named element and simply provide validation errors in case they were used erroneously. After parsing the first member call, we continue parsing further members as long as the input text provides us with further references to elements, separated by dots.

```ts
type NamedElement = FunctionDeclaration | VariableDeclaration | MethodMember | FieldMember | Class;

MemberCall:
    // Reference a named element of our grammar
    // Variables, functions, etc.
    element=[NamedElement:ID]
    (explicitOperationCall?='(' (
	    arguments+=Expression (',' arguments+=Expression)*
	)? ')')?
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

A very important aspect of these chained member calls is the action which rewrites the resulting AST. In this case, it effectively reverses the direction of member call AST nodes. Instead of starting with the first encountered member call and then traversing down to the last, we start with the last and traverse the list of member calls up using the `previous` property. The reason for doing this becomes clear when looking at the scope provider for the Lox language:

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

When trying to compute the type of an expression, we are actually only interested in the final piece of the member call. However, to derive the type and scope of the final member call, we have to recursive identify the type of the previous member call. This is done by looking at the member call stored in the `previous` property and inferring its type. See [here](https://github.com/langium/langium-lox/blob/main/src/language-server/type-system/infer.ts) for the full implementation of the type inference system. Note that type inference requires scoping. This leads us to the following invocation graph:

{{<mermaid>}}
graph LR;
A(<b>Lox Scope Provider</b><br><i>Member Call</i>) 
--> B(<b>Type Inference</b><br><i>Class</i>)
B --> C(<b>Lox Scope Provider</b><br><i>Member Call</i>)
C --> D(<b>Type Inference</b><br><i>Class</i>)
D --> E(...)
E --> F(<b>Lox Scope Provider</b><br><i>Variable Declaration</i>)
{{</mermaid>}}

We recursively alternate between the scope provider and the type inference system until we arrive at a member call without any previous member call. At this point we resolve the reference using the default lexical scoping which is builtin into Langium. Note that it is recommended to cache type inference information as this naive approach to inference can quickly lead to performance issues.
