import React from 'react';
import { createRoot } from 'react-dom/client';

function Preview() {
  return (
    <div className="placeholder-wrapper">
     <div className='placeholder'>
      Preview not available
     </div>
    </div>
  );
}

const root = createRoot(document.getElementById("preview") as HTMLElement);
root.render(
  <React.StrictMode>
    <Preview />
  </React.StrictMode>
);