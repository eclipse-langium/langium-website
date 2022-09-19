import { AbstractMessageReader, DataCallback, Diagnostic, Disposable, Emitter, MessageReader } from "vscode-languageserver";
import { BrowserMessageWriter } from "vscode-languageserver/browser";

declare type DedicatedWorkerGlobalScope = any;

export type PlaygroundMessageType = 'validated'|'changing'|'error';

export interface PlaygroundMessageBase {
    type: PlaygroundMessageType;
}

export interface PlaygroundError extends PlaygroundMessageBase {
    type: 'error';
    errors: Diagnostic[];
}

export interface PlaygroundOK extends PlaygroundMessageBase {
    type: 'validated';
    grammar: string;
}

export interface PlaygroundChanging extends PlaygroundMessageBase {
    type: 'changing';
}

export type PlaygroundMessage = PlaygroundChanging|PlaygroundError|PlaygroundOK;

export interface Message {
    jsonrpc: string;
}

const MagicTypeString = 'PlaygroundMagic';
interface Wrapper {
    type: typeof MagicTypeString;
    message: PlaygroundMessage;
}

export interface MessageWrapper<T> {
    wrap(message: T): Message;
    unwrap(message: Message): T|null;
}

export type MessageCallback<T> = (data: T) => void;

export class PlaygroundWrapper implements MessageWrapper<PlaygroundMessage> {
    wrap(message: PlaygroundMessage): Message {
        const wrapped = {
            type: MagicTypeString,
            message
        };
        return {jsonrpc: JSON.stringify(wrapped)};
    }
    unwrap(message: Message): PlaygroundMessage|null {
        const parsed = JSON.parse(message.jsonrpc);
        if('type' in parsed && parsed['type'] === MagicTypeString && 'message' in parsed) {
            return parsed['message'] as PlaygroundMessage;
        }
        return null;
    }
}

export class ByPassingMessageReader<T> extends AbstractMessageReader implements MessageReader {
	private _onData: Emitter<Message>;
	private _onByPass: Emitter<T>;
	private _messageListener: (event: MessageEvent) => void;
    
	public constructor(port: MessagePort | Worker | DedicatedWorkerGlobalScope, wrapper: MessageWrapper<T>) {
		super();
		this._onData = new Emitter<Message>();
		this._onByPass = new Emitter<T>();
		this._messageListener = (event: MessageEvent) => {
            const unwrapped = wrapper.unwrap(event.data);
            if(unwrapped) {
                this._onByPass.fire(unwrapped);
            }
			this._onData.fire(event.data);
		};
		port.addEventListener('error', (event) => this.fireError(event));
		port.onmessage = this._messageListener;
	}

	public listen(callback: DataCallback): Disposable {
		return this._onData.event(callback);
	}

    public listenByPass(callback: MessageCallback<T>): Disposable {
		return this._onByPass.event(callback);
	}
}

export class ByPassingMessageWriter<T> extends BrowserMessageWriter {
	public constructor(port: MessagePort | Worker | DedicatedWorkerGlobalScope, private wrapper: MessageWrapper<T>) {
		super(port);
	}

	public byPassWrite(message: T) {
        return this.write(this.wrapper.wrap(message));
    }
}