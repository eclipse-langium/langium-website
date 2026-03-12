'use client';

import React, { useEffect } from 'react';
import { createUserConfig, type UserConfig } from 'langium-website-core';
import { DomainModelAstNode, example, getMainTreeNode, syntaxHighlighting } from './domainmodel-tools';
import { deserializeAST, type Diagnostic, type DocumentChangeResponse } from 'langium-ast-helper';
import D3Tree from './d3tree';

const MonacoEditorReactComp: React.LazyExoticComponent<React.ComponentType<any>> = React.lazy(async () => {
  const { MonacoEditorReactComp } = await import('@typefox/monaco-editor-react');
  return { default: MonacoEditorReactComp as React.ComponentType<any> };
});

interface AppState {
  ast?: DomainModelAstNode;
  diagnostics?: Diagnostic[];
}

class DomainmodelApp extends React.Component<{ langiumConfig: UserConfig }, AppState> {

  constructor(props: { langiumConfig: UserConfig }) {
    super(props);
    this.onDocumentChange = this.onDocumentChange.bind(this);
    this.state = { ast: undefined, diagnostics: undefined };
  }

  onDocumentChange(resp: DocumentChangeResponse) {
    const ast = deserializeAST(resp.content) as DomainModelAstNode;
    this.setState({ ast, diagnostics: resp.diagnostics });
  }

  renderAST(ast: DomainModelAstNode): React.JSX.Element {
    if (!ast) return <div>No AST available.</div>;
    if (this.state.diagnostics == null || this.state.diagnostics.filter((i) => i.severity === 1).length === 0) {
      return <D3Tree data={getMainTreeNode(ast)} />;
    }
    return (
      <div className="flex flex-col h-full w-full p-4 justify-start items-center my-10">
        <div className="text-white border-2 border-accent-red rounded-md p-4 text-left text-sm cursor-default">
          {this.state.diagnostics.filter((i) => i.severity === 1).map((d, i) =>
            <details key={i}><summary>{`Line ${d.range.start.line + 1}-${d.range.end.line + 1}: ${d.message}`}</summary><p>Source: {d.source} | Code: {d.code}</p></details>
          )}
        </div>
      </div>
    );
  }

  render() {
    const style = { height: '100%', width: '100%' };
    const { vscodeApiConfig, editorAppConfig, languageClientConfig } = this.props.langiumConfig;
    return (
      <div className="justify-center self-center flex flex-col md:flex-row h-full w-full p-4">
        <div className="float-left w-full h-full flex flex-col">
          <div className="border border-emerald-langium bg-emerald-langium-darker flex items-center p-3 text-white font-mono">Editor</div>
          <div className="wrapper relative bg-white dark:bg-gray-900 border border-emerald-langium h-[50vh] min-h-75">
            <React.Suspense fallback={<div className="flex h-full items-center justify-center text-white">Loading editor...</div>}>
              <MonacoEditorReactComp
                vscodeApiConfig={vscodeApiConfig as any}
                editorAppConfig={editorAppConfig as any}
                languageClientConfig={languageClientConfig as any}
                onLanguageClientsStartDone={(lcsManager: any) => {
                  const lc = lcsManager.getLanguageClient('domainmodel');
                  if (lc) lc.onNotification('browser/DocumentChange', this.onDocumentChange);
                }}
                style={style}
              />
            </React.Suspense>
          </div>
        </div>
        <div className="float-left w-full h-full flex flex-col" id="preview">
          <div className="border border-emerald-langium bg-emerald-langium-darker flex items-center p-3 text-white font-mono">Preview</div>
          <div className="border border-emerald-langium h-full w-full">
            {this.state.ast && this.renderAST(this.state.ast)}
          </div>
        </div>
      </div>
    );
  }
}

export default function DomainmodelShowcase() {
  useEffect(() => {
    import('monaco-editor-workers').then(({ buildWorkerDefinition }) => {
      buildWorkerDefinition('/libs/monaco-editor-workers/workers', new URL('', window.location.href).href, false);
    });
  }, []);

  const config = createUserConfig({
    languageId: 'domainmodel',
    code: example,
    worker: '/workers/domainmodelServerWorker.js',
    monarchGrammar: syntaxHighlighting,
  });

  return <DomainmodelApp langiumConfig={config} />;
}
