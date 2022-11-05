import React, { CSSProperties } from "react";
import { MonacoEditorLanguageClientWrapper } from "monaco-editor-wrapper/bundle";
import Monaco from "monaco-editor";
import monaco from "monaco-editor/esm/vs/editor/editor.api";
import type { MonacoLanguageClient } from "monaco-languageclient";

export interface MonacoEditorProps {
    languageId: string;
    text: string;
    style?: CSSProperties;
    className?: string;
    webworkerUri?: string;
    readOnly?: boolean;
    syntax: Monaco.languages.IMonarchLanguage;
    onTextChanged?: (text: string, isDirty: boolean) => void;
    onLoading?: () => void;
    onLoad?: () => void;
}

MonacoEditorLanguageClientWrapper.addMonacoStyles("monaco-editor-styles");
MonacoEditorLanguageClientWrapper.addCodiconTtf();

export class MonacoEditor extends React.Component<MonacoEditorProps> {
    private editor: MonacoEditorLanguageClientWrapper | null = null;

    private containerElement?: HTMLDivElement;

    private _subscription: monaco.IDisposable | null = null;

    private isStarting?: Promise<string>;

    private resizeEvent: () => void = () => {};

    constructor(props: MonacoEditorProps) {
        super(props);
        this.containerElement = undefined;
    }

    componentDidMount() {
        this.destroyMonaco().then(() => this.initMonaco());
    }

    componentDidUpdate(prevProps: MonacoEditorProps) {
        const { className, text, webworkerUri, syntax, languageId } =
            this.props;

        const { editor } = this;

        const editorConfig = editor!.getEditorConfig();
        const innerEditor: monaco.editor.IStandaloneCodeEditor =
            editor!["editor"];

        if (prevProps.className !== className && this.containerElement) {
            this.containerElement.className = className ?? "";
        }
        if (prevProps.webworkerUri !== webworkerUri) {
            this.destroyMonaco().then(() => this.initMonaco());
        } else {
            editorConfig.setMainLanguageId(languageId);
            editorConfig.setMonarchTokensProvider(syntax);
            editor!["updateMonacoConfig"]();
            const model = innerEditor.getModel();
            if (model && text !== model.getValue()) {
                model.setValue(text);
            }
        }
    }

    componentWillUnmount() {
        this.destroyMonaco();
    }

    private assignRef = (component: HTMLDivElement) => {
        this.containerElement = component;
    };

    private async destroyMonaco(): Promise<void> {
        if (this.editor) {
            await this.isStarting;
            window.removeEventListener("resize", this.resizeEvent);
            try {
                await this.editor.dispose();
            } catch {
                // This is fine
                // Sometimes the language client throws an error during disposal
                // This should not prevent us from continue working
            }
            this.editor["languageClient"] = undefined;
        }
        if (this._subscription) {
            this._subscription.dispose();
        }
    }

    private async initMonaco() {
        const {
            className,
            text,
            syntax,
            languageId,
            webworkerUri,
            onTextChanged,
            onLoading,
            onLoad,
            readOnly = false,
        } = this.props;
        if (this.containerElement) {
            this.containerElement.className = className ?? "";
            this.editor = new MonacoEditorLanguageClientWrapper("42");
            const editorConfig = this.editor.getEditorConfig();
            editorConfig.setMainLanguageId(languageId);
            editorConfig.setMonarchTokensProvider(syntax);
            editorConfig.setMainCode(text);
            editorConfig.setUseWebSocket(false);
            editorConfig.setUseLanguageClient(false);

            if (webworkerUri) {
                editorConfig.setUseLanguageClient(true);
                const workerURL = new URL(webworkerUri, window.origin);
                const lsWorker = new Worker(workerURL.href, {
                    type: "classic",
                    name: "LS",
                });
                this.editor.setWorker(lsWorker);
            }

            editorConfig.setMonacoEditorOptions({
                readOnly
            });

            this.isStarting = this.editor.startEditor(this.containerElement);
            this.resizeEvent = () => this.updateLayout();
            window.addEventListener("resize", this.resizeEvent);
            await this.isStarting;

            if (webworkerUri) {
                const languageClient: MonacoLanguageClient =
                    this.editor["languageClient"];
                this.isStarting = new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(), 20_000);
                    const interval = setInterval(async () => {
                        const ready = (await languageClient.sendRequest(
                            "fullInit"
                        )) as boolean;
                        if (ready) {
                            clearTimeout(timeout);
                            clearInterval(interval);
                            resolve("initialized");
                        }
                    }, 100);
                });
            }

            onLoading && onLoading();
            onLoad && this.isStarting.then(() => onLoad());

            if (onTextChanged) {
                const innerEditor: monaco.editor.IStandaloneCodeEditor =
                    this.editor["editor"];
                const model = innerEditor.getModel();
                if (model) {
                    this._subscription = model.onDidChangeContent(() => {
                        const modelText = model.getValue();
                        onTextChanged(modelText, modelText !== text);
                    });
                    const currentValue = model.getValue();
                    if (currentValue !== text) {
                        onTextChanged(currentValue, true);
                    }
                }
            }
        }
    }

    updateLayout(): void {
        this.editor!.updateLayout();
    }

    getText(): string {
        try {
            const innerEditor: monaco.editor.IStandaloneCodeEditor =
                this.editor!["editor"];
            const model = innerEditor.getModel();
            return model?.getValue() ?? "";
        } catch {
            return "";
        }
    }

    render() {
        return (
            <div
                ref={this.assignRef}
                style={this.props.style}
                className={this.props.className}
            />
        );
    }
}
