import { MonacoEditorReactComp, monaco, addMonacoStyles } from '@typefox/monaco-editor-react/bundle';
import { buildWorkerDefinition } from 'monaco-editor-workers';
import React from 'react';
import { createRoot } from 'react-dom/client';

/**
 * General position data for diagnostics
 */
type Pos = {
  character: number;
  line: number;
}

/**
 * Diagnostics that can be returned in a DocumentChange response
 */
type Diagnostic = {
  // general string-based code for this diagnostic (like 'linking-error')
  code: string;
  // user-friendly diagnostic message
  message: string;
  // start -> end range of the diagnostic
  range: {
    start: Pos;
    end: Pos;
  }
  // severity code
  severity: number;
  // source language by string
  source: string;
};

/**
 * Response for a DocumentChange notification
 */
type DocumentChangeResponse = {
  uri: string;
  content: string;
  diagnostics: Diagnostic[];
};

// Simplified notion of a state machine event in the AST
type StateMachineEvent = {
  name: string;
};

// Simplified notion of a state machine state in the AST
type StateMachineState = {
  name: string;
  transitions: {
    event: {
      ref: StateMachineEvent
    },
    state: {
      ref: StateMachineState
    }
  }[]
};

/**
 * Approximation of a langium AST, capturing the most relevant information
 */
interface AstNode {
  $type: string;
  $container?: AstNode;
  $containerProperty?: string;
  $containerIndex?: number;

  // customizations added for the StateMachine example
  events: StateMachineEvent[];
  states: StateMachineState[];
}

// Identify an AST node by it's type & shape
function isAstNode(obj: unknown): obj is AstNode {
  return typeof obj === 'object' && obj !== null && typeof (obj as AstNode).$type === 'string';
}

export interface Reference<T extends AstNode = AstNode> {
  ref?: T;
  $ref: string
}

// Identify a ref by its type & shape as well
function isReference(obj: unknown): obj is Reference {
  return typeof obj === 'object' && obj !== null && typeof (obj as Reference).$ref === 'string';
}

// Link a given node
function linkNode(node: AstNode, root: AstNode, container?: AstNode, containerProperty?: string, containerIndex?: number): void {
  // set container details, if any (undefined for root)
  node.$containerProperty = containerProperty;
  node.$containerIndex = containerIndex;
  node.$container = container;

  // iterate over all props in this node
  for (const [propertyName, item] of Object.entries(node)) {

    if (propertyName === '$container') {
      // don't evaluate containers again (causes a recursive loop)
      continue;
    }

    if (Array.isArray(item)) {
      // Array of refs/nodes
      for (let index = 0; index < item.length; index++) {
          const element = item[index];
          if (isReference(element)) {
            // reconstruct cross ref
            element.ref = getAstNode(root, element.$ref);
          } else if (isAstNode(element)) {
            // another AST node we should link with proper details
            linkNode(element, root, node, propertyName, index);
          }
      }
    } else if (isReference(item)) {
      // single reference to handle
      item.ref = getAstNode(root, item.$ref);
    } else if (isAstNode(item)) {
      // single ast node to handle
      linkNode(item, root, node, propertyName);
    }
  }
}

// Takes the root, and a path string, traversing the root to find the node denoted by the path
function getAstNode(root: AstNode, path: string): AstNode | undefined {
  if (!path.startsWith('#')) {
    // this isn't something we can decode, skip
    return undefined;
  }

  // break up path segments for traversal
  const segments = path.substring(1).split('/');

  return segments.reduce((previousValue, currentValue) => {
    if (!previousValue || currentValue.length === 0) {
      // no root or nothing else to check, return what we have so far
      return previousValue;
    }
    const propertyIndex = currentValue.indexOf('@');
    if (propertyIndex > 0) {
      // Array part of path to extract
      const property = currentValue.substring(0, propertyIndex);
      // get array index using prop
      const arrayIndex = parseInt(currentValue.substring(propertyIndex + 1));
      // find array with prop & return via index
      const array = (previousValue as unknown as Record<string, AstNode[]>)[property];
      return array?.[arrayIndex];
    }
    // instead, index one farther down the tree using the current value
    return (previousValue as unknown as Record<string, AstNode>)[currentValue];
  }, root);
}

