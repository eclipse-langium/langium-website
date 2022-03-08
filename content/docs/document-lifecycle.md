---
title: 'Document Lifecycle'
weight: 300
---

A `LangiumDocument` goes through seven different states during its lifecycle:
1. `Parsed` when an AST has been generated from the content of the document.
2. `IndexedContent` when the AST nodes have been processed by the `IndexManager`.
3. `Processed` when the pre-processing steps have been completed.
4. `Linked` when the `Linker` has resolved cross-references.
5. `IndexedReferences` when the references have been indexed by the `IndexManager`.
6. `Validated` when the document has been validated by the `DocumentValidator`.
7. `Changed` when the document has been modified.

The following diagram depicts how the `DocumentBuilder` processes `LangiumDocument`s depending on their state. More details about each step of the lifecycle can be found below.
{{<mermaid>}}
graph TD;
N(LangiumDocumentFactory) -.-|Creation of LangiumDocuments| C{{Parsed}}

A(DocumentBuilder) -->|Indexing of the AST| D(IndexManager) -.- E{{IndexedContent}}
A -->|Pre-processing| F(ScopeComputation) -.- G{{Processed}}
A -->|Linking| H(Linker) -.- I{{Linked}}
A -->|Indexing of cross-references| J(IndexManager) -.- K{{IndexedReferences}} 
A -->|Validation| L(DocumentValidator) -.- M{{Validated}}

click N "./#creation-of-langiumdocuments"
click D "./#indexing-of-the-ast"
click F "./#pre-processing"
click H "./#linking"
click J "./#indexing-of-cross-references"
click L "./#validation"
{{</mermaid>}}

## Creation of LangiumDocuments
When the workspace is initialized, all files having an extension matching those defined in `langium-config.json` will be collected. During collection, the `WorkspaceManager` relies on the `LangiumDocuments` service to check if a `LangiumDocument` exist for a given URI. If no instance of a `LangiumDocument` can be found, the `LangiumDocumentFactory` service will create a new instance of `LangiumDocument`. 

Files in the workspace are inherently instances of `TextDocument` as implemented by the `vscode-languageserver` package. These `TextDocument`s hold the content of the respective file as a `string`. Conversely, a `LangiumDocument` does not hold the content of document as a string but as an AST. In other words, the creation of a `LangiumDocument` by the `LangiumDocumentFactory` service is accompanied by the parsing of the content of a `TextDocument` into a given AST. During the creation of a `LangiumDocument` (i.e. after the document has been parsed), its state is set to `Parsed`.

Once all `LangiumDocument`s have been created, the `DocumentBuilder` service will sequentially process each `LangiumDocument` as described below.

{{<mermaid>}}
graph LR;
A(<b>LangiumDocuments</b><br><br><i>manages LangiumDocument instances</i>) --> B(<b>LangiumDocumentFactory</b><br><br><i>creates a LangiumDocument</i>)
B --> C(<b>LangiumParser</b><br><br><i>parses a string into an AST</i>)
{{</mermaid>}}

## Indexing of the AST
Initial indexing of the AST is executed on `LangiumDocument`s with the state `Parsed`. The default `AstNodeDescriptionProvider` service creates an `AstNodeDescription` for the root node (i.e. the node created by parsing the entry rule) and each named `AstNode` directly descending from the root node. This `AstNodeDescription` contains the `type` of the node, its identifier (i.e. the `name` property), the uri of the document where the node is located, and the location of the node inside of the document. The generated array of `AstNodeDescription`s makes accessible named nodes from a `LangiumDocument` to other `LangiumDocument`s in the same workspace.

Once the initial indexing is done, the document's state is set to `IndexedContent`.

{{<mermaid>}}
graph LR;
A(<b>IndexManager</b><br><br><i>manages exported content<br>of LangiumDocuments</i>) --> B(<b>AstNodeDescriptionProvider</b><br><br><i>creates descriptions<br>of all exported symbols</i>)
B --> C(<b>NameProvider</b><br><br><i>resolves the name of an AstNode</i>)
B --> D(<b>AstNodeLocator</b><br><br><i>gets the path of an AstNode</i>)
{{</mermaid>}}

