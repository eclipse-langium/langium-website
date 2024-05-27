---
title: 'Document Lifecycle'
weight: 300
aliases:
  - /docs/document-lifecycle
---

`LangiumDocument` is the central data structure in Langium that represents a text file of your DSL. Its main purpose is to hold the parsed Abstract Syntax Tree (AST) plus additional information derived from it. After its creation, a `LangiumDocument` must be "built" before it can be used in any way. The service responsible for building documents is called `DocumentBuilder`.

A `LangiumDocument` goes through seven different states during its lifecycle:
1. `Parsed` when an AST has been generated from the content of the document.
2. `IndexedContent` when the AST nodes have been processed by the `IndexManager`.
3. `ComputedScopes` when local scopes have been prepared by the `ScopeComputation`.
4. `Linked` when the `Linker` has resolved cross-references.
5. `IndexedReferences` when the references have been indexed by the `IndexManager`.
6. `Validated` when the document has been validated by the `DocumentValidator`.
7. `Changed` when the document has been modified.

State 1 is the initial state after creation of a document, and states 2 to 6 are part of its build process. State 7 is a final state used to mark the document as invalid due to a change in the source text.

The following diagram depicts how the `DocumentBuilder` processes `LangiumDocument`s depending on their state. More details about each step of the lifecycle can be found below.

{{<mermaid>}}
graph TD;
N(LangiumDocumentFactory) -.-|Creation of LangiumDocuments| C{{Parsed}}

A(DocumentBuilder) -->|Indexing of symbols| D(IndexManager) -.- E{{IndexedContent}}
A -->|Computing scopes| F(ScopeComputation) -.- G{{ComputedScopes}}
A -->|Linking| H(Linker) -.- I{{Linked}}
A -->|Indexing of cross-references| J(IndexManager) -.- K{{IndexedReferences}} 
A -->|Validation| L(DocumentValidator) -.- M{{Validated}}

click N "./#creation-of-langiumdocuments"
click D "./#indexing-of-symbols"
click F "./#computing-scopes"
click H "./#linking"
click J "./#indexing-of-cross-references"
click L "./#validation"
{{</mermaid>}}

## Creation of LangiumDocuments
When the workspace is initialized, all files having an extension matching those defined in `langium-config.json` are collected by the `WorkspaceManager` service. The `LangiumDocumentFactory` service creates a new instance of `LangiumDocument` for each source file. Those documents are then stored in memory by the `LangiumDocuments` service so they can be accessed later.

Files in the workspace are mapped to instances of `TextDocument` as implemented by the `vscode-languageserver` package. Such a `TextDocument` holds the content of the respective file as a `string`. In contrast, a `LangiumDocument` represents the file content as an AST. This means that the creation of a `LangiumDocument` by the `LangiumDocumentFactory` service is accompanied by the parsing of the content of a `TextDocument` into an AST. During the creation of a `LangiumDocument` (i.e. after the document has been parsed), its state is set to `Parsed`.

{{<mermaid>}}
graph LR;
A(<b>LangiumDocuments</b><br><br><i>manages LangiumDocument instances</i>) --> B(<b>LangiumDocumentFactory</b><br><br><i>creates a LangiumDocument</i>)
B --> C(<b>LangiumParser</b><br><br><i>parses a string into an AST</i>)
{{</mermaid>}}

Once all `LangiumDocument`s have been created, the `DocumentBuilder` service will sequentially process each `LangiumDocument` as described below.

## Indexing of Symbols
Symbols are AST nodes that can be identified with a *name* and hence can be referenced from a *cross-reference*. Symbols that are *exported* can be referenced from other documents, while non-exported symbols are local to the document containing them. The `IndexManager` service keeps an index of all symbols that are exported from documents in the workspace. The set of all these exported symbols is called the *global scope*.

