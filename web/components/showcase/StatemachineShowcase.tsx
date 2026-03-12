'use client';

import React, { useEffect } from 'react';
import { createUserConfig } from 'langium-website-core';
import { defaultText, StateMachineAstNode, StateMachineState, StateMachineTools } from './statemachine-tools';
import { deserializeAST, type Diagnostic, type DocumentChangeResponse } from 'langium-ast-helper';
import type { UserConfig } from 'monaco-languageclient';

// Dynamically import Monaco to avoid SSR issues
const MonacoEditorReactComp = React.lazy(async () => {
  const { MonacoEditorReactComp } = await import('monaco-languageclient/react');
  return { default: MonacoEditorReactComp };
});

// Import statemachine textmate grammar
// eslint-disable-next-line @typescript-eslint/no-require-imports
const statemachineGrammar = require('langium-statemachine-dsl/syntaxes/statemachine.tmLanguage.json');

interface StateProps { name: string; isActive: boolean; handleClick?: () => void; }
interface EventProps { name: string; isEnabled: boolean; handleClick?: () => void; }
interface PreviewProps { diagnostics?: Diagnostic[]; astNode?: StateMachineAstNode; }

class StateBox extends React.Component<StateProps, { isActive: boolean }> {
  constructor(props: StateProps) { super(props); this.state = { isActive: props.isActive }; }
  setActive(active: boolean) { this.setState({ isActive: active }); }
  render() {
    return (
      <div className="cursor-default" onClick={this.props.handleClick}>
        {this.state.isActive
          ? <div className="text-emerald-langium border-2 border-emerald-langium rounded-md p-4 text-center text-sm shadow-[0px_0px_15px_0px] shadow-emerald-langium">{this.props.name}</div>
          : <div className="border-2 text-emerald-langium-darker border-emerald-langium-darker rounded-md p-4 text-center text-sm">{this.props.name}</div>
        }
      </div>
    );
  }
}

class EventBtn extends React.Component<EventProps, { isEnabled: boolean }> {
  constructor(props: EventProps) { super(props); this.state = { isEnabled: props.isEnabled }; }
  setEnabled(enabled: boolean) { this.setState({ isEnabled: enabled }); }
  render() {
    return (
      <button onClick={this.props.handleClick} disabled={this.state.isEnabled}
        className="text-white border-2 bg-emerald-langium-a-bit-darker rounded-md p-4 text-center text-sm enabled:hover:shadow-[0px_0px_15px_0px] enabled:hover:shadow-emerald-langium disabled:border-gray-400 disabled:text-gray-400 disabled:bg-emerald-langium-darker">
        {this.props.name}
      </button>
    );
  }
}

class Preview extends React.Component<PreviewProps, PreviewProps> {
  constructor(props: PreviewProps) { super(props); this.state = { diagnostics: props.diagnostics, astNode: props.astNode }; this.startPreview = this.startPreview.bind(this); }
  startPreview(ast: StateMachineAstNode, diagnostics: Diagnostic[]) { this.setState({ astNode: ast, diagnostics }); }
  render() {
    if (!this.state.astNode) return <div className="flex h-full w-full p-4 justify-center items-center my-10"><div className="text-white border-2 border-accent-red rounded-md p-4 text-center text-sm">No AST found</div></div>;
    const errors = this.state.diagnostics?.filter((d) => d.severity === 1) ?? [];
    if (errors.length > 0) return <div className="flex h-full w-full p-4 justify-start items-center my-10"><div className="text-white border-2 border-accent-red rounded-md p-4 text-left text-sm">{errors.map((d, i) => <details key={i}><summary>{`Line ${d.range.start.line + 1}-${d.range.end.line + 1}: ${d.message}`}</summary><p>Source: {d.source} | Code: {d.code}</p></details>)}</div></div>;
    const tools = new StateMachineTools(this.state.astNode);
    const stateRefs: StateBox[] = [];
    const eventRefs: EventBtn[] = [];
    const changeState = (state: StateMachineState) => {
      tools.setState(state);
      eventRefs.forEach((e) => e.setEnabled(tools.isEventEnabled(tools.getEventByName(e.props.name)!)));
      stateRefs.forEach((s) => s.setActive(tools.isCurrentState(tools.getStateByName(s.props.name)!)));
    };
    return (
      <div className="flex flex-col h-full w-full p-4 float-right items-center">
        <p className="text-white text-lg w-full my-4">Events</p>
        <div className="flex flex-wrap w-full gap-2">{tools.getEvents().map((ev, i) => <EventBtn key={i} isEnabled={tools.isEventEnabled(ev)} handleClick={() => changeState(tools.getNextState(ev)!)} name={ev.name} ref={(r) => { if (r) eventRefs.push(r); }} />)}</div>
        <p className="text-white text-lg w-full my-4">States</p>
        <div className="flex flex-wrap w-full gap-2 justify-start">{tools.getStates().map((st, i) => <StateBox key={i} isActive={tools.isCurrentState(st)} handleClick={() => changeState(st)} name={st.name} ref={(r) => { if (r) stateRefs.push(r); }} />)}</div>
      </div>
    );
  }
}

class StateMachineComponent extends React.Component<{ langiumConfig: UserConfig }> {
  monacoEditor = React.createRef<InstanceType<typeof MonacoEditorReactComp>>();
  preview = React.createRef<Preview>();

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

  onDocumentChange(resp: DocumentChangeResponse) {
    const ast = deserializeAST(resp.content) as StateMachineAstNode;
    this.preview.current?.startPreview(ast, resp.diagnostics);
  }

  render() {
    const style = { height: '100%', width: '100%' };
    return (
      <div className="justify-center self-center flex flex-col md:flex-row h-full w-full">
        <div className="float-left w-full h-full flex flex-col">
          <div className="border border-emerald-langium bg-emerald-langium-darker flex items-center p-3 text-white font-mono">Editor</div>
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
          <div className="border border-emerald-langium h-full w-full"><Preview ref={this.preview} /></div>
        </div>
      </div>
    );
  }
}

export default function StatemachineShowcase() {
  useEffect(() => {
    // Set up Monaco editor workers
    import('monaco-editor-workers').then(({ buildWorkerDefinition }) => {
      buildWorkerDefinition('/libs/monaco-editor-workers/workers', new URL('', window.location.href).href, false);
    });
  }, []);

  const config = createUserConfig({
    languageId: 'statemachine',
    code: defaultText,
    textmateGrammar: statemachineGrammar,
    worker: '/workers/statemachineServerWorker.js',
  }) as unknown as UserConfig;

  return <StateMachineComponent langiumConfig={config} />;
}
