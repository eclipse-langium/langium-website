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
      height: "100%",
    };

    return (
      <div className="w-full h-full border border-emeraldLangium justify-center self-center flex">
        <MonacoEditorReactComp
          className="w-1/2"
          ref={this.monacoEditorLeft}
          onLoad={() => this.onMonacoLoad(this.monacoEditorLeft)}
          webworkerUri="../showcase/libs/worker/sqlServerWorker.js"
          workerName="LS"
          workerType="classic"
          languageId="sql"
          text={defaultText}
          syntax={syntaxHighlighting}
          style={style}
        />
        <div className="w-1/2 h-full border-l border-l-emeraldLangium p-4 text-white">
          Space for explanations
        </div>
      </div>
    );
  }
}

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<App />);
