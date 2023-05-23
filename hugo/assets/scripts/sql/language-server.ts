/******************************************************************************
 * Copyright 2022-2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { startLanguageServer, EmptyFileSystem } from "langium";
import {
  createConnection,
  BrowserMessageReader,
  BrowserMessageWriter,
} from "vscode-languageserver/browser";
import { createSqlServices } from "langium-sql";
import { MySqlDialectTypes } from "langium-sql/lib/dialects/mysql/data-types";
import { DialectTypes } from "langium-sql/lib/sql-data-types";

/* browser specific setup code */
const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

// Inject the shared services and language-specific services
const { shared } = createSqlServices({
  connection,
  ...EmptyFileSystem,
  module: { dialect: { dataTypes: new DialectTypes(MySqlDialectTypes) } },
});

// Start the language server with the shared services
startLanguageServer(shared);
