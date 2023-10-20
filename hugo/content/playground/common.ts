/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import {
  HelloWorldGrammar,
  LangiumMonarchContent,
  DSLInitialContent,
} from "./data";
import { generateMonarch } from "./monarch-generator";
import { decompressFromEncodedURIComponent } from 'lz-string';
import { Disposable } from "vscode-languageserver";
import { DefaultAstNodeLocator, createServicesForGrammar } from "langium";
import { render } from './Tree';
import { overlay, throttle } from "./utils";
import { addMonacoStyles, createUserConfig, MonacoEditorLanguageClientWrapper } from "langium-website-core/bundle";
import { DocumentChangeResponse } from "../../assets/scripts/langium-utils/langium-ast";

export { share, overlay } from './utils';
export { addMonacoStyles, MonacoEditorLanguageClientWrapper };

export interface PlaygroundParameters {
  grammar: string;
  content: string;
}

/**
 * Current langium grammar in the playground
 */
let currentGrammarContent = '';

/**
 * Current DSL program in the playground
 */

let currentDSLContent = '';

/**
 * DSL wrapper, allowing us to quickly access the current in-model code
 */
let dslWrapper: MonacoEditorLanguageClientWrapper | undefined = undefined;

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
  currentGrammarContent = HelloWorldGrammar;
  currentDSLContent = DSLInitialContent;

  // handle to a Monaco language client instance for the DSL (program) editor
  let dslClient;

  // check to use existing grammar from URI
  if (encodedGrammar) {
    currentGrammarContent = decompressFromEncodedURIComponent(encodedGrammar) ?? currentGrammarContent;
  }

  // check to use existing content from URI
  if (encodedContent) {
    currentDSLContent = decompressFromEncodedURIComponent(encodedContent) ?? currentDSLContent;
  }

  // setup langium wrapper
  const langiumWrapper = await getFreshLangiumWrapper(leftEditor);

  // setup DSL wrapper
  await setupDSLWrapper().catch((e) => {
    // failed to setup, can happen with a bad Langium grammar, report it & discard
    console.error('DSL editor setup error: ' + e);
    overlay(true, true);
  });

  // retrieve the langium language client
  const langiumClient = langiumWrapper.getLanguageClient();
  if (!langiumClient) {
    throw new Error('Unable to obtain language client for the Langium editor!');
  }

  // register to receive new grammars from langium, and send them to the DSL language client
  langiumClient.onNotification('browser/DocumentChange', (resp: DocumentChangeResponse) => {

    // verify the langium client is still running, and didn't crash due to a grammar issue
    if (!langiumClient.isRunning()) {
      throw new Error('Langium client is not running');
    }

    // extract & update current grammar
    currentGrammarContent = resp.content;

    if (resp.diagnostics.filter(d => d.severity === 1).length) {
      // error in the grammar, report an error & stop here
      overlay(true, true);
      return;
    }

    // set a new timeout for updating our DSL grammar & editor, 200ms, to avoid intermediate states
    throttle(1, languageUpdateDelay, async () => {
      // display 'Loading...' while we regenerate the DSL editor
      overlay(true, false);

      if (!dslWrapper) {
        // no dsl wrapper to start (or previously crashed), setup from scratch
        // no exception handling here, as we're 'assuming' the Langium grammar is valid at this point
        // or we already have a wrapper that crashed (2nd case here)
        await setupDSLWrapper();
        overlay(false, false);
      } else {
        // existing wrapper, attempt to first dispose
        await dslWrapper?.dispose().then(async () => {
          // disposed successfully, setup & clear overlay
          await setupDSLWrapper();
          overlay(false, false);
  
        }).catch(async (e) => {
          // failed to dispose, report & discard this error
          // can happen when a previous editor was not started correctly
          console.error('DSL editor disposal error: ' + e);
          overlay(true, true);
  
        });
      }
    });
  });

  /**
   * Helper to configure & retrieve a fresh DSL wrapper
   */
  async function setupDSLWrapper(): Promise<void> {
    // get a fresh DSL wrapper
    dslWrapper = await getFreshDSLWrapper(rightEditor, nextId(), currentDSLContent, currentGrammarContent);

    // get a fresh client
    dslClient = dslWrapper?.getLanguageClient();
    if (!dslClient) {
      // TODO @montymxb (Aug. 2nd, 2023) This is a hack to deal with the wrapper crashing when the LC tries to interface with
      // an improperly configured LS (due to a bad grammar). The result is an editor that we cannot remove via 'dispose'.
      // This should be removed once the issue is resolved in the monaco-components repo.

      // Setup failed, attempt to teardown resources piece by piece, before throwing an error
      dslWrapper?.getEditor()?.dispose();
      dslWrapper?.getLanguageClient()?.dispose();
      dslWrapper = undefined;
      // clean up the UI, so the old editor is visually removed (tends to linger otherwise)
      rightEditor.innerHTML = '';
      throw new Error('Failed to retrieve fresh DSL LS client');
    }

    // re-register
    registerForDocumentChanges(dslClient);
  }

  window.addEventListener("resize", () => {
    dslWrapper?.updateLayout();
    langiumWrapper.updateLayout();
  });

  // drop the overlay once done here
  overlay(false, false);
}


