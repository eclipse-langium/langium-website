import { glob } from "glob";
import { readFile } from "node:fs/promises";
import { basename, dirname, resolve, relative, join } from 'node:path';
import chalk from 'chalk';
import fm from "front-matter";

type Attributes = {
    aliases?: string[];
    url?: string;
    slug?: string;
}

type MarkdownFile = {
    localPath: string;
    documentLink: string;
    aliases: string[];
    links: string[];
}

type LinkType = 'alias'|'document';

const projectDir = dirname(__dirname);
const contentDir = resolve(projectDir, "hugo", "content");

async function main() {
    const markdownFiles = await readMarkdownFiles();
    const setOfUrls = classifyAsDocumentLinksOrAliases(markdownFiles);
    //await writeFile("existingLinks.txt", JSON.stringify([...setOfUrls.entries()], null, 2));
    const success = printMissingLinks(markdownFiles, setOfUrls);
    if(success) {
        console.log(chalk.greenBright('Success!'));
        process.exit(0);
    } else {
        console.log(chalk.redBright('Failed!'));
        process.exit(1);
    }
}

function classifyAsDocumentLinksOrAliases(markdownFiles: MarkdownFile[]) {
    const documentLinks = [
        ...markdownFiles.map(m => m.documentLink),
        'http://langium.org/',
        "/showcase",
        "/playground"
    ].map(urlToString).map(s => [s, 'document'] as const);
    const aliases = markdownFiles.flatMap(m => m.aliases).map(urlToString).map(s => [s, 'alias'] as const);
    return new Map<string, LinkType>([...documentLinks, ...aliases]);
}

function printMissingLinks(markdownFiles: MarkdownFile[], setOfUrls: Map<string, LinkType>) {
    let success: boolean = true;
    for (const file of markdownFiles) {
        let out = false;
        for (const link of file.links) {
            if (link.startsWith("http") || link.endsWith(".png") || link.endsWith(".jpg")) {
                continue;
            }
            const url = urlToString(link);
            if (!setOfUrls.has(url)) {
                if (!out) {
                    console.log(`${relative(contentDir, file.localPath)}:`);
                    out = true;
                }
                console.log(`- ${chalk.red("MISSING LINK")}: ${url.toString()}`);
                success = false;
            } else if(setOfUrls.get(url) === 'alias') {
                if (!out) {
                    console.log(`${relative(contentDir, file.localPath)}:`);
                    out = true;
                }
                console.log(`- ${chalk.yellow("LINK TO ALIAS")}: ${url.toString()}`);
                success = false;
            }
        }
    }
    return success;
}

async function readMarkdownFiles() {
    const markdownFiles: MarkdownFile[] = [];
    const mdfiles = await glob(`${contentDir}/**/*.md`);
    for (const mdFile of mdfiles) {
        const content = await readFile(mdFile, 'utf-8');

        //urls
        const { attributes: { url, aliases, slug } } = fm<Attributes>(content);
        let urls: string[] = [];
        if (aliases) {
            urls = [...urls, ...aliases];
        }
        let documentLink: string = '';
        let folder = '';
        if (url) {
            documentLink = url;
            folder = dirname(documentLink);
        } else if (slug) {
            documentLink = relative(contentDir, join(mdFile, '..', slug));
            folder = dirname(documentLink);
        } else {
            const base = basename(mdFile, '.md');
            if (['index', '_index'].includes(base)) {
                documentLink = relative(contentDir, join(mdFile, '..'));
                folder = documentLink;
            } else {
                documentLink = relative(contentDir, join(mdFile, '..', base));
                folder = dirname(documentLink);
            }
        }

        //links
        const links = getAllLinks(folder, content);

        //new file
        markdownFiles.push({
            localPath: mdFile,
            documentLink,
            aliases: urls,
            links
        });
    }
    return markdownFiles;
}

function getAllLinks(folder: string, content: string) {
    const regexMdLinks = /\[([^\[]+)\](\(.*?\))/gm
    const matches = content.match(regexMdLinks)
    const singleMatch = /\[([^\[]+)\]\((.*?)\)/;
    const result: string[] = [];
    for (var i = 0; i < matches?.length ?? 0; i++) {
        var text = singleMatch.exec(matches[i])
        const link = text[2];
        if(link.startsWith("http") || link.startsWith("/")) {
            result.push(link);
        } else if(link.startsWith("#")) {
        } else {
            result.push(join(folder, link));
        }
    }
    return result;
}

function urlToString(link: string): string {
    const url = new URL(link, 'http://langium.org');
    url.hash = "";
    if(url.pathname.endsWith("/")) {
        url.pathname = url.pathname.substring(0, url.pathname.length-1)
    }
    return url.toString();
}

main();
