import { startLanguageServer, EmptyFileSystem, createLangiumGrammarServices } from 'langium';
import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';

/* browser specific setup code */
const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

// Inject the shared services and language-specific services
const { shared } = createLangiumGrammarServices({ connection, ...EmptyFileSystem });

// Start the language server with the shared services
startLanguageServer(shared);