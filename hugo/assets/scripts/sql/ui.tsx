import {
  MonacoEditorReactComp,
  addMonacoStyles,
} from "@typefox/monaco-editor-react/bundle";
import { buildWorkerDefinition } from "monaco-editor-workers";
import React from "react";
import { createRoot } from "react-dom/client";
import {
  DocumentChangeResponse,
} from "../langium-utils/langium-ast";
import {
  defaultText,
  syntaxHighlighting,
} from "./constants";

buildWorkerDefinition(
  "../../libs/monaco-editor-workers/workers",
  new URL("", window.location.href).href,
  false
);
addMonacoStyles("monaco-editor-styles");


class App extends React.Component<{}> {
  private monacoEditorLeft: React.RefObject<MonacoEditorReactComp>;
  constructor(props) {
    super(props);

    // bind 'this' ref for callbacks to maintain parent context
    this.onMonacoLoad = this.onMonacoLoad.bind(this);
    this.onDocumentChange = this.onDocumentChange.bind(this);
    this.monacoEditorLeft = React.createRef();
  }

  /**
   * Callback that is invoked when Monaco is finished loading up.
   * Can be used to safely register notification listeners, retrieve data, and the like
   *
   * @throws Error on inability to ref the Monaco component or to get the language client
   */
  onMonacoLoad(editor: React.RefObject<MonacoEditorReactComp>) {
    // verify we can get a ref to the editor
    if (!editor.current) {
      throw new Error("Unable to get a reference to the Monaco Editor");
    }

    // verify we can get a ref to the language client
    const lc = editor.current
      ?.getEditorWrapper()
      ?.getLanguageClient();
    if (!lc) {
      throw new Error("Could not get handle to Language Client on mount");
    }

    // register to receive DocumentChange notifications
    lc.onNotification("browser/DocumentChange", this.onDocumentChange);
  }

  /**
   * Callback invoked when the document processed by the LS changes
   * Invoked on startup as well
   * @param resp Response data
   */
  onDocumentChange(resp: DocumentChangeResponse) {
    // // decode the received Ast
    // const statemachineAst = new LangiumAST().deserializeAST(
    //   resp.content
    // ) as StateMachineAstNode;
    // this.preview.current?.startPreview(statemachineAst, resp.diagnostics);
  }

  render() {
    const style = {
      paddingTop: "5px",
    };
    return (
      <div className="w-full justify-center flex flex-col items-center">
        <MonacoEditorReactComp
          className="w-1/2 border border-emeraldLangium h-[50vh] min-h-[300px]"
          ref={this.monacoEditorLeft}
          onLoad={() => this.onMonacoLoad(this.monacoEditorLeft)}
          webworkerUri={"showcase/libs/worker/sqlServerWorker.js"}
          workerName="LS"
          workerType="classic"
          languageId="sql"
          text={defaultText}
          syntax={syntaxHighlighting}
          style={style}
        />
        <div className="w-1/2 p-4 text-white overflow-auto">
          <h1 className="text-2xl">Langium/SQL</h1>
          <p className="pt-2">
            This is a showcase of <a className="text-emeraldLangium" href="https://github.com/langium/langium-sql" target="_blank">Langium/SQL</a>. The editor above
            is a Monaco editor driven by our SQL language server. The current setup mimics <a className="text-emeraldLangium" href="https://www.mysql.com" target="_blank">MySQL</a>.
          </p>
          <h2 className="text-xl pt-4 underline">Features</h2>
          <p className="pt-2">
            <ul className="list-disc list-inside">
              <li><strong>Schema-driven</strong>: Add a set of table definitions to spread out the world for your SELECT queries. The table definitions can be located in a different file of the same workspace. You can keep definitions and queries separated.</li>
              <li><strong>Code completion</strong>: Press Ctrl + Space keys to trigger the completion directly. You will get suggestions for the current context.</li>
              <li><strong>Syntax highlighting</strong>: to distinguish what are keywords, identifiers, numeric literals and for a better perception of the SQL syntax.</li>
              <li><strong>Symbol search</strong>: Use Cmd or Ctrl + mouse click on a column name to find the definition of it or explore the places where a column is used.</li>
              <li><strong>Fast feedback</strong> about contextual correctness: Whether referenced columns exist or types on certain operators are matching.</li>
              <li><strong>Super-set approach</strong>: Any piece of any dialect that is missing can be added to the main grammar and be protected from other dialects using validations.</li>
              <li><strong>Highly customizable</strong>: Any behavior or aspect that is missing for your specific use case can be easily overwritten.</li>
            </ul>
          </p>
          <h2 className="text-xl pt-4 underline">About the given SQL document</h2>
          <p className="pt-2">
            The document contains the database schema of an airport. It is a copy of the Flughafen DB by Stefan Proell, Eva Zangerle, Wolfgang Gassler
            whose original code is located <a className="text-emeraldLangium" href="https://github.com/stefanproell/flughafendb" target="_blank">here</a>. The document itself is licensed under
            CC BY 4.0. To view a copy of this license, visit <a className="text-emeraldLangium" href="https://creativecommons.org/licenses/by/4.0">here</a>.
          </p>
        </div>
      </div>
    );
  }
}

const element = document.getElementById("root") as HTMLElement;
element.className = 'w-full'
const root = createRoot(element);
root.render(<App />);
