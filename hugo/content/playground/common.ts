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

/**
 * Current langium grammar in the playground
 */
let currentGrammarContent = '';

/**
 * Current DSL program in the playground
 */
let currentDSLContent = '';

/**
 * Document change listener for modified DSL programs
 */
let dslDocumentChangeListener: Disposable;

/**
 * Update delay for new grammars & DSL programs to be processed
 * Any new updates occurring during this delay will cause an existing update to be cancelled,
 * and will reset the delay again
 */
const languageUpdateDelay = 150;

/**
 * Counter for language ids, which are incremented on each change
 */
let nextIdCounter = 0;


/**
 * Helper for retrieving the next language id to use, to avoid conflicting with prior ones
 */
function nextId(): string {
  return (nextIdCounter++).toString();
}


/**
 * Helper to retrieve the current grammar & program in the playground.
 * Typically used to generate a save link to this state
 */
export function getPlaygroundState(): PlaygroundParameters {
  return {
    grammar: currentGrammarContent,
    content: currentDSLContent
  };
}


/**
 * Starts the playground
 * 
 * @param leftEditor Left editor element
 * @param rightEditor Right editor element
 * @param encodedGrammar Encoded grammar to optionally use
 * @param encodedContent Encoded content to optionally use
 */
export async function setupPlayground(
  leftEditor: HTMLElement,
  rightEditor: HTMLElement,
  encodedGrammar?: string,
  encodedContent?: string
): Promise<void> {
  // setup initial contents for the grammar & dsl (Hello World)
  currentGrammarContent = LangiumInitialContent;
  currentDSLContent = DSLInitialContent;

  // check to use existing grammar from URI
  if (encodedGrammar) {
    currentGrammarContent = decompressFromEncodedURIComponent(encodedGrammar) ?? currentGrammarContent;
  }

  // check to use existing content from URI
  if (encodedContent) {
    currentDSLContent = decompressFromEncodedURIComponent(encodedContent) ?? currentDSLContent;
  }

  // setup langium wrapper
  const langiumWrapper = new MonacoEditorLanguageClientWrapper();
  await langiumWrapper.start(createUserConfig({
    htmlElement: leftEditor,
    languageId: "langium",
    code: currentGrammarContent,
    worker: "/playground/libs/worker/langiumServerWorker.js",
    languageGrammar: {},
    monarchSyntax: LangiumMonarchContent
  }));

  // TODO @montymxb Make this a TextMate grammar instead
  // setup services
  const { Grammar } = await createServicesForGrammar({ grammar: currentGrammarContent });

  // setup DSL wrapper
  dslWrapper = new MonacoEditorLanguageClientWrapper();
  await dslWrapper.start(createUserConfig({
    htmlElement: rightEditor,
    languageId: "user",
    code: currentDSLContent,
    worker: await getLSWorkerForGrammar(currentGrammarContent),
    languageGrammar: {},
    monarchSyntax: generateMonarch(Grammar, "user")
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

  // listen for document changes, to render new ASTs on the fly
  registerForDocumentChanges(dslClient);

  let dslGrammarUpdateTimeout: NodeJS.Timeout | undefined = undefined;

  // register to receive new grammars from langium, and send them to the DSL language client
  langiumClient.onNotification('browser/DocumentChange', (resp: DocumentChangeResponse) => {

    // extract & update current grammar
    currentGrammarContent = resp.content;

    // clear existing update timeout
    clearTimeout(dslGrammarUpdateTimeout);
    // set a new timeout for updating our DSL grammar & editor, 200ms, to avoid intermediate states
    dslGrammarUpdateTimeout = setTimeout(async () => {
      if (!dslClient?.isRunning()) {
        return;
      }

      overlay(true, false);

      // retrieve existing code from the model
      currentDSLContent = dslWrapper?.getModel()?.getValue() as string;

      // console.info('* DSL wrapper resources cleaned up');
      await dslWrapper?.dispose();

      // construct and set a new monarch syntax onto the editor
      const { Grammar } = await createServicesForGrammar({ grammar: currentGrammarContent });

      // setup a new id
      const newId = nextId();

      // re-create the wrapper
      dslWrapper = new MonacoEditorLanguageClientWrapper();
      await dslWrapper.start(createUserConfig({
        htmlElement: rightEditor,
        languageId: newId,
        code: currentDSLContent,
        worker: await getLSWorkerForGrammar(currentGrammarContent),
        languageGrammar: {},
        monarchSyntax: generateMonarch(Grammar, newId)
      }));

      // get a fresh client
      dslClient = dslWrapper?.getLanguageClient();

      if (!dslClient) {
        throw new Error('Failed to retrieve fresh DSL LS client');
      }

      // re-register
      registerForDocumentChanges(dslClient);

      // reset overlay
      overlay(false, false);

    }, languageUpdateDelay);
  });

  window.addEventListener("resize", () => {
    dslWrapper?.updateLayout();
    langiumWrapper.updateLayout();
  });

  // drop the overlay once done here
  overlay(false, false);
}


/**
  * Helper for registering to receive new ASTs from parsed DSL programs
  */
function registerForDocumentChanges(dslClient: any | undefined) {
  // dispose of any existing listener
  if (dslDocumentChangeListener) {
    dslDocumentChangeListener.dispose();
  }

  let dslClentTimeout: NodeJS.Timeout | undefined = undefined;

  // register to receive new ASTs from parsed DSL programs
  dslDocumentChangeListener = dslClient!.onNotification('browser/DocumentChange', (resp: DocumentChangeResponse) => {
    // delay changes by 200ms, to avoid getting too many intermediate states
    clearTimeout(dslClentTimeout);
    dslClentTimeout = setTimeout(() => {
      render(
        (new LangiumAST()).deserializeAST(resp.content),
        new DefaultAstNodeLocator()
      );
    }, languageUpdateDelay);
  });
}


/**
 * Produce a new LS worker for a given grammar, which returns a Promise once it's finished starting
 * 
 * @param grammar To setup LS for
 * @returns Configured LS worker
 */
async function getLSWorkerForGrammar(grammar: string): Promise<Worker> {
  return new Promise((resolve, reject) => {
    // create & notify the worker to setup w/ this grammar
    const worker = new Worker("/playground/libs/worker/userServerWorker.js");
    worker.postMessage({
      type: "startWithGrammar",
      grammar
    });

    // wait for the worker to finish starting
    worker.onmessage = (event) => {
      if (event.data.type === "lsStartedWithGrammar") {
        resolve(worker);
      }
    };

    worker.onerror = (event) => {
      reject(event);
    };

  });
}