/**
 * Takes a string corresponding to a serialized Langium AST, and returns a deserialized AST node
 * 
 * @param content String to parse & deserialize
 * @returns A Langium AST with cross-refs restored
 */
function deserializeAST(content: string): AstNode {
  const root = JSON.parse(content);
  linkNode(root, root);
  return root;
}



buildWorkerDefinition(
  "../../libs/monaco-editor-workers/workers",
  new URL("", window.location.href).href,
  false
);
addMonacoStyles('monaco-editor-styles');

let dummyData = {
  events: ["switchCapacity", "next"],
  states: [
    {
      name: "PowerOff",
      next: "",
      switchCapacity: "RedLight"
    },
    {
      name: "GreenLight",
      next: "YellowLight",
      switchCapacity: "PowerOff"
    },
    {
      name: "YellowLight",
      next: "RedLight",
      switchCapacity: "PowerOff"
    },
    {
      name: "RedLight",
      next: "GreenLight",
      switchCapacity: "PowerOff"
    }
  ],
  initialState: "PowerOff"
}

const syntaxHighlighting = {
  keywords: [
    'actions', 'commands', 'end', 'events', 'initialState', 'state', 'statemachine'
  ],

  // The main tokenizer for our languages
  tokenizer: {
    root: [
      // identifiers and keywords
      [/[a-z_$][\w$]*/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'identifier'
        }
      }],

      // whitespace
      { include: '@whitespace' }
    ],

    comment: [
      [/[^\/*]+/, 'comment'],
      [/\/\*/, 'comment', '@push'],    // nested comment
      ["\\*/", 'comment', '@pop'],
      [/[\/*]/, 'comment']
    ],

    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/\/\*/, 'comment', '@comment'],
      [/\/\/.*$/, 'comment'],
    ]
  }
} as monaco.languages.IMonarchLanguage;

let currentState;

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
  hasError?: boolean;
}

class State extends React.Component<StateProps, StateProps> {
  private stateRef;
  constructor(props: StateProps) {
    super(props);
    this.state = {
      name: props.name,
      isActive: props.isActive
    }
    this.stateRef = React.createRef<HTMLInputElement>();
  }

  setActive(isItActiveBro: boolean) {
    this.setState({ isActive: isItActiveBro });
  }

  render() {
    return (
      <div className='cursor-default' onClick={this.props.handleClick} ref={this.stateRef}>
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
    }
  }

  setEnabled(enabled: boolean) {
    this.setState({ isEnabled: enabled });
  }

  render() {
    return (
      <button onClick={this.props.handleClick} disabled={this.state.isEnabled} className="text-white border-2 border-solid bg-emeraldLangiumABitDarker rounded-md p-4 text-center text-sm enabled:hover:shadow-opacity-50 enabled:hover:shadow-[0px_0px_15px_0px] enabled:hover:shadow-emeraldLangium disabled:border-gray-400 disabled:text-gray-400 disabled:bg-emeraldLangiumDarker ">
        {this.props.name}
      </button>
    );
  }
}


class Preview extends React.Component<PreviewProps, PreviewProps> {
  constructor(props: PreviewProps) {
    super(props);
    this.state = {
      hasError: props.hasError,
    }
  }

  startPreview(hasError: boolean) {
    this.setState({hasError: hasError})
  }

  render() {
    // Continue if the code is right
    if (!this.state.hasError) {
      let states: State[] = [];
      let events: Event[] = [];
      const changeStates = function (state: string) {
        states.forEach(item => {
          item.setActive(item.props.name === state);
        });
        currentState = state;
        events.forEach(event => {
          event.setEnabled(!getNextState(event.props.name));
        });
      }

      const getNextState = function (event: string): string {
        return dummyData.states.find(({ name }) => name === currentState)![event];
      }

      return (
        <div className="flex flex-col h-full w-full p-4 float-right items-center">
          <p className='text-white text-lg w-full my-4'>Events</p>
          <div className='flex flex-wrap w-full gap-2'>
            {dummyData.events.map((event, index) => {
              return <Event isEnabled={!getNextState(event)} handleClick={() => changeStates(getNextState(event))} name={event} key={index} ref={event => { events.push(event!) }}></Event>
            })}
          </div>
          <p className='text-white text-lg w-full my-4'>States</p>
          <div className='flex flex-wrap w-full gap-2 justify-start '>
            {dummyData.states.map((state, index) => {
              return <State handleClick={() => changeStates(state.name)} name={state.name} key={index} isActive={currentState == state.name} ref={state => { states.push(state!) }}></State>
            })}
          </div>
        </div>
      );
    }

    // Show the exception
    return (
      <div className="flex flex-col h-full w-full p-4 justify-start items-center my-10">
        <div className="text-white border-2 border-solid border-accentRed rounded-md p-4 text-center text-sm cursor-default">
          Failed to compile your code
        </div>
      </div>
    );
  }
}

