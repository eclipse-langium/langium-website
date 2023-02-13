import { MonacoEditorReactComp, monaco, addMonacoStyles } from '@typefox/monaco-editor-react/bundle';
import { buildWorkerDefinition } from 'monaco-editor-workers';
import React from 'react';
import { Graphviz } from 'graphviz-react';
import { createRoot } from 'react-dom/client';
import { astToGraph, deserializeAST, Diagnostic, DocumentChangeResponse, Graph, graphToDOT, TreemapData, astToTreemapData, isReference, getASTCrossRefs, toHex } from './ast-tools';
import {
  XYPlot,
  XAxis,
  YAxis,
  VerticalGridLines,
  HorizontalGridLines,
  VerticalBarSeries,
  RadialChart,
  Treemap
} from 'react-vis';

buildWorkerDefinition(
  "../../libs/monaco-editor-workers/workers",
  new URL("", window.location.href).href,
  false
);
addMonacoStyles('monaco-editor-styles');

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
  graph: Graph;
  barChartData: {x: string, y: number}[];
  radialData: {
    angle: number;
    label?: string;
    subLabel?: string;
    radius?: number;
  }[];
  treemapData: TreemapData;
  crossRefsCount: number;
};

class Stats extends React.Component {
  constructor(props) {
    super(props);
    const statsState: StatsState = {
      graph: { nodes: [], edges: [] },
      barChartData: [],
      radialData: [],
      treemapData: {
        title: 'n/a',
        color: '#faf',
        children: [],
        size: 1
      },
      crossRefsCount: 0
    };
    this.state = statsState;
  }

  update(newState: StatsState) {    
    this.setState(newState);
  }

  render() {
    return (
      <>
      <div className="w-4/5" style={ {margin: '8px auto', padding: '8px', background: 'white'} }>
        <p style={ {fontSize: '30px', padding: '8px'} }>
          Helpful Stats:<br/><br/>
          Nodes: {this.state.graph.nodes.length}<br/>
          Cross References: {this.state.crossRefsCount}
        </p>
        <hr/>
        
        <h2>Node Types</h2>

        <XYPlot margin={ {bottom: 128} } xType="ordinal" width={1000} height={1000}>
      <VerticalGridLines />
      <HorizontalGridLines />
      <XAxis tickLabelAngle={-45} />
      <YAxis />
      <VerticalBarSeries
        colorType={'literal'}
        data={this.state.barChartData}
      />
    </XYPlot>
    <hr/>

<h3>Pie chart of Syntactic Categories</h3>
<div style={ {background: '#333', padding: '32px'} }>
<RadialChart
  margin={ {top: 100} }
  colorType={'literal'}
  data={this.state.radialData}
  getLabel={d => d.name}
  width={1000}
  height={1000}
  labelsRadiusMultiplier={0.8}
  labelsStyle={ {fontSize: 16, fill: '#fff'} }
  style={ {stroke: '#fff', strokeWidth: 2, padding: 32} }
  innerRadius={200}
  // onValueMouseOver={v => this.setState({hintValue: v})}
  // nSeriesMouseOut={() => this.setState({hintValue: false})}
  radius={400}
  showLabels />
  </div>


<hr/>
<h3>Treemap of the AST</h3>
<Treemap
  {...{
    animation: true,
    colorType: 'literal',
    colorRange: ['#88572C'],
    renderMode: 'DOM',
    width: 1200,
    height: 1200,
    data: this.state.treemapData, 
    // mode: 'circlePack',
    // mode: 'squarify',
    // mode: 'partition',
    mode: 'partition-pivot',
    // mode: 'binary',
    style: {
      stroke: '#fff',
      strokeWidth: '1',
      strokeOpacity: 1,
      border: 'thin solid #fff'
    }
  }}
  />


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
          height: '100vh',
          zoom: true
        };
        return (
            <Graphviz dot={this.state.dotSpec} options={options} />
        )
    }
}

class LangiumAnalysisComponent extends React.Component<{}> {
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
    this.programText = this.props.startingProgram;
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

