import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

interface EventProps {
  name: string;
  active: boolean;
}

class Event extends React.Component<EventProps> {
  constructor(props: EventProps) {
    super(props);
    this.state = {
      name: props.name,
      isActive: props.active
    }
  }

  setActivate(isItActiveBro: boolean) {
    this.setState({ isActive: isItActiveBro });
  }

  render() {
    return (
      <div>
        {this.props.active ? (
          <div className="text-emeraldLangium border-2 border-solid border-emeraldLangium rounded-md p-4 text-center text-sm shadow-opacity-50 shadow-[0px_0px_15px_0px] shadow-emeraldLangium">
            {this.props.name}
          </div>
        ) : (
          <div className="border-2 text-emeraldLangiumDarker border-solid border-emeraldLangiumDarker rounded-md p-4 text-center text-sm shadow-opacity-50 hover:shadow-[0px_0px_10px_0px] hover:shadow-emeraldLangiumDarker">
            {this.props.name}
          </div>
        )}

      </div>

    );
  }
}

function Preview() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Event name="huen" active={true}></Event>
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