import { compressToEncodedURIComponent } from "lz-string";

export function registerShareLink(callback: () => {
    grammar: string,
    content: string
}): void {
    const shareLink = document.getElementById("share-link");
    shareLink?.addEventListener('click', () => {
        const { grammar, content } = callback();
        copyToClipboard(grammar, content);
    });
    shareLink?.addEventListener('mouseleave', () => {
        getTooltip().textContent = "Copy to clipboard";
    });
}

async function copyToClipboard(grammar: string, content: string): Promise<void> {
    const compressedGrammar = compressToEncodedURIComponent(grammar);
    const compressedContent = compressToEncodedURIComponent(content);
    const url = new URL('/playground', window.origin);
    url.searchParams.append('grammar', compressedGrammar);
    url.searchParams.append('content', compressedContent);
    await navigator.clipboard.writeText(url.toString());
    getTooltip().textContent = "Copied to clipboard!";
  }
  
function getTooltip(): HTMLElement {
    return document.getElementById('share-tooltip')!;
}