    const barChartMap = new Map<string, number>();
    let total = 0;
    for (const node of this.graph.nodes) {
      if (!barChartMap.has(node.$type)) {
        barChartMap.set(node.$type, 1);
      } else {
        barChartMap.set(node.$type, barChartMap.get(node.$type) + 1);
      }
      total++;
    }

    // find & set cross refs
    let crossRefsCount = getASTCrossRefs(langiumAst).length;

    const barChartData = [];
    const totalNodeCount = this.graph.nodes.length;
    const radialData = [];

    barChartMap.forEach((v,k) => {
      barChartData.push({
        x: k,
        y: v,
        color: toHex(k)
      });

      radialData.push({
        angle: v,
        name: k,
        subLabel: Math.floor(v / total * 100) + '%',
        color: toHex(k)
      });

    });

    // console.dir(radialData);

    const treemapData = astToTreemapData(langiumAst);

    this.statsRef.current.update({
      graph: { ...this.graph },
      barChartData,
      radialData,
      treemapData,
      crossRefsCount
    });

    // not great, just a quick ref to 'this' for now
    const _this = this;

    function showEntireGraph() {
      const dotSpec = graphToDOT(_this.graph);
      _this.diagramWrapperRef.current.update(dotSpec);
    }

    function showGraphStepByStep() {
      // dot spec will be a bunch of parent to child relations
      const extraEdges = _this.graph.edges;
      _this.graph.edges = [];

      // gradual build-up
      if (_this.currentInterval) {
        clearInterval(_this.currentInterval);
      }
      _this.currentInterval = setInterval(() => {
          let dotStr = 'strict digraph {\n';
          _this.graph.edges.push(extraEdges.shift());
          _this.diagramWrapperRef.current.update(graphToDOT(_this.graph));

          if(extraEdges.length === 0) {
              clearInterval(_this.currentInterval);
              _this.currentInterval = undefined;
          }
      }, 100);
    }

