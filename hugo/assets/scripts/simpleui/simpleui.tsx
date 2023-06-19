import {
    MonacoEditorReactComp,
    addMonacoStyles,
} from "@typefox/monaco-editor-react/bundle";
import { buildWorkerDefinition } from "monaco-editor-workers";
import React from "react";
import { createRoot } from "react-dom/client";
import { AstNode, Diagnostic, DocumentChangeResponse, LangiumAST } from "../langium-utils/langium-ast";
import { SimpleUIAstNode, defaultText, syntaxHighlighting } from "./simpleui-tools";


buildWorkerDefinition(
    "../../libs/monaco-editor-workers/workers",
    new URL("", window.location.href).href,
    false
);
addMonacoStyles("monaco-editor-styles");

interface PreviewProps {
    diagnostics?: Diagnostic[];
    astNode?: AstNode;
  }

class Preview extends React.Component<PreviewProps, PreviewProps> {
    constructor(props: PreviewProps) {
        super(props);
        this.state = {
            diagnostics: props.diagnostics,
            astNode: props.astNode,
        };

        this.startPreview = this.startPreview.bind(this);
    }

    startPreview(ast: AstNode, diagnostics: Diagnostic[]) {
        this.setState({ astNode: ast, diagnostics: diagnostics });
    }

    render() {
        // check if code contains an astNode
        if (!this.state.astNode) {
            // Show the exception
            return (
                <div className="flex flex-col h-full w-full p-4 justify-start items-center my-10">
                    <div className="text-white border-2 border-solid border-accentRed rounded-md p-4 text-center text-sm cursor-default">
                        No Ast found
                    </div>
                </div>
            );
        }

        // if the code doesn't contain any errors
        if (this.state.diagnostics == null || this.state.diagnostics.filter((i) => i.severity === 1).length == 0) {
            return (
                <div className="flex flex-col h-full w-full p-4 float-right items-center">
                    
                </div>
            );
        }

        // Show the exception
        return (
            <div className="flex flex-col h-full w-full p-4 justify-start items-center my-10" >
                <div className="text-white border-2 border-solid border-accentRed rounded-md p-4 text-left text-sm cursor-default">
                    {this.state.diagnostics.filter((i) => i.severity === 1).map((diagnostic, index) =>
                        <details key={index}>
                            <summary>{`Line ${diagnostic.range.start.line + 1}-${diagnostic.range.end.line + 1}: ${diagnostic.message}`}</summary>
                            <p>Source: {diagnostic.source} | Code: {diagnostic.code}</p>
                        </details>
                    )}
                </div>
            </div>
        );
    }
}

class App extends React.Component<{}> {
    monacoEditor: React.RefObject<MonacoEditorReactComp>;
    preview: React.RefObject<Preview>;
    constructor(props) {
        super(props);

        // bind 'this' ref for callbacks to maintain parent context
        this.onMonacoLoad = this.onMonacoLoad.bind(this);
        this.onDocumentChange = this.onDocumentChange.bind(this);
        this.monacoEditor = React.createRef();
        this.preview = React.createRef();
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

        // register to receive DocumentChange notifications
        lc.onNotification("browser/DocumentChange", this.onDocumentChange);
    }

    /**
     * Callback invoked when the document processed by the LS changes
     * Invoked on startup as well
     * @param resp Response data
     */
    onDocumentChange(resp: DocumentChangeResponse) {
        // decode the received Ast
        const ast = new LangiumAST().deserializeAST(resp.content) as SimpleUIAstNode;
        console.log(ast);
        ast.bodyElements.forEach((element) => {
            console.log(element);
        });
        this.preview.current?.startPreview(ast, resp.diagnostics);
    }

    render() {
        const style = {
            height: "100%",
            width: "100%",
        };

        return (
            <div className="justify-center self-center flex flex-col md:flex-row h-full w-full">
                <div className="float-left w-full h-full flex flex-col">
                    <div className="border-solid border border-emeraldLangium bg-emeraldLangiumDarker flex items-center p-3 text-white font-mono">
                        Editor
                    </div>
                    <div className="wrapper relative bg-white dark:bg-gray-900 border border-emeraldLangium h-full w-full">
                        <MonacoEditorReactComp
                            ref={this.monacoEditor}
                            onLoad={this.onMonacoLoad}
                            webworkerUri="../showcase/libs/worker/simpleuiServerWorker.js"
                            workerName="LS"
                            workerType="classic"
                            languageId="simpleui"
                            text={defaultText}
                            syntax={syntaxHighlighting}
                            style={style}
                        />
                    </div>
                </div>
                <div className="float-left w-full h-full flex flex-col" id="preview">
                    <div className="border-solid border border-emeraldLangium bg-emeraldLangiumDarker flex items-center p-3 text-white font-mono ">
                        Preview
                    </div>
                    <div className="border border-emeraldLangium h-full w-full">
                        <Preview ref={this.preview} />
                    </div>
                </div>
            </div>
        );
    }
}

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<App />);
