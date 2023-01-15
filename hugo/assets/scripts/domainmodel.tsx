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
    'datatype', 'entity', 'extends', 'many', 'package'
  ],
  operators: [
    ':', '.'
  ],
  symbols: /:|\.|\{|\}/,

  tokenizer: {
    initial: [
      { regex: /[_a-zA-Z][\w_]*/, action: { cases: { '@keywords': { "token": "keyword" }, '@default': { "token": "ID" } } } },
      { regex: /[0-9]+/, action: { "token": "number" } },
      { regex: /"[^"]*"|'[^']*'/, action: { "token": "string" } },
      { include: '@whitespace' },
      { regex: /@symbols/, action: { cases: { '@operators': { "token": "operator" }, '@default': { "token": "" } } } },
    ],
    whitespace: [
      { regex: /\s+/, action: { "token": "white" } },
      { regex: /\/\*/, action: { "token": "comment", "next": "@comment" } },
      { regex: /\/\/[^\n\r]*/, action: { "token": "comment" } },
    ],
    comment: [
      { regex: /[^\/\*]+/, action: { "token": "comment" } },
      { regex: /\*\//, action: { "token": "comment", "next": "@pop" } },
      { regex: /[\/\*]/, action: { "token": "comment" } },
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
            <MonacoEditorReactComp ref={this.monacoEditor} onTextChanged={this.onTextChanged} webworkerUri="../showcase/libs/worker/domainmodelServerWorker.js" workerName='LS' workerType='classic' languageId="domainmodel" text={`// Define datatypes
datatype String
datatype Int
datatype Decimal

// Define datatype packages
package complex {
    datatype Date
}

// Define Entities
entity Blog {
    title: String
    date: complex.Date
    // Create a array of posts
    many posts: Post
}

entity HasAuthor {
    author: String
}

// Define a entity that extends another entity
entity Post extends HasAuthor {
    title: String
    content: String
    // Create a array of comments
    many comments: Comment
}

entity Comment extends HasAuthor {
    content: String
}`} syntax={syntaxHighlighting} style={style} />
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