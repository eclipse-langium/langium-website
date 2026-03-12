---
title: "Builtin Libraries"
weight: 200
---

Languages usually offer their users some high-level programming features that they do not have to define themselves.
For example, TypeScript provides users with typings for globally accessible variables such as the `window`, `process` or `console` objects.
They are part of the JavaScript runtime, and not defined by any user or a package they might import.
Instead, these features are contributed through what we call builtin libraries.

Loading a builtin library in Langium is very simple. We first start off with defining the source code of the library using the *hello world* language from the [getting started guide](/docs/learn/workflow):

```ts
export const builtinHelloWorld = `
person Jane
person John
`.trimLeft();
```

Next, we load our builtin library code through the `loadAdditionalDocuments` method provided by the `DefaultWorkspaceManager`:

```ts
import {
    AstNode,
    DefaultWorkspaceManager,
    LangiumDocument,
    LangiumDocumentFactory
} from "langium";
import { LangiumSharedServices } from "langium/lsp";
import { WorkspaceFolder } from 'vscode-languageserver';
import { URI } from "vscode-uri";
import { builtinHelloWorld } from './builtins';

export class HelloWorldWorkspaceManager extends DefaultWorkspaceManager {

    private documentFactory: LangiumDocumentFactory;

    constructor(services: LangiumSharedServices) {
        super(services);
        this.documentFactory = services.workspace.LangiumDocumentFactory;
    }

    protected override async loadAdditionalDocuments(
        folders: WorkspaceFolder[],
        collector: (document: LangiumDocument<AstNode>) => void
    ): Promise<void> {
        await super.loadAdditionalDocuments(folders, collector);
        // Load our library using the `builtin` URI schema
        collector(this.documentFactory.fromString(builtinHelloWorld, URI.parse('builtin:///library.hello')));
    }
}
```

As a last step, we have to bind our newly created workspace manager:

```ts
// Add this to the `hello-world-module.ts` included in the yeoman generated project
export type HelloWorldSharedServices = LangiumSharedServices;

export const HelloWorldSharedModule: Module<HelloWorldSharedServices, DeepPartial<HelloWorldSharedServices>> = {
    workspace: {
        WorkspaceManager: (services) => new HelloWorldWorkspaceManager(services)
    }
}
```

Be aware that this shared module is not injected by default. You have to add it manually to the `inject` call for the shared injection container.

```ts
export function createHellowWorldServices(context: DefaultSharedModuleContext): {
        shared: LangiumSharedServices,
        services: HelloWordServices
    } {
    const shared = inject(
        createDefaultSharedModule(context),
        HelloWorldGeneratedSharedModule,
        HelloWorldSharedModule
    );
    const services = inject(
        createDefaultModule({ shared }),
        HelloWorldGeneratedModule,
        HelloWorldModule
    );
    shared.ServiceRegistry.register(services);
    return { shared, services };
}
```

Once everything is wired together, we are done from the perspective of our DSL.
At startup, our language server will run the `loadAdditionalDocuments` method which makes our library available for any workspace documents of the user.

However, when trying to navigate to the builtin library elements, vscode will show users an error message, complaining that it cannot find the builtin library file.
This is expected, as the builtin library only lives in memory.
To fix this issue, we need to implement a custom `FileSystemProvider` on the client(`src/extension.ts` in the *hello world* example) that allows navigation to the builtin library files:

```ts
import * as vscode from 'vscode';
import { builtinHelloWorld } from './language/builtins';

export class DslLibraryFileSystemProvider implements vscode.FileSystemProvider {

    static register(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            vscode.workspace.registerFileSystemProvider('builtin', new DslLibraryFileSystemProvider(context), {
                isReadonly: true,
                isCaseSensitive: false
            }));
    }

    stat(uri: vscode.Uri): vscode.FileStat {
        const date = Date.now();
        return {
            ctime: date,
            mtime: date,
            size: Buffer.from(builtinHelloWorld).length,
            type: vscode.FileType.File
        };
    }

    readFile(uri: vscode.Uri): Uint8Array {
        // We could return different libraries based on the URI
        // We have only one, so we always return the same
        return new Uint8Array(Buffer.from(builtinHelloWorld));
    }

    // The following class members only serve to satisfy the interface

    private readonly didChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    onDidChangeFile = this.didChangeFile.event;

    watch() {
        return {
            dispose: () => {}
        };
    }

    readDirectory(): [] {
        throw vscode.FileSystemError.NoPermissions();
    }

    createDirectory() {
        throw vscode.FileSystemError.NoPermissions();
    }

    writeFile() {
        throw vscode.FileSystemError.NoPermissions();
    }

    delete() {
        throw vscode.FileSystemError.NoPermissions();
    }

    rename() {
        throw vscode.FileSystemError.NoPermissions();
    }
}
...
// register the file system provider on extension activation
export function activate(context: vscode.ExtensionContext) {
    DslLibraryFileSystemProvider.register(context);
}
```

This registers an in-memory file system for vscode to use for the `builtin` file schema.
Every time vscode is supposed to open a file with this schema, it will invoke the `stat` and `readFile` methods of the registered file system provider.

To ensure that LSP services (such as hover, outline, go to definition, etc.) work properly inside a built-in file, make sure that LanguageClientOptions is correctly configured (`src/extension/main.ts`). The document selector used for your language should handle the `builtin` scheme.

```ts
// Options to control the language client
clientOptions: LanguageClientOptions = {
    documentSelector: [
        { scheme: 'file', language: 'mydsl' },
        { scheme: 'builtin', language: 'mydsl' }
    ],
}
```

> **Warning:** It is discouraged to set `scheme` to `'*'`, as, for example, we do not want to build a Git revision when performing a Git diff.

Finally, to ensure that this file system provider is registered even before any DSL file is opened, the extension should be activated when any of the library files are opened.
To do that, use the following `activationEvents` in the `package.json` of your VS Code extension:

```json
"activationEvents": [
    "onFileSystem:builtin"
]
```
