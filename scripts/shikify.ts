import { createHighlighter, bundledLanguages, BundledTheme } from 'shiki';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parse } from 'node-html-parser';
import { LangiumTextMateContent } from '../hugo/content/playground/constants.js';

const mainPath = 'public/docs';
const files = await fs.readdir(mainPath, {
    recursive: true,
    encoding: 'utf-8'
});
const htmlFiles = files.filter(file => file.endsWith('.html'));

const darkTheme: BundledTheme = 'github-dark'
const lightTheme: BundledTheme = 'github-light';

const highlighter = await createHighlighter({
    themes: [darkTheme, lightTheme],
    langs: [LangiumTextMateContent as any, ...Object.keys(bundledLanguages)]
});

for (const file of htmlFiles) {
    // Grab the file, and parse it into a DOM
    const filePath = path.join(mainPath, file);
    console.log(`Processing ${file}`);
    const content = await fs.readFile(filePath, { encoding: "utf-8" });
    const dom = parse(content);

    // This isn't a particularly smart query implementation,
    // so lets take the simple route and just grab all of the pre tags
    const codeBlocks = dom.querySelectorAll("pre")

    for (const codeBlock of codeBlocks) {
        // We need to look for the code inside it
        const codeChild = codeBlock.childNodes[0]
        if (!codeChild || codeBlock.outerHTML.includes('gdoc-mermaid')) continue

        const codeElement = parse(codeChild.toString())

        // Pull out the language from the original code block
        let lang = "text"
        if (codeChild.rawText.startsWith('<code class=language-')) {
            lang = codeChild.rawText.split("language-")[1].split('>')[0]
        }
        

        try {
            const code = codeElement.textContent;
            const highlighted = highlighter.codeToHtml(code, {
                lang: lang || "text",
                themes: {
                    dark: darkTheme,
                    light: lightTheme
                },
                defaultColor: false
            })

            const newPreElement = parse(highlighted)
            codeBlock.replaceWith(newPreElement)
        } catch (e) {
            console.error('Failed to highlight code block with language:' + lang);
        }
    }

    // Write the new HTML
    const newContent = dom.toString();
    await fs.writeFile(filePath, newContent)
}
