/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

 import { AstNode } from "langium";
import { Diagnostic } from "vscode-languageserver";

export declare type DedicatedWorkerGlobalScope = any;

export type PlaygroundMessageType = "validated" | "changing" | "error" | "ast";

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

export interface PlaygroundAst extends PlaygroundMessageBase {
  type: "ast";
  root: AstNode;
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

export type Message = Request | ResponseError | ResponseOK | Notification;

export const MagicAction = "PlaygroundMagic";

export interface MessageWrapper<T> {
  wrap(message: T): Message;
  unwrap(message: Message): T | null;
}

export type MessageCallback<T> = (data: T) => void;
