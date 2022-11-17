import React, { createRef, HtmlHTMLAttributes, Ref, RefObject } from 'react';
import ReactDOM from 'react-dom';
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


function Preview() {
  let states: State[] = [];
  let events: Event[] = [];

  const changeStates = function (e) {
    let nextState = dummyData.states.find(({ name }) => name === currentState)![e];
    if (nextState) {
      states.forEach(state => {
        state.setActive(state.props.name == nextState);
      });
      currentState = nextState;
    }
    events.forEach(event => {
      event.setEnabled(!dummyData.states.find(({ name }) => name === currentState)![event.props.name]);
    });
  }

  return (
    <div className="flex flex-col h-full w-full p-4 float-right items-center">
      <p className='text-white text-lg w-full my-4'>Events</p>
      <div className='flex flex-wrap w-full gap-2'>
        {dummyData.events.map((event, index) => {
          return <Event isEnabled={!dummyData.states.find(({ name }) => name === currentState)![event]} handleClick={() => changeStates(event)} name={event} key={index} ref={event => { events.push(event!) }}></Event>
        })}
      </div>
      <p className='text-white text-lg w-full my-4'>States</p>
      <div className='flex flex-wrap w-full gap-2 justify-start '>
        {dummyData.states.map((state, index) => {
          return <State name={state.name} key={index} isActive={currentState == state.name} ref={state => { states.push(state!) }}></State>
        })}
      </div>
    </div>
  );
}



function App() {
  currentState = dummyData.initialState;
  return (
    <div className="w-full h-full border border-emeraldLangium justify-center self-center flex">
      <div className="float-left w-1/2 h-full border-r border-emeraldLangium">
        <div className="wrapper relative bg-white dark:bg-gray-900">
          <div className="dark:bg-gray-900" id="monaco-editor-root">
          </div>
        </div>
      </div>
      <div className="float-right w-1/2 h-full" id="preview">
        <Preview />
      </div>
    </div>
  )
}


const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <App />
); 