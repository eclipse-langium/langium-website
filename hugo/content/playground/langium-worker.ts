/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { DocumentState, startLanguageServer, EmptyFileSystem, createLangiumGrammarServices } from 'langium';
import { NotificationType } from 'vscode-languageserver/browser';
import { DocumentChange, createServerConnection } from './worker-utils';

// establish a browser server connection
const connection = createServerConnection();

// Inject the shared services and language-specific services
const { shared } = createLangiumGrammarServices({ connection, ...EmptyFileSystem });

// Start the language server with the shared services
startLanguageServer(shared);

// Send a notification with the serialized AST after every document change
const documentChangeNotification = new NotificationType<DocumentChange>('browser/DocumentChange');
shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, documents => {
    for (const document of documents) {
        connection.sendNotification(documentChangeNotification, {
            uri: document.uri.toString(),
            content: document.textDocument.getText(),
            diagnostics: document.diagnostics ?? []
        });
    }
});
