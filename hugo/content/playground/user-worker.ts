/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { DocumentState, createServicesForGrammar, startLanguageServer } from 'langium';
import { NotificationType } from 'vscode-languageserver/browser.js';
import { DocumentChange, createServerConnection } from './worker-utils';

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
 * 
 * @param grammarText Grammar string to create an LS for
 */
async function startWithGrammar(grammarText: string): Promise<void> {

    // create a fresh connection for the LS
    const connection = createServerConnection();

    // create shared services & serializer for the given grammar grammar
    const { shared, serializer } = await createServicesForGrammar({
        grammar: grammarText,
        sharedModule: {
            lsp: {
                Connection: () => connection,
            }
        }
    });

    // listen for validated documents, and send the AST back to the language client
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

    // start the LS
    startLanguageServer(shared);

    // notify the main thread that the LS is ready
    postMessage({ type: 'lsStartedWithGrammar' });
}