    // TODO here you can toggle what's displayed
    // showEntireGraph();
    showGraphStepByStep();
    
  }

  render() {
    return (
    <>
         {/* For uber/react-vis */}
      <link rel="stylesheet" href="https://unpkg.com/react-vis/dist/style.css"></link>
      <div className="w-4/5 h-full border border-emeraldLangium justify-center self-center flex" style={ {margin: '8px auto'} }>
        <div className="float-left w-1/2 h-full border-r border-emeraldLangium">
          <div className="wrapper relative bg-white dark:bg-gray-900" >
            <MonacoEditorReactComp ref={this.monacoEditor} onLoad={this.onMonacoLoad} webworkerUri={this.props.webworkerUri} workerName={this.props.workerName} workerType={this.props.workerType} languageId={this.props.languageId} text={this.programText} syntax={this.props.syntaxHighlighting} style={ {
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

class App extends React.Component {
  constructor(props) {
    super(props);
    this.handleLanguageChange = this.handleLanguageChange.bind(this);
    this.state = {
      // TODO here you can toggle the intended language to display
      language: 'arithmetics'
    };
  }

  handleLanguageChange(event) {
    this.setState({language: event.target.value});
  }

  render() {
    // const targets = [
    //   'arithmetics',
    //   'domainmodel',
    //   'statemachine'
    // ];

    const target = this.state.language;
    console.info('TARGET IS: ' + target);

    let workerUri = '';
    let languageId = '';
    let startingProgram = '';
    let syntaxHighlighting = {};

    if (target === 'arithmetics') {
      // Arithmetics
      workerUri = '../showcase/libs/worker/arithmeticsServerWorker.js';
      languageId = 'arithmetics';
      startingProgram = `Module example1

Def y: 1 + 3 - 99828932 / 2 + 2 - 1;

DEF x: 12 / 3 - 1; // 3

x * 2 - 4;

def t: 4;

DEF func(t, x):
    t * t * t + x;

// This language is case-insensitive regarding symbol names
Func(T, X); // 67
Func(X, T); // 31
Func(T, Func(T, X)); // 131

`;
      syntaxHighlighting = {
        keywords: [
            'def','module'
        ],
        operators: [
            '-',',',';',':','*','/','+'
        ],
        symbols:  /-|,|;|:|\(|\)|\*|\/|\+/,

        tokenizer: {
            initial: [
                { regex: /[_a-zA-Z][\w_]*/, action: { cases: { '@keywords': {"token":"keyword"}, '@default': {"token":"ID"} }} },
                { regex: /[0-9]+(\.[0-9]*)?/, action: {"token":"number"} },
                { include: '@whitespace' },
                { regex: /@symbols/, action: { cases: { '@operators': {"token":"operator"}, '@default': {"token":""} }} },
            ],
            whitespace: [
                { regex: /\s+/, action: {"token":"white"} },
                { regex: /\/\*/, action: {"token":"comment","next":"@comment"} },
                { regex: /\/\/[^\n\r]*/, action: {"token":"comment"} },
            ],
            comment: [
                { regex: /[^\/\*]+/, action: {"token":"comment"} },
                { regex: /\*\//, action: {"token":"comment","next":"@pop"} },
                { regex: /[\/\*]/, action: {"token":"comment"} },
            ],
        }
      } as monaco.languages.IMonarchLanguage;

    } else if (target === 'domainmodel') {
      // Domainmodel
      workerUri = '../showcase/libs/worker/domainmodelServerWorker.js';
      languageId = 'domainmodel';
    startingProgram = `entity E1 {
    name: String
}

package foo.bar {
    datatype Complex

    entity E2 extends E1 {
        next: E2
        other: baz.E3
        nested: baz.nested.E5
        time: big.Int
    }
}

package baz {
    entity E3 {
        that: E4
        other: foo.bar.E2
        nested: nested.E5
    }

    entity E4 {
    }

    package nested {
        entity E5 {
            ref: E3
        }
    }
}
    
`;
      syntaxHighlighting = {
        keywords: [
          'datatype', 'entity', 'extends', 'many', 'package'
        ],
        operators: [
          ':', '.'
        ],
        symbols: /:|\.|\{|\}/,

        tokenizer: {
          initial: [
            { regex: /[_a-zA-Z][\w_]*/, action: { cases: { '@keywords': { "token": "keyword" }, '@default': { "token": "ID" } } } },
            { regex: /[0-9]+/, action: { "token": "number" } },
            { regex: /"[^"]*"|'[^']*'/, action: { "token": "string" } },
            { include: '@whitespace' },
            { regex: /@symbols/, action: { cases: { '@operators': { "token": "operator" }, '@default': { "token": "" } } } },
          ],
          whitespace: [
            { regex: /\s+/, action: { "token": "white" } },
            { regex: /\/\*/, action: { "token": "comment", "next": "@comment" } },
            { regex: /\/\/[^\n\r]*/, action: { "token": "comment" } },
          ],
          comment: [
            { regex: /[^\/\*]+/, action: { "token": "comment" } },
            { regex: /\*\//, action: { "token": "comment", "next": "@pop" } },
            { regex: /[\/\*]/, action: { "token": "comment" } },
          ],
        }
      } as monaco.languages.IMonarchLanguage;

    } else if (target === 'statemachine') {
      // Statemachine
      workerUri = '../showcase/libs/worker/statemachineServerWorker.js';
      languageId = 'domainmodelServerWorker';
      startingProgram = `statemachine TrafficLight

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
end

`;
      syntaxHighlighting = {
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

    } else {
      throw new Error('Unrecognized target language to work with: ' + target);
    }

    return (
      <>
      <div style={ {color: 'white', width: '1000px', margin: '8px auto'} }>
        <p>Select a Language</p>
        <select style={ {color: 'black'} } value={this.state.language} onChange={this.handleLanguageChange}>
          <option value='arithmetics'>Arithmetics</option>
          <option value='domainmodel'>Domain Model</option>
          <option value='statemachine'>State Machine</option>
        </select>
      </div>
     <LangiumAnalysisComponent 
      webworkerUri={workerUri} 
      workerName='statemachine' 
      workerType='classic' 
      languageId={languageId} 
      startingProgram={startingProgram} 
      syntaxHighlighting={syntaxHighlighting} />
      </>
    );
  }
}

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <App />
); 