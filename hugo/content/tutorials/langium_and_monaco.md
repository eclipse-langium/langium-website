---
title: "Langium + Monaco Editor"
weight: 6
---

{{< toc format=html >}}

In this tutorial we'll be talking about running Langium in the web with the Monaco editor. If you're not familiar with Monaco, it's the editor that powers VS Code. We're quite fond of it at TypeFox, so we've taken the time to write up this tutorial to explain how to integrate Langium in the web with Monaco, no backend required.

As a disclaimer, just because we are using Monaco in this tutorial does not mean that you cannot use another code editor of your choice. For example, you can use Code Mirror with Langium as well. Generally, if an editor has LSP support, it is very likely you can integrate it quite easily with Langium, since it's LSP compatible.

Without further ado, let's jump into getting your web-based Langium experience setup.

## Getting your Language Setup for the Web

To begin, you're going to need a Langium-based language to work with. We have already written [MiniLogo](https://github.com/langium/langium-minilogo) in Langium as an example for deploying a language in the web. However, if you've been following along with these tutorials, you should be ready to move your own language into a web-based context.

Per usual, we'll be using MiniLogo as the motivating example here.

Once you have a language picked, you're going to want to add a script to your **package.json** to build a web worker for your language. The bundle this script produces will contain the language server for your language.

```json
{
    ...
    "build:worker": "esbuild --minify ./out/language-server/main.js --bundle --format=iife --outfile=./public/minilogo-server-worker.js"
}
```

Now, assuming `esbuild` is installed, if we try to invoke this it *won't succeed as expected*. Instead we'll get a warning back about some dependencies that couldn't be resolved. For example:

> Could not resolve "fs"

This makes sense since we're bundling for the web, and we can't depend on packages that rely on the usual environment with a filesystem. So, we need to update our language to make it compatible in a web-based context.

## Factoring out File System Dependencies

First off, let's create a new entry point for our language server in **src/language-server/main-browser.ts**. This will mirror the regular entry point that we use to build already, but will allow us to target a web-based context instead. In this file, we'll have the following contents:

```ts
import { startLanguageServer, EmptyFileSystem } from 'langium';
import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';
import { createHelloWorldServices } from './hello-world-module';

declare const self: DedicatedWorkerGlobalScope;

/* browser specific setup code */
const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

// Inject the shared services and language-specific services
const { shared } = createHelloWorldServices({ connection, ...EmptyFileSystem });

// Start the language server with the shared services
startLanguageServer(shared);
```

Again, this is based on code that was originally produced by the yeoman generator, thus the **hello world** references.

Most of this is similar to what's in the **main.ts** file. The exceptions are the message readers & writers, and the notion of an `EmptyFileSystem` for the browser. There is a virtual file system API that we could utilize on most modern browsers, but for this tutorial we'll assume we aren't using any file system. Instead we'll have a single source 'file' located in our Monaco editor in memory.

We'll also need to include a library to resolve the missing `DedicatedWorkerGlobalScope`, which is normally not accessible until we update our **tsconfig.json** in our project root. We need to supplement the libs entry with `DOM` and `webworker`. From the yeoman generator example, the `lib` entry usually has just `["ESNext"]`.

```json
{
    "compilerOptions": {
        ...
        "lib": ["ESNext","DOM","webworker"]
    }
}
```

Going back to the script we wrote before in our **package.json**, we're now ready to change **main.js** to **main-browser.js**:

```json
{
    ...
    "build:worker": "esbuild --minify ./out/language-server/main-browser.js --bundle --format=iife --outfile=./public/minilogo-server-worker.js"
}
```

Running `npm run build:worker` again, we should see the bundle is successfully generated without issue. If you're still having problems building the worker, double check that you're not coupled to `fs` or other file system dependent libraries in a related file.

Note that although our generator is still connected to using the file system, it's not relevant for the worker bundle to function.

## Setting up Monaco

Now we're going to setup Monaco, but not with Langium yet, as we want to be sure it's working first.

For convenience, we're going to use two helper libraries from npm that wrap around some of Monaco's core functionality.

