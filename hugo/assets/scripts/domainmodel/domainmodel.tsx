import { MonacoEditorReactComp } from "@typefox/monaco-editor-react/bundle";
import { buildWorkerDefinition } from "monaco-editor-workers";
import React from "react";
import { createRoot } from "react-dom/client";
import { DocumentChangeResponse } from "../langium-utils/langium-ast";
import { example, syntaxHighlighting } from "./domainmodel-tools";
 
buildWorkerDefinition(
    "../../libs/monaco-editor-workers/workers",
    new URL("", window.location.href).href,
    false
);

class App extends React.Component<{}> {
    monacoEditor: React.RefObject<MonacoEditorReactComp>;
    constructor(props) {
        super(props);

        // bind 'this' ref for callbacks to maintain parent context
        this.onMonacoLoad = this.onMonacoLoad.bind(this);
        this.onDocumentChange = this.onDocumentChange.bind(this);
        this.monacoEditor = React.createRef();
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
        // let result = JSON.parse(resp.content)
        // let evaluations = result.$evaluations;
        // this.preview.current?.startPreview(evaluations, resp.diagnostics);
    }

    render() {
        const style = {
            height: "100%",
            width: "100%",
        };

        return (
            <div className="justify-center self-center flex flex-col md:flex-row h-full w-full p-4">
                <div className="wrapper relative bg-white dark:bg-gray-900 border border-emeraldLangium h-[50vh] min-h-[300px]">
                        <MonacoEditorReactComp
                            ref={this.monacoEditor}
                            onLoad={this.onMonacoLoad}
                            webworkerUri="../showcase/libs/worker/domainmodelServerWorker.js"
                            workerName="LS"
                            workerType="classic"
                            languageId="domainmodel"
                            text={example}
                            syntax={syntaxHighlighting}
                            style={style}
                        />
                    </div>
            </div>
        );
    }
}

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<App />);
