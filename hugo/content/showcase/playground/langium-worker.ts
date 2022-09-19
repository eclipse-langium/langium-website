import { DocumentState, startLanguageServer, EmptyFileSystem, createLangiumGrammarServices } from 'langium';
import { BrowserMessageReader, createConnection } from 'vscode-languageserver/browser';
import { ByPassingMessageWriter, PlaygroundWrapper } from './common';

/* browser specific setup code */
const messageReader = new BrowserMessageReader(self);
const messageWriter = new ByPassingMessageWriter(self, new PlaygroundWrapper());

const connection = createConnection(messageReader, messageWriter);

// Inject the shared services and language-specific services
const { shared } = createLangiumGrammarServices({ connection, ...EmptyFileSystem });

// by pass other messages that are required to make the playground work
shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Changed, () => messageWriter.byPassWrite({type: 'changing'}));
shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, ([document]) => {
    if(document.diagnostics && document.diagnostics.length > 0) {
        return messageWriter.byPassWrite({
            type: 'error',
            errors: document.diagnostics
        });
    }
    return messageWriter.byPassWrite({
        type: 'validated',
        grammar: document.textDocument.getText()
    });
});

// Start the language server with the shared services
startLanguageServer(shared);