class App extends React.Component<{}, { hasError }> {
  monacoEditor: React.RefObject<MonacoEditorReactComp>;
  preview:  React.RefObject<Preview>;
  constructor(props) {
    super(props);

    // bind 'this' ref for callbacks to maintain parent context
    this.onMonacoLoad = this.onMonacoLoad.bind(this);

    this.monacoEditor = React.createRef();
    this.preview = React.createRef();
    this.state = {
      hasError: false
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
      throw new Error('Unable to get a reference to the Monaco Editor');
    }

    // verify we can get a ref to the language client
    const lc = this.monacoEditor.current?.getEditorWrapper()?.getLanguageClient();
    if (!lc) {
      throw new Error('Could not get handle to Language Client on mount');
    }

    // register to receive DocumentChange notifications
    lc.onNotification('browser/DocumentChange', this.onDocumentChange);
  }

  /**
   * Callback invoked when the document processed by the LS changes
   * Invoked on startup as well
   * 
   * @param resp Response data
   */
  onDocumentChange(resp: DocumentChangeResponse): void {
    // decode the received AST
    const langiumAst = deserializeAST(resp.content);

    console.info('\n===== STATE MACHINE AST INFO ======');

    // perhaps do something with diagnostics?
    const diagnostics = resp.diagnostics;
    console.info('Got ' + diagnostics.length + ' diagnostics');

    // and extract something from the AST as an example
    // pull out all events
    const eventNames: string[] = [];
    for (const event of langiumAst.events) {
      eventNames.push(event.name);
    }
    console.info('Found events: ' + eventNames.join(', '));

    // pull out all states
    // const stateInfo: StateMachineState[] = [];
    for (const state of langiumAst.states) {
      console.info('\nFound State: ' + state.name + ' with transitions:');
      for (const transition of state.transitions) {
        console.info(transition.event.ref.name + '\t=>\t' + transition.state.ref.name);
      }
    }

    // TODO @montymxb, then you can update the UI with this new AST information :)
    // Also, if you ever are looking for more info, you can also pick through the AST manually with a console dir
    // console.dir(langiumAst);
  }

  render() {
    currentState = dummyData.initialState;
    const style = {
      "paddingTop": "5px",
      "height": "100%",
      "width": "100%"
    };

    return (
      <div className="w-full h-full border border-emeraldLangium justify-center self-center flex">
        <div className="float-left w-1/2 h-full border-r border-emeraldLangium">
          <div className="wrapper relative bg-white dark:bg-gray-900" >
            <MonacoEditorReactComp ref={this.monacoEditor} onLoad={this.onMonacoLoad} webworkerUri="../showcase/libs/worker/statemachineServerWorker.js" workerName='LS' workerType='classic' languageId="statemachine" text={`// Create your own statemachine here!
statemachine TrafficLight

events
    switchCapacity
    next

initialState PowerOff

state PowerOff
    switchCapacity => RedLight
end

state RedLight
    switchCapacity => PowerOff
    next => GreenLight
end

state YellowLight
    switchCapacity => PowerOff
    next => RedLight
end

state GreenLight
    switchCapacity => PowerOff
    next => YellowLight
end`} syntax={syntaxHighlighting} style={style} />
          </div>
        </div>
        <div className="float-right w-1/2 h-full" id="preview">
          <Preview ref={this.preview} hasError={this.state.hasError} />
        </div>
      </div>
    );
  }
}

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <App />
); 