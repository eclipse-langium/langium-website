---
title: "Formatting"
weight: 300
---

Langium's formatting API allows to easily create formatters for your language.
We start building a custom formatter for our language by creating a new class that inherits from `AbstractFormatter`.

```ts
import { AbstractFormatter, AstNode, Formatting } from 'langium';

export class CustomModelFormatter extends AbstractFormatter {
    protected format(node: AstNode): void {
        // This method is called for every AstNode in a document
    }
}
...
// Bind the class in your module
export const CustomModelModule: Module<CustomModelServices, PartialLangiumServices> = {
    lsp: {
        Formatter: () => new CustomModelFormatter()
    }
};
```

The entry point for the formatter is the abstract `format(AstNode)` method. The `AbstractFormatter` calls this method for every node of our model.
To perform custom formatting for every type of node, we will use pattern matching.
In the following example, we will take a closer look at a formatter for the [domain-model](https://github.com/langium/langium/tree/main/examples/domainmodel) language.
In particular, we will see how we can format the root of our model (`DomainModel`) and each nested element (`Entity` and `PackageDeclaration`).

To format each node, we use the `getNodeFormatter` method of the `AbstractFormatter`. The resulting generic `NodeFormatter<T extends AstNode>` provides us with methods to select specific parts of a parsed `AstNode` such as properties or keywords.

Once we have selected the nodes of our document that we are interested in formatting, we can start applying a specific formatting.
Each formatting option allows to prepend/append whitespace to each note.
The `Formatting` namespace provides a few predefined formatting options which we can use for this.
 
We first start off by formatting the `Domainmodel` element of our DSL.
It is the root node of every document and just contains a list of other elements.
These elements need to be realigned to the root of the document in case they are indented.
We will use the `Formatting.noIndent` options for that:

```ts
if (ast.isDomainmodel(node)) {
    // Create a new node formatter
    const formatter = this.getNodeFormatter(node);
    // Select a formatting region which contains all children
    const nodes = formatter.nodes(...node.elements);
    // Prepend all these nodes with no indent
    nodes.prepend(Formatting.noIndent());
}
```

Our other elements, namely `Entity` and `PackageDeclaration`, can be arbitrarily deeply nested, so using `noIndent` is out of the question for them.
Instead we will use `indent` on everything between the `{` and `}` tokens. The formatter internally keeps track of the current indentation level:

```ts
if (ast.isEntity(node) || isPackageDeclaration(node)) {
    const formatter = this.getNodeFormatter(node);
    const bracesOpen = formatter.keyword('{');
    const bracesClose = formatter.keyword('}');
    // Add a level of indentation to each element
    // between the opening and closing braces.
    // This even includes comment nodes
    formatter.interior(bracesOpen, bracesClose).prepend  (Formatting.indent());
    // Also move the newline to a closing brace
    bracesClose.prepend(Formatting.newLine());
    // Surround the name property of the element
    // With one space to each side
    formatter.property("name").surround(Formatting.oneSpace());
}
```

Note that most predefined `Formatting` methods accept additional arguments which make the resulting formatting more lenient.
For example, the `prepend(newLine({ allowMore: true }))` formatting will not apply formatting in case the node is already preceeded by one **or more** newlines. 
It will still correctly indent the node in case the indentation is not as expected.

<details>
<summary>Full Code Sample</summary>

```ts
import { AbstractFormatter, AstNode, Formatting } from 'langium';
import * as ast from './generated/ast';

export class DomainModelFormatter extends AbstractFormatter {

    protected format(node: AstNode): void {
        if (ast.isEntity(node) || ast.isPackageDeclaration(node)) {
            const formatter = this.getNodeFormatter(node);
            const bracesOpen = formatter.keyword('{');
            const bracesClose = formatter.keyword('}');
            formatter.interior(bracesOpen, bracesClose).prepend(Formatting.indent());
            bracesClose.prepend(Formatting.newLine());
            formatter.property('name').surround(Formatting.oneSpace());
        } else if (ast.isDomainmodel(node)) {
            const formatter = this.getNodeFormatter(node);
            const nodes = formatter.nodes(...node.elements);
            nodes.prepend(Formatting.noIndent());
        }
    }
}
```

</details>
