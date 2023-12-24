import { createRef } from "react";
import { Diagnostic } from "../langium-utils/langium-ast";
import React from "react";

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

export class LoxPreview extends React.Component<PreviewProps, PreviewState> {
    terminalContainer: React.RefObject<HTMLDivElement>;
    constructor(props: PreviewProps) {
        super(props);
        this.state = {
            diagnostics: props.diagnostics,
            messages: [],
        };

        this.terminalContainer = createRef<HTMLDivElement>();
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
            
            // auto scroll to bottom
            const terminal = this.terminalContainer.current;
            const newLine = terminal?.lastElementChild;
            if (newLine && terminal) {
                const rect = newLine.getBoundingClientRect();
                if (rect.bottom <= terminal.getBoundingClientRect().bottom) {
                    newLine.scrollIntoView();
                }
            }

            return (
                <div>
                    <div className="text-sm flex flex-col p-4 overflow-x-hidden overflow-y-scroll" ref={this.terminalContainer}>
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
