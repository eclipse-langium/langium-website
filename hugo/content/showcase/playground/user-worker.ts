import { startLanguageServer } from 'langium';
import { createServicesForGrammar } from 'langium/lib/grammar/grammar-util';
import { createConnection } from 'vscode-languageserver/browser';
import { ByPassingMessageWriter, ByPassingMessageReader, PlaygroundWrapper } from './common';

const messageWrapper = new PlaygroundWrapper();
const messageReader = new ByPassingMessageReader(self, messageWrapper);
const messageWriter = new ByPassingMessageWriter(self, messageWrapper);

messageReader.listenByPass(message => {
    if(message.type === 'validated') {
        const connection = createConnection(messageReader, messageWriter);
        const { shared } = createServicesForGrammar({grammar: message.grammar, sharedModule: {lsp: {Connection: connection}}});
        connection.onDidChangeWatchedFiles = (handler) => { return {dispose() {}} };
        debugger
        startLanguageServer(shared);
    }
});