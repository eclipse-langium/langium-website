'use client';

import { useEffect, useRef } from 'react';

interface MermaidProps {
  chart: string;
}

export function Mermaid({ chart }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    import('mermaid').then((m) => {
      m.default.initialize({ startOnLoad: false, theme: 'dark' });
      ref.current!.innerHTML = chart;
      ref.current!.removeAttribute('data-processed');
      m.default.run({ nodes: [ref.current!] });
    });
  }, [chart]);

  return <div ref={ref} className="mermaid my-6 flex justify-center">{chart}</div>;
}
