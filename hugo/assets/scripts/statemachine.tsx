import React from 'react';
import { createRoot } from 'react-dom/client';

function Preview() {
  return (
    <div className="flex h-full w-full items-center justify-center">
     <div className="text-white border-2 border-solid border-emeraldLangium rounded-md p-4 w-1/4 text-center text-sm shadow-opacity-50 hover:shadow-[0px_0px_25px_0px] hover:shadow-emeraldLangiumDarkest">
      Preview not available
     </div>
    </div>
  );
}

const root = createRoot(document.getElementById("preview") as HTMLElement);
root.render(
    <Preview />
); 