/**
 * Starts a fresh Monaco LC wrapper
 * 
 * @param htmlElement Element to attach the editor to
 * @param languageId ID of the language to use
 * @param code Program to show in the editor
 * @param grammarText Grammar text to use for the worker & monarch syntax
 * @returns A promise resolving to a configured & started DSL wrapper
 */
async function getFreshDSLWrapper(
  htmlElement: HTMLElement,
  languageId: string,
  code: string,
  grammarText: string
): Promise<MonacoEditorLanguageClientWrapper | undefined> {

  // construct and set a new monarch syntax onto the editor
  const { Grammar } = await createServicesForGrammar({ grammar: grammarText });

  const worker = await getLSWorkerForGrammar(grammarText);
  const wrapper = new MonacoEditorLanguageClientWrapper();
  return wrapper.start(createUserConfig({
    languageId,
    code,
    worker,
    monarchGrammar: generateMonarch(Grammar, languageId)
  }), htmlElement).then(() => {
    return wrapper;
  }).catch((e) => {
    console.error('Failed to start DSL wrapper: ' + e);
    // don't leak the worker on failure to start
    worker.terminate();
    return undefined;
  });
}


/**
 * Gets a fresh langium wrapper
 * 
 * @param htmlElement Element to attach the wrapper to
 * @returns A promise resolving to a configured & started Langium wrapper
 */
async function getFreshLangiumWrapper(htmlElement: HTMLElement): Promise<MonacoEditorLanguageClientWrapper> {
  const langiumWrapper = new MonacoEditorLanguageClientWrapper();
  await langiumWrapper.start(createUserConfig({
    languageId: "langium",
    code: currentGrammarContent,
    worker: "/playground/libs/worker/langiumServerWorker.js",
    monarchGrammar: LangiumMonarchContent
  }), htmlElement);
  return langiumWrapper;
}


/**
 * Document change listener for modified DSL programs
 */
let dslDocumentChangeListener: Disposable;

/**
 * Helper for registering to receive new ASTs from parsed DSL programs
 */
function registerForDocumentChanges(dslClient: any | undefined) {
  // dispose of any existing listener
  if (dslDocumentChangeListener) {
    dslDocumentChangeListener.dispose();
  }

  // register to receive new ASTs from parsed DSL programs
  dslDocumentChangeListener = dslClient!.onNotification('browser/DocumentChange', (resp: DocumentChangeResponse) => {

    // retrieve existing code from the model
    currentDSLContent = dslWrapper?.getModel()?.getValue() as string;
    
    // delay changes by 200ms, to avoid getting too many intermediate states
    throttle(2, languageUpdateDelay, () => {
      // render the AST in the far-right window
      render(
        JSON.parse(resp.content),
        new DefaultAstNodeLocator()
      );
    });
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
