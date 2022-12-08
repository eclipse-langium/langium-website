import { MonacoEditorReactComp, monaco } from '@typefox/monaco-editor-react/bundle';
import React from 'react';
import { createRoot } from 'react-dom/client';

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
    this.onTextChanged = this.onTextChanged.bind(this);
    this.monacoEditor = React.createRef();
    this.preview = React.createRef();
    this.state = {
      hasError: false
    };
  }

  onTextChanged(text: string, isDirty: boolean) {
    this.preview.current?.startPreview(isDirty);
    // yes, its possible to execute commands
    // this.monacoEditor.current?.executeCommand("editor.exampleCommand");
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
            <MonacoEditorReactComp ref={this.monacoEditor} onTextChanged={this.onTextChanged} webworkerUri="../showcase/libs/worker/statemachineServerWorker.js" workerName='LS' workerType='classic' languageId="statemachine" text={`// Create your own statemachine here!
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