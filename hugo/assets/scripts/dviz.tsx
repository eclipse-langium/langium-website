import { MonacoEditorReactComp, monaco, addMonacoStyles } from '@typefox/monaco-editor-react/bundle';
import { buildWorkerDefinition } from 'monaco-editor-workers';
import React from 'react';
import { Graphviz } from 'graphviz-react';
import { createRoot } from 'react-dom/client';
import { astToGraph, deserializeAST, Diagnostic, DocumentChangeResponse, Graph, graphToDOT, traverse } from './ast-tools';

buildWorkerDefinition(
  "../../libs/monaco-editor-workers/workers",
  new URL("", window.location.href).href,
  false
);
addMonacoStyles('monaco-editor-styles');

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
  diagnostics?: Diagnostic[];
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

type StatsState = {
  graph: Graph
};

class Stats extends React.Component {
  constructor(props) {
    super(props);
    const statsState: StatsState = {
      graph: { nodes: [], edges: [] }
    };
    this.state = statsState;
  }

  update(newState: StatsState) {
    this.setState(newState);
  }

  render() {
    return (
      <>
      <div className="w-1/2 text-white" style={ {margin: '8px auto', padding: '8px auto'} }>
        <p style={ {fontSize: '30px'} }>
          Helpful Stats:<br/><br/>
          Nodes: {this.state.graph.nodes.length}<br/>
          Edges: {this.state.graph.edges.length}
        </p>
      </div>
      </>
    )
  }
}

class DiagramWrapper extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            dotSpec: `graph {}`
        };
    }

    update(newDotSpec: string) {
        this.setState({
            dotSpec: newDotSpec
        });
    }

    render() {
        const options = {
          fit: true,
          width: '100%',
          height: '100%'
        };
        return (
            <Graphviz dot={this.state.dotSpec} options={options} />
        )
    }
}

class App extends React.Component<{}> {
  monacoEditor: React.RefObject<MonacoEditorReactComp>;
  diagramWrapperRef: React.RefObject<DiagramWrapper>;
  statsRef: React.RefObject<Stats>;
  programText: string;
  currentInterval: NodeJS.Timer | undefined;
  graph: Graph;

  constructor(props) {
    super(props);

    // bind 'this' ref for callbacks to maintain parent context
    this.onMonacoLoad = this.onMonacoLoad.bind(this);
    this.onDocumentChange = this.onDocumentChange.bind(this);
    this.monacoEditor = React.createRef();
    this.diagramWrapperRef = React.createRef();
    this.statsRef = React.createRef();
    this.currentInterval = undefined;
    this.graph = {
      nodes: [],
      edges: []
    }
    this.programText = `// Create your own statemachine here!
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
    end`;
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
  onDocumentChange(resp: DocumentChangeResponse) {
    // // decode the received AST
    const langiumAst = deserializeAST(resp.content);
    // const plainAst = JSON.parse(resp.content);
    console.info("trying...");

    this.graph = astToGraph(langiumAst);

    this.statsRef.current.update({
      graph: this.graph
    });

    // TODO set here to use directly
    // const dotSpec = graphToDOT(this.graph);
    // this.diagramWrapperRef.current.update(dotSpec);

    // dot spec will be a bunch of parent to child relations
    const extraEdges = this.graph.edges;
    this.graph.edges = [];

    // gradual build-up
    if (this.currentInterval) {
      clearInterval(this.currentInterval);
    }
    this.currentInterval = setInterval(() => {
        let dotStr = 'strict digraph {\n';
        this.graph.edges.push(extraEdges.shift());
        this.diagramWrapperRef.current.update(graphToDOT(this.graph));

        if(extraEdges.length === 0) {
            clearInterval(this.currentInterval);
            this.currentInterval = undefined;
        }
    }, 333);
  }

  render() {
    return (
    <>
      <div className="w-4/5 h-full border border-emeraldLangium justify-center self-center flex" style={ {margin: '8px auto'} }>
        <div className="float-left w-1/2 h-full border-r border-emeraldLangium">
          <div className="wrapper relative bg-white dark:bg-gray-900" >
            <MonacoEditorReactComp ref={this.monacoEditor} onLoad={this.onMonacoLoad} webworkerUri="../showcase/libs/worker/statemachineServerWorker.js" workerName='LS' workerType='classic' languageId="statemachine" text={this.programText} syntax={syntaxHighlighting} style={ {
              paddingTop: "5px",
              height: "100%",
              width: "100%"
            } } />
          </div>
        </div>
        <div className="float-right w-1/2 h-full" id="preview" style={ {background: 'white'} }>
        <DiagramWrapper ref={this.diagramWrapperRef}  />
        </div>
      </div>
      <Stats ref={this.statsRef} />
    </>
    );
  }
}

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <App />
); 