- [monaco-editor-wrapper](https://www.npmjs.com/package/monaco-editor-wrapper)
- [monaco-editor-workers](https://www.npmjs.com/package/monaco-editor-workers)

Both these packages should be installed as dependencies for your language. In particular, it's important that you're using version **1.4.0** or later of the monaco-editor-wrapper.

Additionally, we'll want to add `express` as a development dependency (don't forget to also add `@types/express` too), since we'll be using that to run a local web server to test our standalone webpage.

We'll also want to add some more scripts to our package.json to copy over the necessary files from the monaco-editor-wrapper & monaco-editor-worker into the **public** folder. We'll be referencing these library assets to setup the webpage for Langium and Monaco.

```json
{
    ...
    "prepare:public": "npx shx mkdir -p ./public; npx shx cp -fr ./src/static/* ./public/",
    "copy:monaco-editor-wrapper": "npx shx cp -fr ./node_modules/monaco-editor-wrapper/bundle ./public/monaco-editor-wrapper",
    "copy:monaco-workers": "npx shx cp -fr ./node_modules/monaco-editor-workers/dist/ ./public/monaco-editor-workers",
    "build:web": "npm run build && npm run prepare:public && npm run build:worker && npm run copy:monaco-editor-wrapper && npm run copy:monaco-workers"
}
```

The last script is there to provide a convenient way to invoke all the intermediate build steps in sequence. However you'll want to wait before running the `build:web` script, as we still need to add our **static** assets to make that work.

If you went with another editor you would want to make sure that the assets required for that editor will also be copied into **public** folder as part of your output.

## Setting up a Static Page

And now for the actual HTML page itself, plus it's supporting assets. To keep things organized, we're splitting up the JS and CSS. We'll be putting all of these files into a new location from our project root, **src/static/**.

Here's the raw contents of the HTML content stored in **src/static/index.html**. This will serve as a frame for Monaco to be setup within.

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset='utf-8'>
        <!-- Page & Monaco styling -->
        <link href="styles.css" rel="stylesheet"/>
        <title>MiniLogo in Langium</title>
    </head>
    <body>
        <h1>MiniLogo in Langium</h1>
        <div class="wrapper">
            <!-- Monaco Root -->
            <div id="monaco-editor-root"></div>
        </div>
        <br/>
        <footer>
            <br/>
            <p style="font-style:italic">Powered by</p>
            <img width="125" src="https://langium.org/assets/langium_logo_w_nib.svg" alt="Langium">
        </footer>
        <!-- Monaco Configuration -->
        <script type="module" src="setup.js"></script>
    </body>
</html>
```

And here's the associated CSS stored in **src/static/styles.css**. This will style Monaco correctly so it renders as expected.

```css
html,body {
    background: rgb(33,33,33);
    font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
    color: white;
    /* for monaco */
    margin: 8px auto;
    width: 80%;
    height: 80%;
}
h1 {
    text-align: center;
}
#minilogo-canvas {
    display: block;
    margin: 8px auto;
    text-align: center;
}
footer {
    text-align: center;
    color: #444;
    font-size: 1.2rem;
    margin-bottom: 16px;
}
@media(max-width: 1000px) {
    #minilogo-canvas {
        margin-top: 32px;
    }
}
/* for monaco */
.wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
}
#monaco-editor-root {
    flex-grow: 1;
}
```

Finally, there's the actual Javascript setting up our Monaco instance (stored in **src/static/setup.js**), and for setting up Langium as well. This is the most complex part of setting up Langium + Monaco in the web, so we'll walk through the file in parts.

First, we need to import and setup the worker, as well as some language client wrapper configuration.

```js
import { MonacoEditorLanguageClientWrapper } from './monaco-editor-wrapper/index.js';
import { buildWorkerDefinition } from "./monaco-editor-workers/index.js";

buildWorkerDefinition('./monaco-editor-workers/workers', new URL('', window.location.href).href, false);

