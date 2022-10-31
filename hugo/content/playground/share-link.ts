import { compressToEncodedURIComponent } from "lz-string";

export function registerShareLink(callback: () => {
    grammar: string,
    content: string
}): void {
    const copyText = "Copy URL to clipboard";
    getTooltip().textContent = copyText;
    const shareLink = document.getElementById("share-link");
    shareLink?.addEventListener('click', () => {
        const { grammar, content } = callback();
        copyToClipboard(grammar, content);
    });
    shareLink?.addEventListener('mouseleave', () => {
        getTooltip().textContent = copyText;
    });
}

async function copyToClipboard(grammar: string, content: string): Promise<void> {
    const compressedGrammar = compressToEncodedURIComponent(grammar);
    const compressedContent = compressToEncodedURIComponent(content);
    const url = new URL('/playground', window.origin);
    url.searchParams.append('grammar', compressedGrammar);
    url.searchParams.append('content', compressedContent);
    await navigator.clipboard.writeText(url.toString());
    getTooltip().textContent = "Copied URL to clipboard!";
  }
  
function getTooltip(): HTMLElement {
    return document.getElementById('share-tooltip')!;
}
