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

/**
 * Map of actions that are throttled, with the key being the unique id
 * Used to clear them out if a subsequent action is dispatched
 */
const throttleMap = new Map<number, NodeJS.Timeout>();

/**
 * Throttles an action with a fixed delay, such that subsequent attempts to dispatch
 * the same action clear out the previous action, and reset the delay.
 * 
 * @param id Unique id to associate with this action
 * @param delay In milliseconds to delay the action
 * @param action Action to perform (function to invoke)
 */
export function throttle<T>(id: number, delay: number, action: () => void): void {
  // clear out any previous action
  if (throttleMap.has(id)) {
    clearTimeout(throttleMap.get(id)!);
  }

  // set a new timeout to perform the action
  throttleMap.set(id, setTimeout(() => {
      action();
      throttleMap.delete(id);
    }, delay)
  );
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