## Pre-processing
This step is executed on 'LangiumDocument's with the state `IndexedContent` and regroups all necessary steps that needs to be done **prior to** resolving cross-references.

By default, the pre-processing consists of computing the scope of the AST. The default implementation of the `ScopeComputation` service computes the scope for **every** node in the AST and makes named nodes visible to their container. This means that the container holds information about which named nodes are nested inside of it. This is then used during linking to find the closest `AstNode` that matches a reference.

After all pre-processing steps have been completed, the document's state is set to `Processed`.

Please note that resolution of cross-references are not permitted until this point.

{{<mermaid>}}
graph LR;
A(<b>ScopeComputation</b><br><br><i>gathers all symbols from the AST and<br>stores their metadata in a MulitMap</i>) --> B(<b>NameProvider</b><br><br><i>resolves the name of an AST node</i>)
A --> C(<b>AstNodeDescriptionProvider</b><br><br><i>creates descriptions of the<br>gathered symbols</i>)
C --> D(<b>AstNodeLocator</b><br><br><i>gets the path of an AstNode</i>)
{{</mermaid>}}

## Linking
Once all pre-processing steps are complete, cross-references are resolved via the `Linker` service. The `Linker` gets all cross-references in a `LangiumDocument` and tries to resolve them. For each cross-reference, the `Linker` tries to find the correct `AstNode` and its location inside of a `LangiumDocument`. The linker relies on the `ScopeProvider` to provide previously precomputed `Scope`s for the context of a cross-reference. With the default implementation, only reference that targets `AstNode`s registered in the `LangiumDocuments` service can be resolved (i.e. documents present in the current workspace). Linking can resolve references lazily if needed before the first eager resolution. 

Once the linking is complete, the document's state is set to `Linked`.

{{<mermaid>}}
graph LR;
A(<b>Linker</b><br><br><i>links references to their target AstNodes</i>) --> B(<b>ScopeProvider</b><br><br><i>creates a Scope for the context of a Reference</i>)
A --> C(<b>AstNodeLocator</b><br><br><i>resolves an AstNode from its path</i>)
{{</mermaid>}}

## Indexing of the cross-references
Once the cross-references have been resolved by the linker, the document URI and the references it contains are mapped. This ensures an efficient lookup to identify documents that may be impacted by a change in a `LangiumDocument`.

After the cross-references have been indexed, the document's state is set to `IndexedReferences`.

{{<mermaid>}}
graph LR;
A(<b>IndexManager</b><br><br><i>manages metadata of cross-references<br>between documents</i>) --> B(<b>ReferenceDescriptionProvider</b><br><br><i>creates descriptions of all cross-references</i>)
B --> C(<b>AstNodeLocator</b><br><br><i>gets the path of an AstNode</i>)
{{</mermaid>}}

## Validation
The `DocumentsValidator` creates an array of `Diagnostic` from a `langiumDocument`. This array of `Diagnostics` contains all errors that could have ocurred during lexing, parsing, and linking, and the results of a set of custom validations (i.e. language-specific validations).

After the diagnostics have been created, the document's state is set to `Validated`.

At this point, all documents have been processed by the `DocumentBuilder` and the workspace is initialized.

{{<mermaid>}}
graph LR;
A(<b>DocumentValidator</b><br><br><i>translate parser and linker errors to Diagnostics,<br>and executes custom validation checks</i>) --> B(<b>ValidationRegistry</b><br><br><i>manages custom validation checks for each AST node type</i>)
{{</mermaid>}}

## Modifications of a document
When a `TextDocument` is modified, the client notifies the server, which triggers corresponding events. In Langium, a change in a `TextDocument`'s content or location leads to the invalidation of the associated `LangiumDocument`. The document's state is set to `Changed` and the document's entry is removed from the `LangiumDocuments` service. If the `TextDocument` was deleted, the corresponding `langiumDocument` is removed from the index in the `IndexManager` service. If the document's content or URI was modified, a new instance of `LangiumDocument` is created as described [here](#creation-of-langiumdocuments).  All other documents that may have been affected as a result of the modification get their references unlinked and their state set to the lowest from their own state or `Processed` (i.e. before linking).

The `DocumentBuilder` then processed these newly created document along with `LangiumDocument`s that have not reached the `Validated` state as described above.
