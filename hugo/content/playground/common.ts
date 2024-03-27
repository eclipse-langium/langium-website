/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import {
  HelloWorldGrammar,
  LangiumTextMateContent,
  DSLInitialContent,
} from "./constants.js";
import { decompressFromEncodedURIComponent } from 'lz-string';
import { Disposable } from "vscode-languageserver";
import { render } from './Tree.js';
import { overlay, throttle } from "./utils.js";
import { createUserConfig, mew, useWorkerFactory } from "langium-website-core/bundle";
import { DocumentChangeResponse } from "langium-ast-helper";
import { DefaultAstNodeLocator } from "langium";
import { createServicesForGrammar } from "langium/grammar";
import { generateTextMate } from "./textmate-generator.js";
export { share, overlay } from './utils.js';
export { mew, useWorkerFactory };

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
let dslWrapper: mew.MonacoEditorLanguageClientWrapper | undefined = undefined;

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
  
        }).catch(async (e: any) => {
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
): Promise<mew.MonacoEditorLanguageClientWrapper | undefined> {

  // construct and set a new monarch syntax onto the editor
  const { Grammar } = await createServicesForGrammar({ grammar: grammarText });

  const worker = await getLSWorkerForGrammar(grammarText);
  const wrapper = new mew.MonacoEditorLanguageClientWrapper();
  try {
    await wrapper.initAndStart(createUserConfig({
      languageId,
      code,
      worker,
      textmateGrammar: generateTextMate(Grammar, {id: languageId, grammar: 'UserGrammar'})
    }), htmlElement);
  } catch (e) {
    console.error('Failed to start DSL wrapper: ' + e);
    // don't leak the worker on failure to start
    // normally we wouldn't need to manually terminate, but if the LC is stuck in the 'starting' state, the following dispose will fail prematurely
    // and the worker will leak
    worker.terminate();
    // try to cleanup the existing wrapper (but don't fail if we can't complete this action)
    // particularly due to a stuck LC, which can cause this to fail part-ways through
    try {
      await wrapper.dispose();
    } catch (e) {}
    return undefined;
  };

  return wrapper;
}

/**
 * Gets a fresh langium wrapper
 * 
 * @param htmlElement Element to attach the wrapper to
 * @returns A promise resolving to a configured & started Langium wrapper
 */
async function getFreshLangiumWrapper(htmlElement: HTMLElement): Promise<mew.MonacoEditorLanguageClientWrapper> {
  const langiumWrapper = new mew.MonacoEditorLanguageClientWrapper();
  await langiumWrapper.initAndStart(createUserConfig({
    languageId: "langium",
    code: currentGrammarContent,
    worker: "./libs/worker/langiumServerWorker.js",
    textmateGrammar: LangiumTextMateContent
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
    const worker = new Worker("./libs/worker/userServerWorker.js");
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
