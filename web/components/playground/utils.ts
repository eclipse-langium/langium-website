/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { compressToEncodedURIComponent } from 'lz-string';

export async function share(grammar: string, content: string): Promise<void> {
  const compressedGrammar = compressToEncodedURIComponent(grammar);
  const compressedContent = compressToEncodedURIComponent(content);
  const url = new URL('/playground', window.origin);
  url.searchParams.append('grammar', compressedGrammar);
  url.searchParams.append('content', compressedContent);
  await navigator.clipboard.writeText(url.toString());
}

/**
 * Map of actions that are throttled, with the key being the unique id
 */
const throttleMap = new Map<number, ReturnType<typeof setTimeout>>();

/**
 * Throttles an action with a fixed delay, subsequent attempts reset the delay.
 */
export function throttle(id: number, delay: number, action: () => void): void {
  if (throttleMap.has(id)) {
    clearTimeout(throttleMap.get(id)!);
  }
  throttleMap.set(id, setTimeout(() => {
    action();
    throttleMap.delete(id);
  }, delay));
}
