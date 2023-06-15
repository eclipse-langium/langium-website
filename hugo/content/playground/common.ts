/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import {
  LangiumInitialContent,
  LangiumMonarchContent,
  DSLInitialContent,
} from "./data";
import { generateMonarch } from "./monarch-generator";
import { decompressFromEncodedURIComponent } from 'lz-string';
import { Disposable } from "vscode-languageserver";
import { DefaultAstNodeLocator, createServicesForGrammar } from "langium";
import { render } from './Tree';
import { overlay } from "./utils";
import { createUserConfig } from "../../assets/scripts/utils";
export { share, overlay } from './utils'
import { MonacoEditorLanguageClientWrapper } from "monaco-editor-wrapper/bundle";
import { DocumentChangeResponse, LangiumAST } from "../../assets/scripts/langium-utils/langium-ast";

export interface PlaygroundParameters {
  grammar: string;
  content: string;
}

let dslWrapper: MonacoEditorLanguageClientWrapper | undefined;

export let currentGrammarContent = '';
export let currentDSLContent = '';

let documentChangeListener: Disposable;

export async function setupPlayground(
  leftEditor: HTMLElement,
  rightEditor: HTMLElement,
  grammar?: string,
  content?: string,
  // overlay?: (visible: boolean, hasError: boolean) => void
): Promise<() => PlaygroundParameters> {
  let langiumContent = LangiumInitialContent;
  let dslContent = DSLInitialContent;

  currentGrammarContent = langiumContent;
  currentDSLContent = dslContent;

  if (grammar) {
    const decompressedGrammar = decompressFromEncodedURIComponent(grammar);
    if (decompressedGrammar) {
      langiumContent = decompressedGrammar;
    }
  }
  if (content) {
    const decompressedContent = decompressFromEncodedURIComponent(content);
    if (decompressedContent) {
      dslContent = decompressedContent;
    }
  }

  // setup langium wrapper
  const langiumWrapper = new MonacoEditorLanguageClientWrapper();
  await langiumWrapper.start(createUserConfig({
    htmlElement: leftEditor,
    languageId: "langium",
    code: langiumContent,
    serverWorkerUrl: "/playground/libs/worker/langiumServerWorker.js",
    languageGrammar: {},
    monarchSyntax: LangiumMonarchContent
  }));

  const { Grammar } = await createServicesForGrammar({ grammar: langiumContent });
  const dslMonarchSyntax = generateMonarch(Grammar, "user");

  // setup DSL wrapper
  dslWrapper = new MonacoEditorLanguageClientWrapper();
  await dslWrapper.start(createUserConfig({
    htmlElement: rightEditor,
    languageId: "user",
    code: dslContent,
    serverWorkerUrl: "/playground/libs/worker/userServerWorker.js",
    languageGrammar: {},
    monarchSyntax: dslMonarchSyntax
  }));

  // retrieve the langium language client
  const langiumClient = langiumWrapper.getLanguageClient();
  if (!langiumClient) {
    throw new Error('Unable to obtain language client for editor!');
  }

  // retrieve the dsl language client
  let dslClient = dslWrapper?.getLanguageClient();
  if (!dslClient) {
    throw new Error('Unable to obtain language client for user editor!');
  }

  /**
   * Helper for registering to receive new ASTs from parsed DSL programs
   */
  function registerForDocumentChanges() {
    if (documentChangeListener) {
      documentChangeListener.dispose();
    }
    // register to receive new ASTs from parsed DSL programs
    documentChangeListener = dslClient!.onNotification('browser/DocumentChange', (resp: DocumentChangeResponse) => {
      console.log('* Notification received!');
      const ast = (new LangiumAST()).deserializeAST(resp.content);
      render(ast, new DefaultAstNodeLocator());
    });
  }

  registerForDocumentChanges();

  // register to receive new grammars from langium, and send them to the DSL language client
  langiumClient.onNotification('browser/DocumentChange', async (resp: DocumentChangeResponse) => {
    // this will trigger the DSL client to rebuild its language server
    await dslClient?.sendNotification('browser/SetNewGrammar', {
      grammar: resp.content
    });

    // restart the language client, but don't toss the old worker
    // TODO this needs the new monaco-editor-wrapper API, to avoid tossing the existing worker
    // ...(undefined, true)
    await dslWrapper?.restartLanguageClient();
    // get a fresh client
    dslClient = dslWrapper?.getLanguageClient();
    // re-register
    registerForDocumentChanges();

    // construct and set a new monarch syntax onto the editor
    const { Grammar } = await createServicesForGrammar({ grammar: langiumContent });
    const dslMonarchSyntax = generateMonarch(Grammar, "user");
    
  });

  window.addEventListener("resize", () => {
    dslWrapper?.updateLayout();
    langiumWrapper.updateLayout();
  });

  // drop the overlay once done here
  overlay(false, false);

  return () => {
    return {
      grammar: langiumWrapper.getMonacoEditorWrapper()?.getEditorConfig()?.code,
      content: dslWrapper?.getMonacoEditorWrapper()?.getEditorConfig()?.code ?? "",
    } as PlaygroundParameters;
  };
}
