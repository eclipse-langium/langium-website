/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { DocumentState, startLanguageServer, EmptyFileSystem, createLangiumGrammarServices } from 'langium';
import { BrowserMessageReader, BrowserMessageWriter, createConnection, Diagnostic, NotificationType } from 'vscode-languageserver/browser';
import { throttle } from './utils';

/* browser specific setup code */
const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

// Inject the shared services and language-specific services
const { shared, grammar } = createLangiumGrammarServices({ connection, ...EmptyFileSystem });

// Start the language server with the shared services
startLanguageServer(shared);

// Send a notification with the serialized AST after every document change
type DocumentChange = { uri: string, content: string, diagnostics: Diagnostic[] };
const documentChangeNotification = new NotificationType<DocumentChange>('browser/DocumentChange');
const jsonSerializer = grammar.serializer.JsonSerializer;
shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, documents => {
    for (const document of documents) {
        connection.sendNotification(documentChangeNotification, {
            uri: document.uri.toString(),
            content: document.textDocument.getText(),
            diagnostics: document.diagnostics ?? []
        });
    }
});
