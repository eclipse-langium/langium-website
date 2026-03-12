'use client';

import React, { useEffect } from 'react';
import { createUserConfig } from 'langium-website-core';
import { defaultText } from './sql-constants';
import type { DocumentChangeResponse } from 'langium-ast-helper';

type UserConfig = Record<string, unknown>;

const MonacoEditorReactComp = React.lazy(async () => {
  const { MonacoEditorReactComp } = await import('@typefox/monaco-editor-react');
  return { default: MonacoEditorReactComp as any };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sqlGrammar = require('./sql.tmLanguage.json');

class SqlApp extends React.Component<{ langiumConfig: UserConfig }> {
  monacoEditor = React.createRef<any>();

  constructor(props: { langiumConfig: UserConfig }) {
    super(props);
    this.onMonacoLoad = this.onMonacoLoad.bind(this);
    this.onDocumentChange = this.onDocumentChange.bind(this);
  }

  onMonacoLoad() {
    const lc = (this.monacoEditor.current as any)?.getEditorWrapper?.()?.getLanguageClient?.();
    if (!lc) return;
    lc.onNotification('browser/DocumentChange', this.onDocumentChange);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDocumentChange(_resp: DocumentChangeResponse) {
    // SQL showcase only uses the editor — no visualization panel
  }

  render() {
    const style = { paddingTop: '5px' };
    return (
      <div className="w-full justify-center flex flex-col items-center">
        <React.Suspense fallback={<div className="flex h-[50vh] items-center justify-center text-white">Loading editor...</div>}>
          <MonacoEditorReactComp
            userConfig={this.props.langiumConfig as any}
            className="w-1/2 border border-emerald-langium h-[50vh] min-h-[300px]"
            ref={this.monacoEditor as any}
            onLoad={this.onMonacoLoad}
            style={style}
          />
        </React.Suspense>
        <div className="w-1/2 p-4 text-white overflow-auto">
          <h1 className="text-2xl">Langium/SQL</h1>
          <p className="pt-2">
            This is a showcase of{' '}
            <a className="text-emerald-langium" href="https://github.com/langium/langium-sql" target="_blank" rel="noreferrer">Langium/SQL</a>.
            {' '}The editor above is a Monaco editor driven by our SQL language server. The current setup mimics{' '}
            <a className="text-emerald-langium" href="https://www.mysql.com" target="_blank" rel="noreferrer">MySQL</a>.
          </p>
          <h2 className="text-xl pt-4 underline">Features</h2>
          <ul className="pt-2 list-disc list-inside">
            <li><strong>Schema-driven</strong>: Add a set of table definitions to spread out the world for your SELECT queries.</li>
            <li><strong>Code completion</strong>: Press Ctrl + Space keys to trigger the completion directly.</li>
            <li><strong>Syntax highlighting</strong>: to distinguish keywords, identifiers, numeric literals.</li>
            <li><strong>Symbol search</strong>: Use Cmd or Ctrl + mouse click on a column name to find the definition.</li>
            <li><strong>Fast feedback</strong> about contextual correctness.</li>
            <li><strong>Super-set approach</strong>: Any piece of any dialect that is missing can be added to the main grammar.</li>
            <li><strong>Highly customizable</strong>: Any behavior or aspect can be easily overwritten.</li>
          </ul>
          <h2 className="text-xl pt-4 underline">About the given SQL document</h2>
          <p className="pt-2">
            The document contains the database schema of an airport. It is a copy of the Flughafen DB by Stefan Proell, Eva Zangerle, Wolfgang Gassler
            whose original code is located{' '}
            <a className="text-emerald-langium" href="https://github.com/stefanproell/flughafendb" target="_blank" rel="noreferrer">here</a>.
            {' '}The document itself is licensed under CC BY 4.0.{' '}
            <a className="text-emerald-langium" href="https://creativecommons.org/licenses/by/4.0" target="_blank" rel="noreferrer">View license</a>.
          </p>
        </div>
      </div>
    );
  }
}

export default function SqlShowcase() {
  useEffect(() => {
    import('monaco-editor-workers').then(({ buildWorkerDefinition }) => {
      buildWorkerDefinition('/libs/monaco-editor-workers/workers', new URL('', window.location.href).href, false);
    });
  }, []);

  const config = createUserConfig({
    languageId: 'sql',
    code: defaultText,
    worker: '/workers/sqlServerWorker.js',
    textmateGrammar: sqlGrammar,
  }) as unknown as UserConfig;

  return <SqlApp langiumConfig={config} />;
}
