import { MonacoEditorReactComp } from "@typefox/monaco-editor-react/bundle";
import { buildWorkerDefinition } from "monaco-editor-workers";
import React from "react";
import { createRoot } from "react-dom/client";
import { DocumentChangeResponse, LangiumAST } from "../langium-utils/langium-ast";
import { DomainModelAstNode, example, getDomainModelAst, getTreeNode, syntaxHighlighting } from "./domainmodel-tools";
import { UserConfig } from "monaco-editor-wrapper";
import { createUserConfig } from "../utils";
import D3Tree, { TreeNode } from "./d3tree";
import { StateMachineAstNode } from "../statemachine/statemachine-tools";

buildWorkerDefinition(
    "../../libs/monaco-editor-workers/workers",
    new URL("", window.location.href).href,
    false
);

let userConfig: UserConfig;

interface AppState {
    ast?: DomainModelAstNode;
}

class App extends React.Component<{}, AppState> {
    monacoEditor: React.RefObject<MonacoEditorReactComp>;
    constructor(props) {
        super(props);

        // bind 'this' ref for callbacks to maintain parent context
        this.onMonacoLoad = this.onMonacoLoad.bind(this);
        this.onDocumentChange = this.onDocumentChange.bind(this);
        this.monacoEditor = React.createRef();

        // set initial state
        this.state = {
            ast: undefined,
        };
    }

    /**
     * Callback that is invoked when Monaco is finished loading up.
     * Can be used to safely register notification listeners, retrieve data, and the like
     *
     * @throws Error on inability to ref the Monaco component or to get the language client
     */
    onMonacoLoad() {
        // verify we can get a ref to the editor
        if (!this.monacoEditor.current) {
            throw new Error("Unable to get a reference to the Monaco Editor");
        }

        // verify we can get a ref to the language client
        const lc = this.monacoEditor.current
            ?.getEditorWrapper()
            ?.getLanguageClient();
        if (!lc) {
            throw new Error("Could not get handle to Language Client on mount");
        }
        this.monacoEditor.current.getEditorWrapper()?.getEditor()?.focus();
        // register to receive DocumentChange notifications
        lc.onNotification("browser/DocumentChange", this.onDocumentChange);
    }

    /**
     * Callback invoked when the document processed by the LS changes
     * Invoked on startup as well
     * @param resp Response data
     */
    onDocumentChange(resp: DocumentChangeResponse) {
        // decode the received Asts
        // update the state

        const ast = new LangiumAST().deserializeAST(resp.content) as DomainModelAstNode;
        this.setState({ ast: getDomainModelAst(ast) });
    }

    renderAST(ast: DomainModelAstNode): JSX.Element {
        if (!ast) {
            return <div>No AST available.</div>;
        }
       
        return (
            <D3Tree data={getTreeNode(ast)} />
        );
    }

    render() {
        const style = {
            height: "100%",
            width: "100%",
        };

        return (
            <div className="justify-center self-center flex flex-col md:flex-row h-full w-full p-4">
                <div className="float-left w-full h-full flex flex-col">
                    <div className="border-solid border border-emeraldLangium bg-emeraldLangiumDarker flex items-center p-3 text-white font-mono">
                        Editor
                    </div>
                    <div className="wrapper relative bg-white dark:bg-gray-900 border border-emeraldLangium h-[50vh] min-h-[300px]">
                        <MonacoEditorReactComp
                            ref={this.monacoEditor}
                            onLoad={this.onMonacoLoad}
                            userConfig={userConfig}
                            style={style}
                        />
                    </div>
                </div>
                <div className="float-left w-full h-full flex flex-col" id="preview">
                    <div className="border-solid border border-emeraldLangium bg-emeraldLangiumDarker flex items-center p-3 text-white font-mono ">
                        Preview
                    </div>
                    <div className="border border-emeraldLangium h-full w-full">
                        {this.state.ast && this.renderAST(this.state.ast)}
                    </div>
                </div>
            </div>
        );
    }
}


userConfig = createUserConfig({
    languageId: 'domainmodel',
    code: example,
    htmlElement: document.getElementById('root')!,
    worker: '/showcase/libs/worker/domainmodelServerWorker.js',
    monarchGrammar: syntaxHighlighting
});
const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<App />);
