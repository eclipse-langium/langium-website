/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { AstNode, DocumentState, createServicesForGrammar, startLanguageServer } from 'langium';
import { createConnection } from 'vscode-languageserver/browser';
import { PlaygroundWrapper, ByPassingMessageReader, ByPassingMessageWriter } from './monaco-utils';
import { throttle } from './utils';

const messageWrapper = new PlaygroundWrapper();
const messageReader = new ByPassingMessageReader(self, messageWrapper);
const messageWriter = new ByPassingMessageWriter(self, messageWrapper);

const sendAst = throttle<AstNode>(1000, root => messageWriter.byPassWrite({
    type: 'ast',
    root
}));

messageReader.listenByPass(message => {
    if(message.type === 'validated') {
        sendAst.clear();
        const connection = createConnection(messageReader, messageWriter);
        createServicesForGrammar({
            grammar: message.grammar, 
            sharedModule: {
                lsp: { Connection: () => connection}
            }
        }).then(({ shared }) => {
            shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, ([document]) => {
                const ast = document.parseResult.value;
                sendAst.call(ast);
                return Promise.resolve();
            });
    
            startLanguageServer(shared);
        });
    }
});