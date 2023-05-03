import { MonacoEditorReactComp } from "@typefox/monaco-editor-react/bundle";
import { buildWorkerDefinition } from "monaco-editor-workers";
import React from "react";
import { createRoot } from "react-dom/client";
import { Diagnostic, DocumentChangeResponse, LangiumAST } from "../langium-utils/langium-ast";
import { defaultText, StateMachineAstNode, StateMachineState, StateMachineTools, syntaxHighlighting } from "./statemachine-tools";
import { UserConfig } from "monaco-editor-wrapper/.";

buildWorkerDefinition(
  "../../libs/monaco-editor-workers/workers",
  new URL("", window.location.href).href,
  false
);
// addMonacoStyles("monaco-editor-styles");

interface StateProps {
  name: string;
  isActive: boolean;
  handleClick?;
}

interface EventProps {
  name: string;
  isEnabled: boolean;
  handleClick?;
}

interface PreviewProps {
  diagnostics?: Diagnostic[];
  astNode?: StateMachineAstNode;
}

class State extends React.Component<StateProps, StateProps> {
  private stateRef;
  constructor(props: StateProps) {
    super(props);
    this.state = {
      name: props.name,
      isActive: props.isActive,
    };
    this.stateRef = React.createRef<HTMLInputElement>();
  }

  /**
   * set the state to active or inactive
   * @param active true if the event should be active
   */
  setActive(active: boolean) {
    this.setState({ isActive: active });
  }

  render() {
    return (
      <div
        className="cursor-default"
        onClick={this.props.handleClick}
        ref={this.stateRef}
      >
        {this.state.isActive ? (
          <div className="text-emeraldLangium border-2 border-solid border-emeraldLangium rounded-md p-4 text-center text-sm shadow-opacity-50 shadow-[0px_0px_15px_0px] shadow-emeraldLangium">
            {this.state.name}
          </div>
        ) : (
          <div className="border-2 text-emeraldLangiumDarker border-solid border-emeraldLangiumDarker rounded-md p-4 text-center text-sm">
            {this.state.name}
          </div>
        )}
      </div>
    );
  }
}

class Event extends React.Component<EventProps, EventProps> {
  constructor(props: EventProps) {
    super(props);
    this.state = {
      name: props.name,
      isEnabled: props.isEnabled,
    };
  }

  /**
   * Enables or disables the event button
   * @param enabled true if the button should be enabled
   */
  setEnabled(enabled: boolean) {
    this.setState({ isEnabled: enabled });
  }

  render() {
    return (
      <button
        onClick={this.props.handleClick}
        disabled={this.state.isEnabled}
        className="text-white border-2 border-solid bg-emeraldLangiumABitDarker rounded-md p-4 text-center text-sm enabled:hover:shadow-opacity-50 enabled:hover:shadow-[0px_0px_15px_0px] enabled:hover:shadow-emeraldLangium disabled:border-gray-400 disabled:text-gray-400 disabled:bg-emeraldLangiumDarker ">
        {this.props.name}
      </button>
    );
  }
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

