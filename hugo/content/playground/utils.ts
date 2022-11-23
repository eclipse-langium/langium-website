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
