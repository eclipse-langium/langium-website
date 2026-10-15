/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { NotificationType } from 'vscode-languageserver/browser.js';
import { DocumentChange, createServerConnection } from './worker-utils.js';
import { EmptyFileSystem, DocumentState, GrammarAST, ValidationChecks } from 'langium';
import { LangiumServices, startLanguageServer } from 'langium/lsp';
import { createLangiumGrammarServices } from 'langium/grammar';
import { checkLeftRecursion } from './langium-validator.js';

// establish a browser server connection
const connection = createServerConnection();

// Inject the shared services and language-specific services
const services = createLangiumGrammarServices({ connection, ...EmptyFileSystem });

// Start the language server with the shared services
startLanguageServer(services.shared);

// Send a notification with the serialized AST after every document change
const documentChangeNotification = new NotificationType<DocumentChange>('browser/DocumentChange');
services.shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, documents => {
    for (const document of documents) {
        connection.sendNotification(documentChangeNotification, {
            uri: document.uri.toString(),
            content: document.textDocument.getText(),
            diagnostics: document.diagnostics ?? []
        });
    }
});

function registerValidationChecks(services: LangiumServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.DocumentValidator;
    const checks: ValidationChecks<GrammarAST.LangiumGrammarAstType> = {
        Grammar: checkLeftRecursion
    };
    registry.register(checks, validator);
}

registerValidationChecks(services.grammar);