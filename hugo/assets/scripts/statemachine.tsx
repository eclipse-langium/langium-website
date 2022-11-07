import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

interface StateProps {
  name: string;
  isActive: boolean;
}


interface EventProps {
  name: string;
}

class State extends React.Component<StateProps, StateProps> {
  constructor(props: StateProps) {
    super(props);
    this.state = {
      name: props.name,
      isActive: props.isActive
    }
    this.handleClick = this.handleClick.bind(this);
  }

  setActive(isItActiveBro: boolean) {
    this.setState({ isActive: isItActiveBro });
  }

  handleClick(){
    // !!!REMOVE IN PRODUCTION!!!
    // just to see if it works
    // !!!REMOVE IN PRODUCTION!!!
    this.setActive(!this.state.isActive);
  }

  render() {
    return (
      <div className='cursor-default' onClick={this.handleClick} >
        {this.state.isActive ? (
          <div className="text-emeraldLangium border-2 border-solid border-emeraldLangium rounded-md p-4 text-center text-sm shadow-opacity-50 shadow-[0px_0px_15px_0px] shadow-emeraldLangium">
            {this.props.name}
          </div>
        ) : (
          <div className="border-2 text-emeraldLangiumDarker border-solid border-emeraldLangiumDarker rounded-md p-4 text-center text-sm shadow-opacity-50 hover:shadow-[0px_0px_5px_0px] hover:shadow-emeraldLangiumDarker">
            {this.state.name}
          </div>
        )}

      </div>

    );
  }
}

class Event extends React.Component<EventProps> {
  constructor(props: EventProps) {
    super(props);
    this.state = {
      name: props.name,   
    }
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    // change active state
  }

  render() {
    return (
      <button onClick={this.handleClick} className="text-white border-2 border-solid bg-emeraldLangium rounded-md p-4 text-center text-sm hover:shadow-opacity-50 hover:shadow-[0px_0px_15px_0px] hover:shadow-emeraldLangium">
        {this.props.name}
      </button>
    );
  }
}

function Preview() {
  return (
    <div className="flex flex-col h-full w-full p-4 float-right items-center">
      <p className='text-white text-lg w-full my-4'>Events</p>
      <div className='flex flex-wrap w-full gap-2'>
        <Event name="switchCapacity"></Event>
        <Event name="next"></Event>
      </div>
      <p className='text-white text-lg w-full my-4'>States</p>
      <div className='flex flex-wrap w-full gap-2 justify-start '>
        <State name="PowerOff" isActive={true}></State>
        <State name="RedLight" isActive={false}></State>
        <State name="YellowLight" isActive={false}></State>
        <State name="GreenLight" isActive={false}></State>
      </div>
    </div>
  );
}



function App() {
  return (
    <div className="w-full h-full border border-emeraldLangium justify-center self-center flex">
      <div className="float-left w-1/2 h-full border-r border-white">
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