import * as monaco from "monaco-editor";
import getKeybindingsServiceOverride from '@codingame/monaco-vscode-keybindings-service-override';
import type { MonacoEditorProps } from "@typefox/monaco-editor-react";
import { MonacoEditorReactComp } from "@typefox/monaco-editor-react";
import { addMonacoStyles } from 'monaco-editor-wrapper/styles';

export * from "monaco-editor-wrapper";
export type * from "monaco-editor-wrapper";
export * from "./monaco-editor-wrapper-utils.js";

export {
    monaco,
    MonacoEditorProps,
    MonacoEditorReactComp,
    addMonacoStyles,
    getKeybindingsServiceOverride
}
