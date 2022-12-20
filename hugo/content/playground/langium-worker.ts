/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { DocumentState, startLanguageServer, EmptyFileSystem, createLangiumGrammarServices } from 'langium';
import { createConnection, DiagnosticSeverity } from 'vscode-languageserver/browser';
import { PlaygroundWrapper, ByPassingMessageReader, ByPassingMessageWriter } from './monaco-utils';
import { throttle } from './utils';

/* browser specific setup code */
const messageWrapper = new PlaygroundWrapper();
const messageReader = new ByPassingMessageReader(self, messageWrapper);
const messageWriter = new ByPassingMessageWriter(self, messageWrapper);

const connection = createConnection(messageReader, messageWriter);

// Inject the shared services and language-specific services
const { shared } = createLangiumGrammarServices({ connection, ...EmptyFileSystem });

const sendGrammar = throttle<string>(1000, text => messageWriter.byPassWrite({
    type: 'validated',
    grammar: text
}));

// by pass other messages that are required to make the playground work
shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, ([document]) => {
    messageWriter.byPassWrite({type: 'changing'});
    const errors = (document.diagnostics ?? []).filter(d => d.severity === DiagnosticSeverity.Error);
    if (errors.length > 0) {
        sendGrammar.clear();
        return messageWriter.byPassWrite({
            type: 'error',
            errors
        });
    }
    sendGrammar.call(document.textDocument.getText());
    return Promise.resolve();
});

// Start the language server with the shared services
startLanguageServer(shared);