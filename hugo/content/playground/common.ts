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
import { decompressFromEncodedURIComponent } from 'lz-string';
import { Diagnostic } from "vscode-languageserver";
import { ByPassingMessageReader, ByPassingMessageWriter, MonacoConnection, MonacoEditorResult } from "./monaco-utils";
import { AstNode, createServicesForGrammar } from "langium";
import { render } from './Tree';
import { overlay } from "./utils";
import { DefaultAstNodeLocator } from "langium/lib/workspace/ast-node-locator";
export { share, overlay } from './utils'

export type PlaygroundMessageType = "validated" | "changing" | "error" | "ast";

export interface PlaygroundMessageBase {
  type: PlaygroundMessageType;
}

export interface PlaygroundError extends PlaygroundMessageBase {
  type: "error";
  errors: Diagnostic[];
}

export interface PlaygroundAst extends PlaygroundMessageBase {
  type: "ast";
  root: AstNode;
}

export interface PlaygroundOK extends PlaygroundMessageBase {
  type: "validated";
  grammar: string;
}

export interface PlaygroundChanging extends PlaygroundMessageBase {
  type: "changing";
}

export type PlaygroundMessage =
  | PlaygroundChanging
  | PlaygroundError
  | PlaygroundOK
  | PlaygroundAst;

export interface MessageBase {
  jsonrpc: "2.0";
}

export interface Request extends MessageBase {
  method: string;
  params?: any[];
  id: string;
}

export interface ResponseOK extends MessageBase {
  result: any;
  id: string;
}

export interface ResponseError extends MessageBase {
  error: any;
  id: string;
}

export interface Notification extends MessageBase {
  method: string;
  params?: any[];
}

export interface PlaygroundParameters {
  grammar: string;
  content: string;
}

export function isNotification(msg: Message): msg is Notification {
  return !msg["id"] && msg["method"];
}

type Message = Request | ResponseError | ResponseOK | Notification;

const MagicAction = "PlaygroundMagic";

export interface MessageWrapper<T> {
  wrap(message: T): Message;
  unwrap(message: Message): T | null;
}

export type MessageCallback<T> = (data: T) => void;

export class PlaygroundWrapper implements MessageWrapper<PlaygroundMessage> {
  wrap(message: PlaygroundMessage): Message {
    return {
      jsonrpc: "2.0",
      method: MagicAction,
      params: [message],
    } as Notification;
  }
  unwrap(message: Message): PlaygroundMessage | null {
    if (isNotification(message) && message.method === MagicAction) {
      return message.params![0] as PlaygroundMessage;
    }
    return null;
  }
}

export interface MonacoConfig {
  getMainCode(): string;
  setMainCode(code: string): void;
  setMainLanguageId(name: string): void;
  setMonarchTokensProvider(monarch: any): void;
  theme: string;
  useLanguageClient: boolean;
  useWebSocket: boolean;
  setMonacoEditorOptions(monacoEditorOptions: Record<string, unknown>): void;
}

export interface MonacoClient {
  getEditorConfig(): MonacoConfig;
  setWorker(worker: Worker, connection: MonacoConnection): void;
  startEditor(domElement: HTMLElement): void;
  updateLayout(): void;
  dispose(): Promise<void>;
  getMainCode(): string;
}

export function setupEditor(
  domElement: HTMLElement,
  name: string,
  syntax: any,
  content: string,
  relativeWorkerURL: string,
  monacoFactory: () => MonacoClient,
  readerFactory: (worker: Worker) => ByPassingMessageReader<PlaygroundMessage>,
  writerFactory: (worker: Worker) => ByPassingMessageWriter<PlaygroundMessage>,
  onReady: () => void
) {
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
    editor: client
  };
  client.setWorker(worker, {
    reader: result.out,
    writer: result.in,
  });

  client.startEditor(domElement);

  onReady();

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
    if(message.type != "changing" || !editor) {
      return editor;
    }
    overlay(true, false);
    editor.editor.getEditorConfig().setMonacoEditorOptions({readOnly: true});
    return Promise.resolve(editor);
  },
  error: async ({ message, editor }) => {
    overlay(true, true);
    if(message.type != "error" || !editor) {
      return editor;
    }
    editor.editor.getEditorConfig().setMonacoEditorOptions({readOnly: true});
    return Promise.resolve(editor);
  },
  validated: async ({ message, element, monacoFactory, editor, content }): Promise<MonacoEditorResult | undefined> => {
    if(message.type != "validated") {
      return editor;
    }

    if (editor) {
      content = editor.editor.getMainCode();
      // attempt to dispose
      await editor.editor.dispose().catch((e) => {
        // report & discard this error
        // can happen when a previous editor was not started correctly
        console.error(e);
      });
    }

    const { Grammar } = await createServicesForGrammar({ grammar: message.grammar });
    const syntax = generateMonarch(Grammar, "user");
    
    editor = setupEditor(
      element,
      "user",
      syntax,
      content,
      "../../libs/worker/userServerWorker.js",
      () => monacoFactory("user"),
      (worker) => new ByPassingMessageReader(worker, messageWrapper),
      (worker) => new ByPassingMessageWriter(worker, messageWrapper),
      () => { }
    );
    
    editor.editor.getEditorConfig().setMonacoEditorOptions({readOnly: false});

    await editor.in.byPassWrite(message);

    overlay(false, false);

    return editor;
  },
};

let userDefined: MonacoEditorResult | undefined;

export function setupPlayground(
  monacoFactory: (name: string) => MonacoClient,
  leftEditor: HTMLElement,
  rightEditor: HTMLElement,
  grammar?: string,
  content?: string,
  overlay?: (visible: boolean, hasError: boolean) => void
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

  const langium = setupEditor(
    leftEditor,
    "langium",
    LangiumMonarchContent,
    langiumContent,
    "../../libs/worker/langiumServerWorker.js",
    () => monacoFactory("langium"),
    (worker) => new ByPassingMessageReader(worker, messageWrapper),
    (worker) => new ByPassingMessageWriter(worker, messageWrapper),
    () => {}
  );

  langium.out.listenByPass(async (message) => {
    userDefined = await PlaygroundActions[message.type]({
      message: message,
      element: rightEditor,
      monacoFactory,
      editor: userDefined,
      content: dslContent,
    });

    userDefined?.out.listenByPass((data) => {
      if (data.type !== "ast") {
        return;
      }
      render(data.root, new DefaultAstNodeLocator());
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
