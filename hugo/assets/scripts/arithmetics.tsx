import { MonacoEditorReactComp, monaco, addMonacoStyles } from '@typefox/monaco-editor-react/bundle';
import { buildWorkerDefinition } from 'monaco-editor-workers';
import React from 'react';
import { createRoot } from 'react-dom/client';

buildWorkerDefinition(
  "../../libs/monaco-editor-workers/workers",
  new URL("", window.location.href).href,
  false
);
addMonacoStyles('monaco-editor-styles');
 
const syntaxHighlighting = {
    keywords: [
        'def','module'
    ],
    operators: [
        '-',',',';',':','*','/','+'
    ],
    symbols:  /-|,|;|:|\(|\)|\*|\/|\+/,

    tokenizer: {
        initial: [
            { regex: /[_a-zA-Z][\w_]*/, action: { cases: { '@keywords': {"token":"keyword"}, '@default': {"token":"ID"} }} },
            { regex: /[0-9]+(\.[0-9]*)?/, action: {"token":"number"} },
            { include: '@whitespace' },
            { regex: /@symbols/, action: { cases: { '@operators': {"token":"operator"}, '@default': {"token":""} }} },
        ],
        whitespace: [
            { regex: /\s+/, action: {"token":"white"} },
            { regex: /\/\*/, action: {"token":"comment","next":"@comment"} },
            { regex: /\/\/[^\n\r]*/, action: {"token":"comment"} },
        ],
        comment: [
            { regex: /[^\/\*]+/, action: {"token":"comment"} },
            { regex: /\*\//, action: {"token":"comment","next":"@pop"} },
            { regex: /[\/\*]/, action: {"token":"comment"} },
        ],
    }
} as monaco.languages.IMonarchLanguage;


class App extends React.Component<{}, { hasError }> {
  monacoEditor: React.RefObject<MonacoEditorReactComp>;
  constructor(props) {
    super(props);
    this.onTextChanged = this.onTextChanged.bind(this);
    this.monacoEditor = React.createRef();
    this.state = {
      hasError: false
    };
  }

  onTextChanged(text: string, isDirty: boolean) {
    // yes, its possible to execute commands
    // this.monacoEditor.current?.executeCommand("editor.exampleCommand");
  }

  render() {
    const style = {
      "paddingTop": "5px",
      "height": "100%",
      "width": "100%"
    };

    return (
      <div className="w-full h-full border border-emeraldLangium justify-center self-center flex">
        <div className="float-left w-1/2 h-full border-r border-emeraldLangium">
          <div className="wrapper relative bg-white dark:bg-gray-900" >
            <MonacoEditorReactComp ref={this.monacoEditor} onTextChanged={this.onTextChanged} webworkerUri="../showcase/libs/worker/arithmeticsServerWorker.js" workerName='LS' workerType='classic' languageId="arithmetics" text={`Module example1

Def y: 1 + 3 - 99828932 / 2 + 2 - 1;

DEF x: 12 / 3 - 1; // 3

x * 2 - 4;

def t: 4;

DEF func(t, x):
    t * t * t + x;

// This language is case-insensitive regarding symbol names
Func(T, X); // 67
Func(X, T); // 31
Func(T, Func(T, X)); // 131`} syntax={syntaxHighlighting} style={style} />
          </div>
        </div>
        <div className="float-right w-1/2 h-full" id="preview">
        </div>
      </div>
    );
  }
}

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <App />
); 