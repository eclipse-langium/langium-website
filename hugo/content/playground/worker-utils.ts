import { Diagnostic, BrowserMessageReader, BrowserMessageWriter, createConnection, Connection } from 'vscode-languageserver/browser';

/**
 * Describes a notification that can be sent from the LS,
 * containing details on a changed document
 */
export type DocumentChange = { uri: string, content: string, diagnostics: Diagnostic[] };

/**
 * Creates a connection for a language server to utilize (from a browser)
 * @returns Server connection
 */
export function createServerConnection(): Connection {
    const messageReader = new BrowserMessageReader(self);
    const messageWriter = new BrowserMessageWriter(self);
    return createConnection(messageReader, messageWriter);
}