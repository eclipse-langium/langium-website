import {
  AbstractMessageReader,
  DataCallback,
  Diagnostic,
  Disposable,
  Emitter,
  MessageReader,
} from "vscode-languageserver";
import {
  BrowserMessageReader,
  BrowserMessageWriter,
} from "vscode-languageserver/browser";
import {
  LangiumInitialContent,
  LangiumMonarchContent,
  StateMachineInitialContent,
} from "./data";
import { generateMonarch } from "./monarch-generator";
import { createServicesForGrammar } from "langium/lib/grammar/grammar-util";

export { BrowserMessageReader, BrowserMessageWriter };

declare type DedicatedWorkerGlobalScope = any;

export type PlaygroundMessageType = "validated" | "changing" | "error";

export interface PlaygroundMessageBase {
  type: PlaygroundMessageType;
}

export interface PlaygroundError extends PlaygroundMessageBase {
  type: "error";
  errors: Diagnostic[];
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
  | PlaygroundOK;

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

export class ByPassingMessageReader<T>
  extends AbstractMessageReader
  implements MessageReader
{
  private _onData: Emitter<Message>;
  private _onByPass: Emitter<T>;
  private _messageListener: (event: MessageEvent) => void;

  public constructor(
    port: MessagePort | Worker | DedicatedWorkerGlobalScope,
    wrapper: MessageWrapper<T>
  ) {
    super();
    this._onData = new Emitter<Message>();
    this._onByPass = new Emitter<T>();
    this._messageListener = (event: MessageEvent) => {
      const unwrapped = wrapper.unwrap(event.data);
      if (unwrapped) {
        this._onByPass.fire(unwrapped);
        return;
      }
      this._onData.fire(event.data);
    };
    port.addEventListener("error", (event) => this.fireError(event));
    port.onmessage = this._messageListener;
  }

  public listen(callback: DataCallback): Disposable {
    return this._onData.event((x) => callback(x as any));
  }

  public listenByPass(callback: MessageCallback<T>): Disposable {
    return this._onByPass.event(callback);
  }
}

export class ByPassingMessageWriter<T> extends BrowserMessageWriter {
  public constructor(
    port: MessagePort | Worker | DedicatedWorkerGlobalScope,
    private wrapper: MessageWrapper<T>
  ) {
    super(port);
  }

  public byPassWrite(message: T) {
    return this.write(this.wrapper.wrap(message));
  }
}

export interface MonacoConnection {
  reader: ByPassingMessageReader<PlaygroundMessage>;
  writer: ByPassingMessageWriter<PlaygroundMessage>;
}

export interface MonacoEditorResult {
  out: ByPassingMessageReader<PlaygroundMessage>;
  in: ByPassingMessageWriter<PlaygroundMessage>;
  editor: MonacoClient;
  overlay(visible: boolean): void;
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
  writerFactory: (worker: Worker) => ByPassingMessageWriter<PlaygroundMessage>
) {
  domElement.childNodes.forEach((c) => domElement.removeChild(c));

  const overlayElement = document.createElement('div');
  overlayElement.classList.add('overlay');
  overlayElement.classList.add('hidden');
  domElement.appendChild(overlayElement);

  function overlay(visible: boolean): void {
    let elements = domElement.querySelectorAll('.overlay');
    while(elements.length > 1) {
      elements[0].remove();
      elements = domElement.querySelectorAll('.overlay');
    } 
    if(elements.length === 1) {
      if(visible) {
        elements.forEach(e => e.classList.remove('hidden'));
      } else {
        elements.forEach(e => e.classList.add('hidden'));
      }
    }
  }

  const editingArea = document.createElement('div');
  editingArea.classList.add('editing-area');
  domElement.appendChild(editingArea);

  const client = monacoFactory();

  const editorConfig = client.getEditorConfig();
  editorConfig.setMainLanguageId(name);
  editorConfig.setMonarchTokensProvider(syntax);

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
    overlay
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
  editor: MonacoEditorResult|null;
}

type Action = (params: ActionRequest) => Promise<MonacoEditorResult|null>;
type Actions = Record<PlaygroundMessageType, Action>;

const messageWrapper = new PlaygroundWrapper();

const PlaygroundActions: Actions = {
  changing: async ({ message, editor }) => {
    if(message.type != "changing" || !editor) {
      return editor;
    }
    editor.editor.getEditorConfig().setMonacoEditorOptions({readOnly: true});
    editor.overlay(true);
    return Promise.resolve(editor);
  },
  error: async ({ message, editor }) => {
    if(message.type != "error" || !editor) {
      return editor;
    }
    editor.editor.getEditorConfig().setMonacoEditorOptions({readOnly: true});
    editor.overlay(true);
    return Promise.resolve(editor);
  },
  validated: async ({ message, element, monacoFactory, editor }): Promise<MonacoEditorResult|null> => {
    if(message.type != "validated") {
      return editor;
    }

    let content = StateMachineInitialContent;
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
    editor.editor.getEditorConfig().setMonacoEditorOptions({readOnly: false});

    await editor.in.byPassWrite(message);

    return editor;
  },
};

let userDefined: MonacoEditorResult | null = null;

export function setupPlayground(
  monacoFactory: (name: string) => MonacoClient,
  leftEditor: HTMLElement,
  rightEditor: HTMLElement
) {

  const langium = setupEditor(
    leftEditor,
    "langium",
    LangiumMonarchContent,
    LangiumInitialContent,
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
      editor: userDefined
    });
  });

  window.addEventListener("resize", () => {
    userDefined?.editor.updateLayout();
    langium.editor.updateLayout();
  });
}
