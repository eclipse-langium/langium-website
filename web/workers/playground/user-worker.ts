/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { NotificationType } from 'vscode-languageserver/browser.js';
import { DocumentChange, createServerConnection } from './worker-utils.js';
import { LangiumServices, startLanguageServer } from 'langium/lsp';
import { DocumentState } from 'langium';
import { createServicesForGrammar } from 'langium/grammar';
import { PlaygroundValidator } from './user-validator.js';

// listen for messages to trigger starting the LS with a given grammar
addEventListener('message', async (event) => {
    if (event.data.type && event.data.type === 'startWithGrammar') {
        if (event.data.grammar === undefined) {
            throw new Error('User worker was started without a grammar!');
        }
        await startWithGrammar(event.data.grammar as string);
    }
});

const documentChangeNotification = new NotificationType<DocumentChange>('browser/DocumentChange');

/**
 * Starts up a LS with a given grammar.
 * Upon completion posts a message back to the main thread that it's done
 */
async function startWithGrammar(grammarText: string): Promise<void> {
    const connection = createServerConnection();

    const { shared, serializer } = await createServicesForGrammar({
        grammar: grammarText,
        module: {
            validation: {
                DocumentValidator: (services: LangiumServices) => new PlaygroundValidator(services)
            }
        },
        sharedModule: {
            lsp: {
                Connection: () => connection,
            }
        },
    });

    shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, documents => {
        for (const document of documents) {
            const json = serializer.JsonSerializer.serialize(document.parseResult.value);
            connection.sendNotification(documentChangeNotification, {
                uri: document.uri.toString(),
                content: json,
                diagnostics: document.diagnostics ?? []
            });
        }
    });

    startLanguageServer(shared);

    postMessage({ type: 'lsStartedWithGrammar' });
}
