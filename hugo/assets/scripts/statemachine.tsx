import React from 'react';
import { createRoot } from 'react-dom/client';
import Editor, { useMonaco } from "@monaco-editor/react";
import { buildWorkerDefinition } from "monaco-editor-workers";
import { MonacoEditorLanguageClientWrapper } from 'monaco-editor-wrapper';

function Preview() {
  return (
    <div className="flex h-full w-full items-center justify-center">
     <div className="text-white border-2 border-solid border-emeraldLangium rounded-md p-4 text-center text-sm shadow-opacity-50 hover:shadow-[0px_0px_25px_0px] hover:shadow-emeraldLangiumDarkest">
      Preview not available
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