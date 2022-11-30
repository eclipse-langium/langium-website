/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

 import { MagicAction, Message, MessageWrapper, PlaygroundMessage, Notification, isNotification, DedicatedWorkerGlobalScope, MessageCallback } from "./types";
import {
    AbstractMessageReader,
    BrowserMessageReader,
    BrowserMessageWriter,
    DataCallback,
    Disposable,
    Emitter,
    MessageReader,
  } from "vscode-languageserver/browser";
  
export { BrowserMessageReader, BrowserMessageWriter };

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
