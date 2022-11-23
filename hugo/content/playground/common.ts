/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import {
  LangiumInitialContent,
  LangiumMonarchContent,
  StateMachineInitialContent,
} from "./data";
import { generateMonarch } from "./monarch-generator";
import { createServicesForGrammar } from "langium/lib/grammar/grammar-util";
import { decompressFromEncodedURIComponent } from "lz-string";
import { render } from "./Tree";
import { PlaygroundMessage, PlaygroundMessageType, PlaygroundParameters } from "./types";
import { ByPassingMessageReader, ByPassingMessageWriter, MonacoClient, MonacoEditorResult, PlaygroundWrapper } from "./monaco-utils";
export { share } from "./utils";

export function setupEditor(
  domElement: HTMLElement,
  name: string,
  syntax: any,
  content: string,
  relativeWorkerURL: string,
  monacoFactory: () => MonacoClient,
  readerFactory: (worker: Worker) => ByPassingMessageReader<PlaygroundMessage>,
  writerFactory: (worker: Worker) => ByPassingMessageWriter<PlaygroundMessage>
) {
  domElement.childNodes.forEach((c) => domElement.removeChild(c));

  const overlayElement = document.createElement("div");
  overlayElement.classList.add("overlay");
  overlayElement.classList.add("hidden");
  domElement.appendChild(overlayElement);

  function overlay(visible: boolean): void {
    let elements = domElement.querySelectorAll(".overlay");
    while (elements.length > 1) {
      elements[0].remove();
      elements = domElement.querySelectorAll(".overlay");
    }
    if (elements.length === 1) {
      if (visible) {
        elements.forEach((e) => e.classList.remove("hidden"));
      } else {
        elements.forEach((e) => e.classList.add("hidden"));
      }
    }
  }

  const editingArea = document.createElement("div");
  editingArea.classList.add("editing-area");
  domElement.appendChild(editingArea);

  const client = monacoFactory();

  const editorConfig = client.getEditorConfig();
  editorConfig.setMainLanguageId(name);
  editorConfig.setMonarchTokensProvider(syntax);
  editorConfig.setMonacoEditorOptions({
    minimap: {
      enabled: false,
    },
  });

  editorConfig.setMainCode(content);
  editorConfig.theme = "vs-dark";

  editorConfig.useLanguageClient = true;
  editorConfig.useWebSocket = false;

  const workerURL = new URL(relativeWorkerURL, import.meta.url);

  const worker = new Worker(workerURL.href, {
    type: "classic",
    name: "LS",
  });
  const result: MonacoEditorResult = {
    out: readerFactory(worker),
    in: writerFactory(worker),
    editor: client,
    overlay,
  };
  client.setWorker(worker, {
    reader: result.out,
    writer: result.in,
  });

  client.startEditor(editingArea);

  return result;
}

interface ActionRequest {
  message: PlaygroundMessage;
  element: HTMLElement;
  monacoFactory: (name: string) => MonacoClient;
  editor?: MonacoEditorResult;
  content: string;
}

type Action = (
  params: ActionRequest
) => Promise<MonacoEditorResult | undefined>;
type Actions = Record<PlaygroundMessageType, Action>;

const messageWrapper = new PlaygroundWrapper();

const PlaygroundActions: Actions = {
  ast: () => Promise.resolve(undefined),
  changing: async ({ message, editor }) => {
    if (message.type != "changing" || !editor) {
      return editor;
    }
    editor.editor.getEditorConfig().setMonacoEditorOptions({ readOnly: true });
    editor.overlay(true);
    return Promise.resolve(editor);
  },
  error: async ({ message, editor }) => {
    if (message.type != "error" || !editor) {
      return editor;
    }
    editor.editor.getEditorConfig().setMonacoEditorOptions({ readOnly: true });
    editor.overlay(true);
    return Promise.resolve(editor);
  },
  validated: async ({
    message,
    element,
    monacoFactory,
    editor,
    content,
  }): Promise<MonacoEditorResult | undefined> => {
    if (message.type != "validated") {
      return editor;
    }

    if (editor) {
      content = editor.editor.getMainCode();
      await editor.editor.dispose();
    }

    const { Grammar } = createServicesForGrammar({ grammar: message.grammar });
    const syntax = generateMonarch(Grammar, "user");

    editor = setupEditor(
      element,
      "user",
      syntax,
      content,
      "../../libs/worker/userServerWorker.js",
      () => monacoFactory("user"),
      (worker) => new ByPassingMessageReader(worker, messageWrapper),
      (worker) => new ByPassingMessageWriter(worker, messageWrapper)
    );

    editor.overlay(false);
    editor.editor.getEditorConfig().setMonacoEditorOptions({ readOnly: false });

    await editor.in.byPassWrite(message);

    return editor;
  },
};

let userDefined: MonacoEditorResult | undefined;

export function setupPlayground(
  monacoFactory: (name: string) => MonacoClient,
  leftEditor: HTMLElement,
  rightEditor: HTMLElement,
  grammar?: string,
  content?: string
) {
  let langiumContent = LangiumInitialContent;
  let dslContent = StateMachineInitialContent;

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

  const syntaxTreeDomElement = document.getElementById("syntax-tree")!;
  const langium = setupEditor(
    leftEditor,
    "langium",
    LangiumMonarchContent,
    langiumContent,
    "../../libs/worker/langiumServerWorker.js",
    () => monacoFactory("langium"),
    (worker) => new ByPassingMessageReader(worker, messageWrapper),
    (worker) => new ByPassingMessageWriter(worker, messageWrapper)
  );

  langium.out.listenByPass(async (message) => {
    userDefined = await PlaygroundActions[message.type]({
      message,
      element: rightEditor,
      monacoFactory,
      editor: userDefined,
      content: dslContent,
    });

    userDefined!.out.listenByPass((data) => {
      if (data.type !== "ast") {
        return;
      }
      render(data.root);
    });
  });

  window.addEventListener("resize", () => {
    userDefined?.editor.updateLayout();
    langium.editor.updateLayout();
  });

  return () => {
    return {
      grammar: langium.editor.getMainCode(),
      content: userDefined?.editor.getMainCode() ?? "",
    } as PlaygroundParameters;
  };
}