Indexing of the exported symbols of an AST is executed on documents with the state `Parsed`. The default `ScopeComputation` service creates an `AstNodeDescription` for the root node (i.e. the node created by parsing the entry rule) and each named `AstNode` directly descending from the root node. This `AstNodeDescription` contains the `type` of the node, its identifier (i.e. the `name` property), the URI of the document where the node is located, and the location of the node inside of the document. The generated set of `AstNodeDescription`s makes symbols from a `LangiumDocument` accessible to other documents in the same workspace.

The default `ScopeComputation` can be overridden to change the selection of exported symbols, or to export them with different names than the plain value of their `name` property. However, keep in mind that you cannot access any cross-references in this phase because that requires the document state to be at least `ComputedScopes`, which happens later in the build process.

Once the initial indexing is done, the document's state is set to `IndexedContent`.

{{<mermaid>}}
graph LR;
A(<b>IndexManager</b><br><br><i>manages exported content<br>of LangiumDocuments</i>) --> B(<b>ScopeComputation</b><br><br><i>creates descriptions<br>of all exported symbols</i>)
B --> C(<b>NameProvider</b><br><br><i>resolves the name of an AstNode</i>)
B --> D(<b>AstNodeLocator</b><br><br><i>gets the path of an AstNode</i>)
{{</mermaid>}}

## Computing Scopes
This phase is executed on documents with the state `IndexedContent` and is required to complete **prior to** resolving cross-references.

