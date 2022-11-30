/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { compressToEncodedURIComponent } from "lz-string";

export async function share(grammar: string, content: string): Promise<void> {
  const compressedGrammar = compressToEncodedURIComponent(grammar);
  const compressedContent = compressToEncodedURIComponent(content);
  const url = new URL("/playground", window.origin);
  url.searchParams.append("grammar", compressedGrammar);
  url.searchParams.append("content", compressedContent);
  await navigator.clipboard.writeText(url.toString());
}

export function throttle<T>(milliseconds: number, action: (input: T) => void) {
  let timeout: NodeJS.Timeout | undefined = undefined;

  function clear() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
  }

  return {
    clear,
    call: (input: T) => {
      clear();
      timeout = setTimeout(() => {
        action(input);
      }, milliseconds);
    },
  };
}

export function overlay(visible: boolean, hasError: boolean) {
  const element = document.getElementById('overlay')!;
  if(!visible) {
    element.style.display = 'none';
  } else {
    const subTitle = element.getElementsByClassName('hint')![0] as HTMLDivElement;
    subTitle.innerText = hasError ? 'Your grammar contains errors.' : 'Loading...';
    element.style.display = 'block';
  }
}
