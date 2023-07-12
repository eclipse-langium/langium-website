import {
    MonacoEditorReactComp,
    addMonacoStyles,
} from "@typefox/monaco-editor-react/bundle";
import { buildWorkerDefinition } from "monaco-editor-workers";
import React  from "react";
import { createRoot } from "react-dom/client";
import { Diagnostic, DocumentChangeResponse } from "../langium-utils/langium-ast";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { LoxMessage, exampleCode, syntaxHighlighting } from "./lox-tools";

buildWorkerDefinition(
    "../../libs/monaco-editor-workers/workers",
    new URL("", window.location.href).href,
    false
);
addMonacoStyles("monaco-editor-styles");

interface PreviewProps {
    diagnostics?: Diagnostic[];
}

interface PreviewState {
    diagnostics?: Diagnostic[];
    messages: TerminalMessage[];
}

interface TerminalMessage {
    type: "notification" | "error" | "output";
    content: string | string[];
}

class Preview extends React.Component<PreviewProps, PreviewState> {
    constructor(props: PreviewProps) {
        super(props);
        this.state = {
            diagnostics: props.diagnostics,
            messages: [],
        };
    }

    println(text: string) {
        this.setState((state) => ({
            messages: [...state.messages, { type: "output", content: text }],
        }));
    }

    error(text: string) {
        this.setState((state) => ({
            messages: [...state.messages, { type: "error", content: text }],
        }));
    }

    clear() {
        this.setState({ messages: [] });
    }

    setDiagnostics(diagnostics: Diagnostic[]) {
        this.setState({ diagnostics: diagnostics });

    }

    render() {
        // if the code doesn't contain any errors and the diagnostics aren't warnings
        if (this.state.diagnostics == null || this.state.diagnostics.filter((i) => i.severity === 1).length == 0) {
            return (
                <div>
                    <div className="text-sm flex flex-col p-4 overflow-hidden overflow-y-scroll">
                            {this.state.messages.map((message, index) =>
                                <p key={index} className={message.type == "error" ? "text-base text-accentRed" : "text-white"}>{message.type == "error" ? "An error occurred: " : ""} {message.content}</p>
                            )}
                    </div>
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



class App extends React.Component<{}, {}> {
    monacoEditor: React.RefObject<MonacoEditorReactComp>;
    preview: React.RefObject<Preview>;
    copyHint: React.RefObject<HTMLDivElement>;
    shareButton: React.RefObject<HTMLImageElement>;
    constructor(props) {
        super(props);

        // bind 'this' ref for callbacks to maintain parent context
        this.onMonacoLoad = this.onMonacoLoad.bind(this);
        this.onDocumentChange = this.onDocumentChange.bind(this);
        this.copyLink = this.copyLink.bind(this);
        this.monacoEditor = React.createRef();
        this.preview = React.createRef();
        this.copyHint = React.createRef();
        this.shareButton = React.createRef();
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
        const message = JSON.parse(resp.content) as LoxMessage;
        switch (message.type) {
            case "notification":
                switch (message.content) {
                    case "startInterpreter":
                        this.preview.current?.clear();
                        break;
                }
                break;
            case "error":
                this.preview.current?.error(message.content as string);
                break;
            case "output":
                this.preview.current?.println(message.content as string);
                break;
        }
        this.preview.current?.setDiagnostics(resp.diagnostics);
    }


    async copyLink() {
        const code = this.monacoEditor.current?.getEditorWrapper()?.getEditor()?.getValue()!;
        const url = new URL("/showcase/lox", window.origin);
        url.searchParams.append("code", compressToEncodedURIComponent(code));

        this.copyHint.current!.style.display = "block";
        this.shareButton.current!.src = '/assets/checkmark.svg';
        setTimeout(() => {
            this.shareButton.current!.src = '/assets/share.svg';
            this.copyHint.current!.style.display = 'none';
        }, 1000);

        navigator.clipboard.writeText(window.location.href);

        await navigator.clipboard.writeText(url.toString());
    }

    componentDidMount() {
        this.shareButton.current!.addEventListener('click', this.copyLink);
    }

    render() {
        const style = {
            height: "100%",
            width: "100%",
        };
        const url = new URL(window.location.toString());
        let code = url.searchParams.get("code");
        if (code) {
            code = decompressFromEncodedURIComponent(code);
        }

        return (
            <div className="justify-center self-center flex flex-col md:flex-row h-full w-full">
                <div className="float-left w-full h-full flex flex-col">
                    <div className="border-solid border border-emeraldLangium bg-emeraldLangiumDarker flex items-center p-3 text-white font-mono ">
                        <span>Editor</span>
                        <div className="flex flex-row justify-end w-full h-full gap-2">
                            <div className="text-sm hidden" ref={this.copyHint}>Link was copied!</div>
                            <img src="/assets/share.svg" title="Copy URL to this grammar and content" className="inline w-4 h-4 cursor-pointer" ref={this.shareButton}></img>
                        </div>
                    </div>
                    <div className="wrapper relative bg-white dark:bg-gray-900 border border-emeraldLangium h-full w-full">
                        <MonacoEditorReactComp
                            ref={this.monacoEditor}
                            onLoad={this.onMonacoLoad}
                            webworkerUri="../showcase/libs/worker/loxServerWorker.js"
                            workerName="LS"
                            workerType="classic"
                            languageId="lox"
                            text={code ? code : exampleCode}
                            syntax={syntaxHighlighting}
                            style={style}
                        />
                    </div>
                </div>
                <div className="float-left w-full h-full flex flex-col" id="preview">
                    <div className="border-solid border border-emeraldLangium bg-emeraldLangiumDarker flex items-center p-3 text-white font-mono ">
                        <span>Output</span>
                    </div>
                    <div className="border border-emeraldLangium h-full w-full overflow-hidden overflow-y-scroll">
                        <Preview ref={this.preview} />
                    </div>
                </div>
            </div>
        );
    }
}

export async function share(code: string): Promise<void> {
    const url = new URL("/showcase/lox", window.origin);
    url.searchParams.append("code", compressToEncodedURIComponent(code));
    await navigator.clipboard.writeText(url.toString());
}


const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<App />);
