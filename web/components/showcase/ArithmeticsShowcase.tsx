'use client';

import React, { useEffect } from 'react';
import { createUserConfig } from 'langium-website-core';
import { Evaluation, examples, syntaxHighlighting } from './arithmetics-tools';
import { type Diagnostic, type DocumentChangeResponse } from 'langium-ast-helper';
import type { UserConfig } from 'monaco-languageclient';

const MonacoEditorReactComp = React.lazy(async () => {
  const { MonacoEditorReactComp } = await import('monaco-languageclient/react');
  return { default: MonacoEditorReactComp };
});

interface PreviewProps {
  evaluations?: Evaluation[];
  diagnostics?: Diagnostic[];
  focusLine: (line: number) => void;
}

class Preview extends React.Component<PreviewProps, PreviewProps> {
  constructor(props: PreviewProps) {
    super(props);
    this.state = { evaluations: props.evaluations, diagnostics: props.diagnostics, focusLine: props.focusLine };
    this.startPreview = this.startPreview.bind(this);
  }
  startPreview(evaluations: Evaluation[], diagnostics: Diagnostic[]) {
    this.setState({ evaluations, diagnostics, focusLine: this.state.focusLine });
  }
  render() {
    if (!this.state.evaluations) return (
      <div className="flex flex-col h-full w-full p-4 justify-start items-center my-10">
        <div className="text-white border-2 border-accent-red rounded-md p-4 text-center text-sm cursor-default">No AST found</div>
      </div>
    );
    if (this.state.diagnostics == null || this.state.diagnostics.filter((i) => i.severity === 1).length === 0) {
      return (
        <div className="text-white rounded-md p-4 text-left text-sm cursor-default">
          {this.state.evaluations.map((ev, i) => (
            <div key={i} className="pt-2 cursor-pointer hover:border-emerald-langium hover:border-l-2" onClick={() => this.state.focusLine(ev.range.start.line + 1)}>
              <p className="inline p-2">
                {ev.range.start.line === ev.range.end.line
                  ? <span>{`Line ${ev.range.start.line + 1}: `}</span>
                  : <span>{`Line ${ev.range.start.line + 1}-${ev.range.end.line + 1}: `}</span>}
                <span className="text-accent-blue">{ev.text}</span> = <span className="text-accent-green">{ev.value}</span>
              </p>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="flex flex-col h-full w-full p-4 justify-start items-center my-10">
        <div className="text-white border-2 border-accent-red rounded-md p-4 text-left text-sm cursor-default">
          {this.state.diagnostics.filter((i) => i.severity === 1).map((d, i) =>
            <details key={i}><summary>{`Line ${d.range.start.line}-${d.range.end.line}: ${d.message}`}</summary><p>Source: {d.source} | Code: {d.code}</p></details>
          )}
        </div>
      </div>
    );
  }
}

interface AppState { exampleIndex: number; }

class ArithmeticsApp extends React.Component<{ langiumConfig: UserConfig }, AppState> {
  monacoEditor = React.createRef<InstanceType<typeof MonacoEditorReactComp>>();
  preview = React.createRef<Preview>();

  constructor(props: { langiumConfig: UserConfig }) {
    super(props);
    this.onMonacoLoad = this.onMonacoLoad.bind(this);
    this.onDocumentChange = this.onDocumentChange.bind(this);
    this.state = { exampleIndex: 0 };
  }

  onMonacoLoad() {
    const lc = (this.monacoEditor.current as any)?.getEditorWrapper?.()?.getLanguageClient?.();
    if (!lc) return;
    lc.onNotification('browser/DocumentChange', this.onDocumentChange);
  }

  onDocumentChange(resp: DocumentChangeResponse) {
    const result = JSON.parse(resp.content);
    const evaluations = result.$evaluations as Evaluation[];
    this.preview.current?.startPreview(evaluations, resp.diagnostics);
  }

  setExample(index: number) {
    this.setState({ exampleIndex: index });
    (this.monacoEditor.current as any)?.getEditorWrapper?.()?.getEditor?.()?.setValue(examples[index]);
  }

  focusLine(line: number) {
    const editor = (this.monacoEditor.current as any)?.getEditorWrapper?.()?.getEditor?.();
    if (!editor) return;
    editor.revealLineInCenter(line);
    editor.setPosition({ lineNumber: line, column: 1 });
    editor.focus();
  }

  render() {
    const style = { height: '100%', width: '100%' };
    return (
      <div className="justify-center self-center flex flex-col md:flex-row h-full w-full">
        <div className="float-left w-full h-full flex flex-col">
          <div className="border border-emerald-langium bg-emerald-langium-darker flex items-center p-3 text-white font-mono">
            <span>Editor</span>
            <select className="ml-4 bg-emerald-langium-darker cursor-pointer border-0 border-b" onChange={(e) => this.setExample(parseInt(e.target.value))}>
              <option value="0">Basic Math</option>
              <option value="1">Price calculator</option>
            </select>
          </div>
          <div className="wrapper relative bg-white dark:bg-gray-900 border border-emerald-langium h-full w-full">
            <React.Suspense fallback={<div className="flex h-full items-center justify-center text-white">Loading editor...</div>}>
              <MonacoEditorReactComp
                userConfig={this.props.langiumConfig as any}
                ref={this.monacoEditor as any}
                onLoad={this.onMonacoLoad}
                style={style}
              />
            </React.Suspense>
          </div>
        </div>
        <div className="float-left w-full h-full flex flex-col" id="preview">
          <div className="border border-emerald-langium bg-emerald-langium-darker flex items-center p-3 text-white font-mono">Preview</div>
          <div className="border border-emerald-langium h-full w-full">
            <Preview ref={this.preview} focusLine={(line) => this.focusLine(line)} />
          </div>
        </div>
      </div>
    );
  }
}

export default function ArithmeticsShowcase() {
  useEffect(() => {
    import('monaco-editor-workers').then(({ buildWorkerDefinition }) => {
      buildWorkerDefinition('/libs/monaco-editor-workers/workers', new URL('', window.location.href).href, false);
    });
  }, []);

  const config = createUserConfig({
    languageId: 'arithmetics',
    code: examples[0],
    worker: '/workers/arithmeticsServerWorker.js',
    monarchGrammar: syntaxHighlighting,
  }) as unknown as UserConfig;

  return <ArithmeticsApp langiumConfig={config} />;
}
