/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { DefaultSharedModuleContext, startLanguageServer } from 'langium';
import { createConnection, BrowserMessageReader, BrowserMessageWriter } from 'vscode-languageserver/browser';
import { createStatemachineServices } from './language-server/statemachine-module';

declare const self: DedicatedWorkerGlobalScope;

console.log('Running langium language server');

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

// Create a connection to the client
const connection = createConnection(messageReader, messageWriter);

// Inject the shared services and language-specific services
const { shared } = createStatemachineServices({ connection } as unknown as DefaultSharedModuleContext);

// Start the language server with the shared services
startLanguageServer(shared);