MonacoEditorLanguageClientWrapper.addMonacoStyles('monaco-editor-styles');
```

Then, we'll want to instantiate our language client wrapper. We'll also need to get a handle for the editor configuration, and set the current language id to `minilogo`. This should match the id of the language that will be recognized by our language server.

```js
const client = new MonacoEditorLanguageClientWrapper();
const editorConfig = client.getEditorConfig();
editorConfig.setMainLanguageId('minilogo');
```

Then, we'll want to add some static syntax highlighting. This part is a bit verbose, but suffice it to say that the single argument passed to `setMonarchTokensProvider` is a JSON object that allows recognizing tokens in MiniLogo and applying styling to those tokens. It represents a Monarch grammar that achieves this express purpose.

```js
editorConfig.setMonarchTokensProvider({
    keywords: [
        'color','def','down','for','move','pen','to','up'
    ],
    operators: [
        '-',',','*','/','+','='
    ],
    symbols:  /-|,|\(|\)|\{|\}|\*|\/|\+|=/,

    tokenizer: {
        initial: [
            { regex: /#(\d|[a-fA-F])+/, action: {"token":"string"} },
            { regex: /[_a-zA-Z][\w_]*/, action: { cases: { '@keywords': {"token":"keyword"}, '@default': {"token":"string"} }} },
            { regex: /-?[0-9]+/, action: {"token":"number"} },
            { include: '@whitespace' },
            { regex: /@symbols/, action: { cases: { '@operators': {"token":"operator"}, '@default': {"token":""} }} },
        ],
        whitespace: [
            { regex: /\s+/, action: {"token":"white"} },
            { regex: /\/\*/, action: {"token":"comment","next":"@comment"} },
            { regex: /\/\/[^\n\r]*/, action: {"token":"comment"} },
        ],
        comment: [
            { regex: /[^\/\*]+/, action: {"token":"comment"} },
            { regex: /\*\//, action: {"token":"comment","next":"@pop"} },
            { regex: /[\/\*]/, action: {"token":"comment"} },
        ],
    }
});
```

We can produce this Monarch grammar by updating our **langium-config.json** to also produce a Monarch file as output. Note that although we're talking about MiniLogo here, we based this example off of the hello-world example produced by the yeoman generator. As such, we still have hello world names here and there, and for this tutorial we'll just use the same name again as for the TextMate grammar.

```json
...
"textMate": {
    "out": "syntaxes/hello-world.tmLanguage.json"
},
"monarch": {
    "out": "syntaxes/hello-world.monarch.ts"
}
```

To generate this file, run `npm run langium:generate`. You can then copy over the definition of the grammar from **syntaxes/hello-world.monarch.ts** (or whatever other name you have given this file) into the `setMonarchTokensProvider` function to setup that highlighting. Keep in mind that this generated monarch grammar is *very* simple. If you want more complex highlighting, we recommend writing your own custom monarch grammar, and storing it somewhere else to prevent it from being overridden. If you're interested, you can find more details about the [Monarch grammar highlighting language here](https://microsoft.github.io/monaco-editor/monarch.html).

Then, we want to setup the code that shows up by default. The following is a fixed MiniLogo program that should display a white diamond in the top left corner of the screen.

```js
editorConfig.setMainCode(`
def test() {
    move(100, 0)
    pen(down)
    move(100, 100)
    move(-100, 100)
    move(-100, -100)
    move(100, -100)
    pen(up)
}
color(white)
test()

`);
```

Lastly, we'll cap off our JS file with some final configurations to setup the theme, configure how we use Langium's language server, and finish setting up the editor.

```js
editorConfig.theme = 'vs-dark';
editorConfig.useLanguageClient = true;
editorConfig.useWebSocket = false;

const workerURL = new URL('./minilogo-server-worker.js', import.meta.url);
console.log(workerURL.href);

const lsWorker = new Worker(workerURL.href, {
    type: 'classic',
    name: 'MiniLogo Language Server'
});
client.setWorker(lsWorker);

// keep a reference to a promise for when the editor is finished starting, we'll use this to setup the canvas on load
const startingPromise = client.startEditor(document.getElementById("monaco-editor-root"));
```

Note the `startingPromise` that's returned from `startEditor`. We're not using this yet, but it will be important for our setup in the next tutorial.

## Serving via Express

Now that we have our files all setup, and our build process prepared, we can put together a mini express application to make viewing our public assets easy. We'll do this by adding **src/web/app.ts** to our project, and giving it the following contents:

```ts
/**
 * Simple app for serving generated examples
 */

import express from 'express';
const app = express();
const port = 3000;
app.use(express.static('./public'));
app.listen(port, () => {
console.log(`Server for MiniLogo assets listening on http://localhost:${port}`);
});
```

And to invoke express, we need to add one more script to our package.json.

```json
{
    ...
    "serve": "node ./out/web/app.js"
}
```

That's it! Now we can build all the assets, and run express to be able to view our demo of Langium in the web from **localhost:3000**.

```bash
npm run build:web
npm run serve
```

You should be greeted with a page that contains a working Monaco instance and a small MiniLogo program in the editor. This editor has the highlighting we would expect, and also is fully connected to the language server for our language. This means we have full LSP support for operations that we would expect to have in a desktop editor.

And that's it, we have successfully implemented Langium + Monaco in the web for our language. It's not doing much at this time besides presenting us with an editor, but in the next tutorial we'll talk about [using the same setup to add generation in the web](/tutorials/generation_in_the_web). Since our generation has already been configured natively in prior tutorials, we can use what we've written to quickly implement a web application that translates MiniLogo programs into drawing instructions for an HTML5 canvas.
