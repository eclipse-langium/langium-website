import { glob } from "glob";
import { mkdir, readFile } from "node:fs/promises";
import { basename, dirname, resolve, relative } from 'node:path';
import fm from "front-matter";

type Attributes = {
    aliases?: string[];
    url?: string;
    slug?: string;
}

type MarkdownFile = {
    localPath: string;
    aliases: string[];
    links: string[];
}

const projectDir = dirname(__dirname);
const contentDir = resolve(projectDir, "hugo", "content");

async function main() {
    let success = true;
    const markdownFiles: MarkdownFile[] = await readMarkdownFiles();
    //collect what is there
    const setOfUrls = new Set<string>([
        'http://langium.org/',
        "/showcase",
        "/playground"
    ].map(urlToString));
    for (const file of markdownFiles) {
        for (const url of file.aliases) {
            setOfUrls.add(urlToString(url));
        }
    }
    //check what is missing
    for (const file of markdownFiles) {
        let out = false;
        for (const link of file.links) {
            if(link.startsWith("http") || link.endsWith(".png") || link.endsWith(".jpg")) {
                continue;
            }
            const url = urlToString(link);
            if(!setOfUrls.has(url)) {
                if(!out) {
                    console.log(`${relative(contentDir, file.localPath)}:`);
                    out = true;
                }
                console.log(`- MISSING LINK: ${url.toString()}`);
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
        const { attributes: { url, aliases, slug }, body } = fm<Attributes>(content);
        let urls: string[] = [];
        if (aliases) {
            urls = [...urls, ...aliases];
        }
        if (url) {
            urls.push(url);
        } else if (slug) {
            urls.push(relative(contentDir, resolve(mdFile, '..', slug)));
        } else {
            const base = basename(mdFile, '.md');
            if (["index.md", "_index.md", '_index'].includes(base)) {
                urls.push(relative(contentDir, resolve(mdFile, '..')));
            } else {
                urls.push(relative(contentDir, resolve(mdFile, '..', base)));
            }
        }

        //links
        const links = getAllLinks(content);

        //new file
        markdownFiles.push({
            localPath: mdFile,
            aliases: urls,
            links
        });
    }
    return markdownFiles;
}

function getAllLinks(content: string) {
    const regexMdLinks = /\[([^\[]+)\](\(.*?\))/gm
    const matches = content.match(regexMdLinks)
    const singleMatch = /\[([^\[]+)\]\((.*?)\)/;
    const result: string[] = [];
    for (var i = 0; i < matches?.length ?? 0; i++) {
        var text = singleMatch.exec(matches[i])
        result.push(text[2]);
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

main().then(success => process.exit(success ? 0 : 1));