  startPreview(ast: StateMachineAstNode, diagnostics: Diagnostic[]) {
    this.setState({astNode: ast, diagnostics: diagnostics });
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
    if (this.state.diagnostics == null || (this.state.diagnostics.length == 0)) {
      let states: State[] = [];
      let events: Event[] = [];

      let statemachineTools = new StateMachineTools(this.state.astNode);
      // update the aktive state
      const changeStates = function(state: StateMachineState) {
        statemachineTools.setState(state);

        // loop through all states and set the active state
        events.forEach((i) => {
          i.setEnabled(statemachineTools.isEventEnabled(statemachineTools.getEventByName(i.props.name)!));
        });

        states.forEach((i) => {
          i.setActive(statemachineTools.isCurrentState(statemachineTools.getStateByName(i.props.name)!));
        });
   
      }

      return (
        <div className="flex flex-col h-full w-full p-4 float-right items-center">
          <p className="text-white text-lg w-full my-4">Events</p>
          <div className="flex flex-wrap w-full gap-2">
            {statemachineTools.getEvents().map((event, index) => {
              return (
                <Event
                  isEnabled={statemachineTools.isEventEnabled(event)}
                  handleClick={() => changeStates(statemachineTools.getNextState(event)!)}
                  name={event.name}
                  key={index}
                  ref={event => { events.push(event!) }}
                ></Event>
              );
            })}
          </div> 
          <p className="text-white text-lg w-full my-4">States</p>
          <div className="flex flex-wrap w-full gap-2 justify-start ">
            { // loop through every state and display it check if the state is active
              statemachineTools.getStates().map((state, index) => {
                return (
                  <State
                    isActive={statemachineTools.isCurrentState(state)}
                    handleClick={() => changeStates(state)}
                    name={state.name}
                    key={index}
                    ref={state => { states.push(state!) }}
                  ></State>
                );
              })}
          </div>
        </div>
      );
    }

    // Show the exception
    return (
      <div className="flex flex-col h-full w-full p-4 justify-start items-center my-10" >
        <div className="text-white border-2 border-solid border-accentRed rounded-md p-4 text-left text-sm cursor-default">
        {this.state.diagnostics.map((diagnostic, index) => 
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

class App extends React.Component<{}> {
  monacoEditor: React.RefObject<MonacoEditorReactComp>;
  preview: React.RefObject<Preview>;
  langiumGlobalConfig: UserConfig;
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

    if (!this.simpleCheck) {
      this.langiumGlobalConfig = this.createStatemachineConfig(defaultText, document.getElementById('monaco-root')!);
      this.simpleCheck = true;
    }
  }

  simpleCheck = false;

  /**
   * Callback invoked when the document processed by the LS changes
   * Invoked on startup as well
   * @param resp Response data
   */
  onDocumentChange(resp: DocumentChangeResponse) {
    // decode the received Ast
    const statemachineAst = new LangiumAST().deserializeAST(resp.content) as StateMachineAstNode;
    this.preview.current?.startPreview(statemachineAst, resp.diagnostics);
  }

  createStatemachineConfig (code: string, htmlElement: HTMLElement): UserConfig {
      // const exampleStatemachineUrl = new URL('./src/langium/example.statemachine', window.location.href).href;
      // const responseStatemachine = await fetch(exampleStatemachineUrl);
      // const code = await responseStatemachine.text();

      const extensionFiles = new Map<string, URL>();

      const statemachineLanguageConfig = new URL('../../language-configuration.json', window.location.href);
      const responseStatemachineTm = new URL('../../statemachine.tmLanguage.json', window.location.href);

      extensionFiles.set('/statemachine-configuration.json', statemachineLanguageConfig);
      extensionFiles.set('/statemachine-grammar.json', responseStatemachineTm);

      // Language Server preparation
      const workerUrl = new URL('../../showcase/libs/worker/statemachineServerWorker.js', window.location.href);
      // console.log(`Statemachine worker URL: ${workerUrl}`);

      return {
          htmlElement,
          wrapperConfig: {
              useVscodeConfig: true,
              serviceConfig: {
                  enableThemeService: true,
                  enableTextmateService: true,
                  enableModelEditorService: true,
                  modelEditorServiceConfig: {
                      useDefaultFunction: true
                  },
                  enableConfigurationService: true,
                  // configurationServiceConfig: {
                      // defaultWorkspaceUri: '/tmp/'
                  // },
                  enableKeybindingsService: true,
                  enableLanguagesService: true,
                  debugLogging: true
              },
              monacoVscodeApiConfig: {
                  extension: {
                      name: 'statemachine',
                      publisher: 'typefox',
                      version: '1.0.0',
                      engines: {
                          vscode: '*'
                      },
                      contributes: {
                          languages: [{
                              id: 'statemachine',
                              extensions: [
                                  '.statemachine'
                              ],
                              aliases: [
                                  'statemachine',
                                  'Statemachine'
                              ],
                              configuration: './statemachine-configuration.json'
                          }],
                          grammars: [{
                              language: 'statemachine',
                              scopeName: 'source.statemachine',
                              path: './statemachine-grammar.json'
                          }],
                          keybindings: [{
                              key: 'ctrl+p',
                              command: 'editor.action.quickCommand',
                              when: 'editorTextFocus'
                          }, {
                              key: 'ctrl+shift+c',
                              command: 'editor.action.commentLine',
                              when: 'editorTextFocus'
                          }]
                      }
                  },
                  extensionFiles,
                  userConfiguration: {
                      json: `{
      "workbench.colorTheme": "Default Dark+ Experimental",
      "editor.fontSize": 14,
      "editor.lightbulb.enabled": true,
      "editor.lineHeight": 20,
      "editor.guides.bracketPairsHorizontal": "active",
      "editor.lightbulb.enabled": true
  }`
                  }
              }
          },
          editorConfig: {
              languageId: 'statemachine',
              code,
              useDiffEditor: false,
              automaticLayout: true,
              theme: 'vs-dark',
          },
          languageClientConfig: {
              enabled: true,
              useWebSocket: false,
              workerConfigOptions: {
                  url: workerUrl,
                  type: 'classic', // ex. could also be module
                  name: 'LS',
              }
          }
      };
  }

  render() {
    const style = {
      paddingTop: "5px",
      height: "100%",
      width: "100%",
    };

    // const userConfig: UserConfig = {
    //   htmlElement: document.getElementById('root')!,
    //   wrapperConfig: {
    //       useVscodeConfig: false,
    //       monacoEditorConfig: {
    //       },
    //   },
    //   editorConfig: {
    //       languageId: 'statemachine',
    //       useDiffEditor: false,
    //       automaticLayout: true,
    //       theme: 'vs-dark',
    //       code: defaultText
    //   },
    //   languageClientConfig: {
    //       enabled: false
    //   }
    // };

    // let langiumGlobalConfig: UserConfig = this.createStatemachineConfig(defaultText, document.getElementById('monaco-root')!);
    this.langiumGlobalConfig = this.createStatemachineConfig(defaultText, document.getElementById('root')!);

    return (
      <div className="w-full h-full border border-emeraldLangium justify-center self-center flex">
        <div className="float-left w-1/2 h-full border-r border-emeraldLangium">
          <div id="monaco-root" className="wrapper relative bg-white dark:bg-gray-900">
            <MonacoEditorReactComp
              userConfig={this.langiumGlobalConfig}
              ref={this.monacoEditor}
              onLoad={this.onMonacoLoad}
              // webworkerUri="../showcase/libs/worker/statemachineServerWorker.js"
              // workerName="LS"
              // workerType="classic"
              // languageId="statemachine"
              // text={defaultText}
              // syntax={syntaxHighlighting}
              style={style}
            />
          </div>
        </div>
        <div className="float-right w-1/2 h-full" id="preview">
          <Preview ref={this.preview} />
        </div>
      </div>
    );
  }
}

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<App />);
