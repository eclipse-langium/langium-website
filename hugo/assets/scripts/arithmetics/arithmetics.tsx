import { MonacoEditorReactComp } from "./static/libs/mer/mer.js";
import { buildWorkerDefinition } from "monaco-editor-workers";
import React from "react";
import { createRoot } from "react-dom/client";
import { Diagnostic, DocumentChangeResponse } from "../langium-utils/langium-ast";
import { Evaluation, arithmeticsGrammar, examples, syntaxHighlighting } from "./arithmetics-tools";
import { UserConfig } from "monaco-editor-wrapper"; 
import { createUserConfig } from "../utils";

buildWorkerDefinition(
    "../../libs/monaco-editor-workers/workers",
    new URL("", window.location.href).href,
    false
);

interface PreviewProps {
    evaluations?: Evaluation[];
    diagnostics?: Diagnostic[];
    focusLine: (line: number) => void;
}

let userConfig: UserConfig;


class Preview extends React.Component<PreviewProps, PreviewProps> {
    constructor(props: PreviewProps) {
        super(props);
        this.state = {
            evaluations: props.evaluations,
            diagnostics: props.diagnostics,
            focusLine: props.focusLine,
        };

        this.startPreview = this.startPreview.bind(this);
    }

    startPreview(evaluations: Evaluation[], diagnostics: Diagnostic[]) {
        this.setState({ focusLine: this.state.focusLine.bind(this) })
        this.setState({ evaluations: evaluations, diagnostics: diagnostics });
    }

    render() {
        // check if code contains an astNode
        if (!this.state.evaluations) {
            // Show the exception
            return (
                <div className="flex flex-col h-full w-full p-4 justify-start items-center my-10">
                    <div className="text-white border-2 border-solid border-accentRed rounded-md p-4 text-center text-sm cursor-default">
                        No Ast found
                    </div>
                </div>
            );
        }

        // if the code doesn't contain any errors and the diagnostics aren't warnings
        if (this.state.diagnostics == null || this.state.diagnostics.filter((i) => i.severity === 1).length == 0) {
            return (
                <div className="text-white rounded-md p-4 text-left text-sm cursor-default">
                    {this.state.evaluations.map((evaluation, index) =>
                        <div key={index} className="pt-2 cursor-pointer hover:border-emeraldLangium hover:border-l-2" onClick={() => this.state.focusLine(evaluation.range.start.line + 1)}>
                            <p className="inline p-2">
                                {evaluation.range.start.line == evaluation.range.end.line && <span>{`Line ${evaluation.range.start.line + 1}: `}</span>}
                                {evaluation.range.start.line != evaluation.range.end.line && <span>{`Line ${evaluation.range.start.line + 1}-${evaluation.range.end.line + 1}: `}</span>}
                                <span className="text-accentBlue">{evaluation.text}</span> = <span className="text-accentGreen">{evaluation.value}</span>
                            </p>
                        </div>
                    )}
                </div>
            );
        }
        // Show the exception
        return (
            <div className="flex flex-col h-full w-full p-4 justify-start items-center my-10" >
                <div className="text-white border-2 border-solid border-accentRed rounded-md p-4 text-left text-sm cursor-default">
                    {this.state.diagnostics.filter((i) => i.severity === 1).map((diagnostic, index) =>
                        <details key={index}>
                            <summary>{`Line ${diagnostic.range.start.line}-${diagnostic.range.end.line}: ${diagnostic.message}`}</summary>
                            <p>Source: {diagnostic.source} | Code: {diagnostic.code}</p>
                        </details>
                    )}
                </div>
            </div>
        );
    }
}


interface AppState {
    exampleIndex: number;
}
class App extends React.Component<{}, AppState> {
    monacoEditor: React.RefObject<MonacoEditorReactComp>;
    preview: React.RefObject<Preview>;
    constructor(props) {
        super(props);

        // bind 'this' ref for callbacks to maintain parent context
        this.onMonacoLoad = this.onMonacoLoad.bind(this);
        this.onDocumentChange = this.onDocumentChange.bind(this);
        this.monacoEditor = React.createRef();
        this.preview = React.createRef();

        this.state = {
            exampleIndex: 0,
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
        let result = JSON.parse(resp.content)
        let evaluations = result.$evaluations;
        this.preview.current?.startPreview(evaluations, resp.diagnostics);
    }

    setExample(index: number) {
        this.setState({ exampleIndex: index });
        this.monacoEditor.current?.getEditorWrapper()?.getEditor()?.setValue(examples[index]);
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
                        <span>Editor</span>
                        <select className="ml-4 bg-emeraldLangiumDarker cursor-pointer border-0 border-b invalid:bg-emeraldLangiumABitDarker" onChange={(e) => this.setExample(parseInt(e.target.value))}>
                            <option value="0">Basic Math</option>
                            <option value="1">Price calculator</option>
                        </select>    
                    </div>
                    <div className="wrapper relative bg-white dark:bg-gray-900 border border-emeraldLangium h-full w-full">
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
                        <Preview ref={this.preview} focusLine={(line: number) => {
                            this.monacoEditor.current?.getEditorWrapper()?.getEditor()?.revealLineInCenter(line);
                            this.monacoEditor.current?.getEditorWrapper()?.getEditor()?.setPosition({ lineNumber: line, column: 1 });
                            this.monacoEditor.current?.getEditorWrapper()?.getEditor()?.focus();
                        }} />
                    </div>
                </div>
            </div>
        );
    }
}

async function startEditor() {
    // setup arithmetics config before rendering
    // TODO @montymxb no longer async, can move this upwards
    userConfig = createUserConfig({
        languageId: 'arithmetics',
        code: examples[0],
        htmlElement: document.getElementById('root')!,
        languageGrammar: arithmeticsGrammar,
        worker: '/showcase/libs/worker/arithmeticsServerWorker.js',
        monarchSyntax: syntaxHighlighting
    });
    const root = createRoot(document.getElementById("root") as HTMLElement);
    root.render(<App />);
}

startEditor();
