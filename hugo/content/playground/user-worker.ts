/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { DocumentState, createServicesForGrammar, startLanguageServer } from 'langium';
import { BrowserMessageReader, BrowserMessageWriter, createConnection, Diagnostic, Disposable, NotificationType } from 'vscode-languageserver/browser';

/**
 * Starting grammar, but this text can be changed as needed for the worker
 */
let grammarText = `grammar HelloWorld

entry Model:
    (persons+=Person | greetings+=Greeting)*;

Person:
    'person' name=ID;

Greeting:
    'Hello' person=[Person:ID] '!';

hidden terminal WS: /\\s+/;
terminal ID: /[_a-zA-Z][\\w_]*/;

hidden terminal ML_COMMENT: /\\/\\*[\\s\\S]*?\\*\\//;
hidden terminal SL_COMMENT: /\\/\\/[^\\n\\r]*/;
`;

type DocumentChange = { uri: string, content: string, diagnostics: Diagnostic[] };

// disposable to remove previous build phase listeners
let buildPhaseListener: Disposable;
let newGrammarListener: Disposable;

const documentChangeNotification = new NotificationType<DocumentChange>('browser/DocumentChange');

// readers & writers need to be kept alive throughout the process
const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

async function setupWorker() {

    // // hold a ref to the connection, so we can dispose of it later
    // let connection;

    // check to dispose of an existing connection
    // if (connection) {
    //     connection.dispose();
    // }

    // create a fresh connection
    const connection = createConnection(messageReader, messageWriter);
 
    // create shared services & serializer for the given grammar grammar
    let { shared, serializer } = await createServicesForGrammar({
        grammar: grammarText,
        sharedModule: {
            lsp: { 
                Connection: () => connection,
            }
        }
    });

    // toss out any prior grammar listener
    if (newGrammarListener) {
        newGrammarListener.dispose();
    }

    // register to handle receiving new grammars, this will create a new LS
    newGrammarListener = connection.onNotification('browser/SetNewGrammar', async (resp: { grammar: string }) => {
        // change grammar & setup worker again
        grammarText = resp.grammar;
        await setupWorker();
    });

    // toss out any previous build phase listeners
    if (buildPhaseListener) {
        buildPhaseListener.dispose();
    }

    buildPhaseListener = shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, documents => {
        for (const document of documents) {
            const json = serializer.JsonSerializer.serialize(document.parseResult.value);
            // console.dir(json);
            connection.sendNotification(documentChangeNotification, {
                uri: document.uri.toString(),
                content: json,
                diagnostics: document.diagnostics ?? []
            });
        }
    });

    startLanguageServer(shared);
}

setupWorker();