Local scope computation consists of gathering all symbols contained in the AST, done by the `ScopeComputation` service (in addition to the indexing explained in the previous section). Metadata of the gathered symbols are represented with `AstNodeDescription` like in the [initial indexing phase](#indexing-of-symbols). These metadata are attached to the `LangiumDocument` in a multi-map structure that associates a (possibly empty) set of symbol descriptions to each container node of the AST, called the *precomputed scopes*. These are used in the linking phase to construct the actual *scope* of a cross-reference, i.e. all possible symbols that are reachable. A symbol in the precomputed scopes is reachable from a specific cross-reference if it is associated with a direct or indirect container of that reference. Symbols associated to the root node are reachable from the whole AST, while symbols associated with an inner node are reachable from the respective sub-tree.

The default implementation of the `ScopeComputation` service attaches the description of every symbol to its direct container. This means that the container holds information about which named nodes are nested inside of it. You can override this default behavior to change the position where a symbol is reachable, or to change the name by which it can be referenced. It is even possible to associate the same symbol to multiple container nodes, possibly with different names, to control precisely where and how references to it can be resolved. However, keep in mind that you cannot access any cross-references in this phase. More complex, context-dependent scope mechanisms can be implemented in the `ScopeProvider` (see [next section](#linking)).

The *"Domainmodel"* example includes a [customization of scopes precomputation](https://github.com/eclipse-langium/langium/blob/main/examples/domainmodel/src/language-server/domain-model-scope.ts) where every *entity* contained in a *package declaration* is exposed using its *qualified name*, that is the concatenation of the package name and entity name separated with `.` (similar to Java).

In languages with a type system, you would typically implement computation of types in an additional pre-processing step in order to make type information available in the document. This additional step can be registered to run after scope computation with the `onBuildPhase` method of `DocumentBuilder`. How types are computed heavily depends on the kind of type system, so there is no default implementation for it.

Once local scopes are computed and attached to the document, the document's state is set to `ComputedScopes`.

{{<mermaid>}}
graph LR;
A(<b>ScopeComputation</b><br><br><i>gathers all symbols from the AST and<br>stores their metadata in a MulitMap</i>) --> B(<b>NameProvider</b><br><br><i>resolves the name of an AST node</i>)
A --> C(<b>AstNodeDescriptionProvider</b><br><br><i>creates descriptions of the<br>gathered symbols</i>)
C --> D(<b>AstNodeLocator</b><br><br><i>gets the path of an AstNode</i>)
{{</mermaid>}}

## Linking
Once local scopes have been prepared, cross-references are resolved via the `Linker` service. The `Linker` retrieves all cross-references in a `LangiumDocument` and tries to resolve them. Reference resolution consists of three main steps:

 1. Query the `ScopeProvider` to obtain a *scope*. A scope describes all symbols that are reachable from the AST node holding the cross-reference.
 2. In the obtained scope, find the description of a symbol whose name matches the identifier given at the cross-reference.
 3. Load the AST node for that description. The AST node is given either directly (for a local symbol) or indirectly though a path string (for a symbol exported from another document).

The default implementation of the `ScopeProvider` service creates a hierarchical scope by traveling from the given cross-reference via its container nodes up to the root of the AST, and collecting symbol descriptions from the precomputed scopes (created in the [preceding phase](#computing-scopes)). The symbols are filtered to match the type of the cross-reference target. Symbols that are closer to the cross-reference *shadow* those that are further above in the AST, which means they have higher priority to be chosen as cross-reference targets.  As the last resort, the global scope computed in the [initial indexing phase](#indexing-of-symbols) is included in the hierarchical scope. Symbols that cannot be found locally are looked up in the global scope.

The `ScopeProvider` can be overridden to implement complex scenarios for scoping and cross-reference resolution. Since cross-references can be linked *lazily* in this phase, it is possible to create a scope for a cross-reference depending on the resolved target of another cross-reference.

Once the linking is complete, the document's state is set to `Linked`.

{{<mermaid>}}
graph LR;
A(<b>Linker</b><br><br><i>links references to their target AstNodes</i>) --> B(<b>ScopeProvider</b><br><br><i>creates a Scope for the context of a Reference</i>)
A --> C(<b>AstNodeLocator</b><br><br><i>resolves an AstNode from its path</i>)
{{</mermaid>}}

## Indexing of Cross-References
Once the cross-references have been resolved by the linker, the `IndexManager` kicks in a second time to create descriptions of cross-references between different documents. Such a `ReferenceDescription` implies a dependency from its source document to its target document. This information ensures an efficient lookup to identify which other documents may be impacted by a change in a `LangiumDocument`.

After the cross-references have been indexed, the document's state is set to `IndexedReferences`.

{{<mermaid>}}
graph LR;
A(<b>IndexManager</b><br><br><i>manages metadata of cross-references<br>between documents</i>) --> B(<b>ReferenceDescriptionProvider</b><br><br><i>creates descriptions of all cross-references</i>)
B --> C(<b>AstNodeLocator</b><br><br><i>gets the path of an AstNode</i>)
{{</mermaid>}}

## Validation
The `DocumentValidator` creates an array of `Diagnostic`s from a `LangiumDocument`. This array contains all errors that have occurred during lexing, parsing, and linking, and the results of a set of custom validations with varying severity (_error_, _warning_, _info_). The custom validations are registered with the `ValidationRegistry` service.

After the diagnostics have been created, the document's state is set to `Validated`.

{{<mermaid>}}
graph LR;
A(<b>DocumentValidator</b><br><br><i>translate parser and linker errors to Diagnostics,<br>and executes custom validation checks</i>) --> B(<b>ValidationRegistry</b><br><br><i>manages custom validation checks for each AST node type</i>)
{{</mermaid>}}

At this point, all documents have been processed by the `DocumentBuilder` and the workspace is ready to process requests from the editor (e.g. completion).

## Modifications of a document
When a `TextDocument` is modified, the language client (IDE) notifies the language server, which triggers corresponding events. In Langium, a change in a `TextDocument`'s content leads to the invalidation of the associated `LangiumDocument`. The document's state is set to `Changed` and the document's entry is removed from the `LangiumDocuments` service. If the `TextDocument` was deleted, the corresponding `LangiumDocument` is removed from the index in the `IndexManager` service. If the document's content was modified, a new instance of `LangiumDocument` is created [as described above](#creation-of-langiumdocuments).  All other documents that may have been affected as a result of the modification get their references unlinked and their state is modified such that they run through the [linking phase](#linking) again. The `DocumentBuilder` then processed the newly created document along with all other documents that have not reached the `Validated` state yet.

To determine which documents are affected by a change, the `IndexManager` uses the reference descriptions gathered in the [reference indexing phase](#indexing-of-cross-references).
