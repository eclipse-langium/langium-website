'use client';

import { useState, type ReactNode, type ReactElement } from 'react';

interface TabProps {
  label: string;
  children: ReactNode;
}

export function Tab({ children }: TabProps) {
  return <div>{children}</div>;
}

interface TabsProps {
  children: ReactElement<TabProps> | ReactElement<TabProps>[];
}

export function Tabs({ children }: TabsProps) {
  const tabs = Array.isArray(children) ? children : [children];
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="my-4">
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab, i) => (
          <button
            key={i}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              i === activeIndex
                ? 'border-b-2 border-emerald-langium text-emerald-langium'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            onClick={() => setActiveIndex(i)}
          >
            {tab.props.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{tabs[activeIndex]}</div>
    </div>
  );
}
