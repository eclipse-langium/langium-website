/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { Diagnostic, BrowserMessageReader, BrowserMessageWriter, createConnection, Connection } from 'vscode-languageserver/browser.js';

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
