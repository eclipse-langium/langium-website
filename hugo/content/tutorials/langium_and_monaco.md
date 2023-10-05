---
title: "Langium + Monaco Editor"
weight: 6
---

{{< toc format=html >}}

*Updated on Oct. 4th, 2023 for usage with monaco-editor-wrapper 3.1.0 & above, as well as Langium 2.0.2*

In this tutorial we'll be talking about running Langium in the web with the Monaco editor. If you're not familiar with Monaco, it's the editor that powers VS Code. We're quite fond of it at TypeFox, so we've taken the time to write up this tutorial to explain how to integrate Langium in the web with Monaco, no backend required.

Although we're using Monaco in this tutorial, that does not mean that you cannot use another code editor of your choice. For example, you can use Code Mirror with Langium as well. Generally, if an editor has LSP support, it is very likely you can integrate it easily with Langium, since it's LSP compatible.

Without further ado, let's jump into getting your web-based Langium experience setup!

## Technologies You'll Need

- [Langium](https://www.npmjs.com/package/langium) 2.0.2 or greater
- [Monaco Editor Wrapper](https://www.npmjs.com/package/monaco-editor-wrapper) 3.1.0 or greater
- [ESBuild](https://www.npmjs.com/package/esbuild) 0.18.20 or greater

## Getting your Language Setup for the Web

To begin, you're going to need a Langium-based language to work with. We have already written [MiniLogo](https://github.com/langium/langium-minilogo) in Langium as an example for deploying a language in the web. However, if you've been following along with these tutorials so far, you should be ready to move your own language into a web-based context.

Per usual, we'll be using MiniLogo as the motivating example here.

## Factoring out File System Dependencies

In order to build for the browser, we need to create a bundle that is free of any browser-incompatible modules. To do this, let's create a new entry point for our language server in **src/language-server/main-browser.ts**. This will mirror the regular entry point that we use to build already, but will target a browser-based context instead. We'll start with the following content:

```ts
import { startLanguageServer, EmptyFileSystem } from 'langium';
import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser.js';
// your services & module name may differ based on your language's name
import { createMiniLogoServices } from './minilogo-module.js';

declare const self: DedicatedWorkerGlobalScope;

/* browser specific setup code */
const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

// Inject the shared services and language-specific services
const { shared, MiniLogo } = createMiniLogoServices({connection, ...EmptyFileSystem });

// Start the language server with the shared services
startLanguageServer(shared);
```

Again, this is based on code that was originally produced by the yeoman generator, so it should look familiar.

Most of this is in line with what's contained in the **main.ts** file. The exceptions being the message readers & writers, and the notion of an `EmptyFileSystem` for the browser. There is a virtual file system API that we could utilize on most modern browsers, but for this tutorial we'll assume we aren't using any file system. Instead we'll have a single source 'file' located in memory.

We'll also need to include a library to resolve the missing `DedicatedWorkerGlobalScope`, which is normally not accessible until we update our **tsconfig.json** in our project root. We need to supplement the libs entry with `DOM` and `WebWorker`. From the yeoman generator example, the `lib` entry usually has just `["ESNext"]`.

```json
{
    "compilerOptions": {
        ...
        "lib": ["ESNext", "DOM", "WebWorker"]
    }
}
```

Now that we have a new entry point for the browser, we need to add a script to our **package.json** to build a web worker for this language. The bundle this script produces will contain the language server for your language. The following script example is specific to MiniLogo, but should capture the general approach quite nicely:

```json
{
    ...
    "build:worker": "esbuild --minify ./out/language-server/main-browser.js --bundle --format=iife --outfile=./public/minilogo-server-worker.js",
}
```

Assuming `esbuild` is installed, and we've properly factored out any modules that are not suitable for a browser-based context, we should be good to go!

Running `npm run build:worker` we should see the bundle is successfully generated without issue. If you're still having problems building the worker, double check that you're not coupled to `fs` or other file system dependent modules in a related file.

Note that although our generator is still connected to using the file system, it's not relevant for the worker bundle to function.

## Setting up Monaco

Now we're going to setup Monaco, but not with Langium yet, as we want to be sure it's working first before connecting the two.

For convenience, we're going to use the Monaco Editor Wrapper (MER) to wrap around some of Monaco's core functionality, along with the Monaco Editor Workers package to assist. These packages are both maintained by TypeFox, and are designed to make it easier to use Monaco in a web-based context. We'll be using the following versions of these packages:

- [Monaco Editor Wrapper](https://www.npmjs.com/package/monaco-editor-wrapper) version **3.1.0**
- [monaco-editor-workers](https://www.npmjs.com/package/monaco-editor-workers) version **0.39.0**

Both these packages should be installed as dependencies for your language. In particular, this guide will assume that you're using version **2.1.1** or later of the monaco-editor-wrapper package, and version **0.39.0** of the monaco-editor-workers package.

Additionally, we'll want a way to serve this bundled language server. The choice of how you want to go about this is ultimately up to you. Previously we've recommended `express` as a development dependency (don't forget to also add `@types/express` too), as a powerful & lightweight NodeJS server framework. However, we'll be going with the built-in NodeJS support for standing up a web-server; however again the choice is yours here.

We'll also want to add some more scripts to our package.json to copy over the necessary files from the monaco-editor-wrapper & monaco-editor-worker into the **public** folder. We'll be referencing these library assets to setup the webpage for Langium + Monaco.

```json
{
    ...
    "prepare:public": "node scripts/prepare-public.mjs",
    "build:web": "npm run build && npm run prepare:public && npm run build:worker && node scripts/copy-monaco-assets.mjs",
}
```

Both scripts reference *mjs* files that need to be added as well into the scripts folder:

**scripts/prepare-public.mjs**

```js
import * as esbuild from 'esbuild'
import shell from 'shelljs'

// setup & copy over css & html to public
shell.mkdir('-p', './public');
shell.cp('-fr', './src/static/*.css', './public/');
shell.cp('-fr', './src/static/*.html', './public');

// bundle minilogo.ts, and also copy to public
await esbuild.build({
  entryPoints: ['./src/static/minilogo.ts'],
  minify: true,
  sourcemap: true,
  bundle: true,
  outfile: './public/minilogo.js',
});
```

**scripts/copy-monaco-assets.mjs**

```js
import shell from 'shelljs'

// copy workers to public
shell.mkdir('-p', './public/monaco-editor-workers/workers');
shell.cp('-fr', './node_modules/monaco-editor-workers/dist/index.js', './public/monaco-editor-workers/index.js');
shell.cp('-fr', './node_modules/monaco-editor-workers/dist/workers/editorWorker-es.js', './public/monaco-editor-workers/workers/editorWorker-es.js');
shell.cp('-fr', './node_modules/monaco-editor-workers/dist/workers/editorWorker-iife.js', './public/monaco-editor-workers/workers/editorWorker-iife.js');
```

This saves us from writing these extra details into our package json, and focusing on the overall goal each step.

The last script, `build:web` is there to provide a convenient way to invoke all the intermediate build steps in sequence. However you'll want to wait before running the `build:web` script, as we still need to add our **static** assets to make that work; which will come in the next step.

As a quick note, if you went with another editor you would want to make sure that the assets required for that editor will also be copied into **public** folder as part of your output.

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

        <!-- Use a wrapper to display Monaco + Canvas side-by-side -->
        <div id="page-wrapper">
            <!-- Monaco half -->
            <div class="half">
                <div class="wrapper">
                    <div id="monaco-editor-root"></div>
                </div>
            </div>
            <!-- Canvas half -->
            <div class="half">
                <canvas id='minilogo-canvas' width=500 height=600></canvas>
            </div>
        </div>

        <!-- Status message location -->
        <div style="text-align:center">
            <span id="status-msg"></span>
        </div>

        <br/>
        <footer>
            <br/>
            <p style="font-style:italic">Powered by</p>
            <img width="125" src="https://langium.org/assets/langium_logo_w_nib.svg" alt="Langium">
        </footer>
        <!-- Monaco Configuration -->
        <script type="module" src="minilogo.js"></script>
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
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
}
h1 {
    text-align: center;
}
#minilogo-canvas {
    display: block;
    margin: 8px auto;
    text-align: center;
}
#page-wrapper {
    display: flex;
    max-width: 2000px;
    margin: 4px auto;
    padding: 4px;
    min-height: 75vh;
    justify-content: center;
}
#page-wrapper .half {
    display: flex;
    width: 40vw;
}
.build {
    display: block;
    margin: 8px auto;
    width: 300px;
    height: 30px;
    background: none;
    border: 2px #fff solid;
    color: #fff;
    transition: 0.3s;
    font-size: 1.2rem;
    border-radius: 4px;
}
.build:hover {
    border-color: #6cf;
    color: #6cf;
    cursor: pointer;
}
.build:active {
    color: #fff;
    border-color: #fff;
}
footer {
    text-align: center;
    color: #444;
    font-size: 1.2rem;
    margin-bottom: 16px;
}
@media(max-width: 1000px) {
    #page-wrapper {
        display: block;
    }
    #page-wrapper .half {
        display: block;
        width: auto;
    }
    #minilogo-canvas {
        margin-top: 32px;
    }
    #page-wrapper {
        min-height: auto;
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

#status-msg {
    color: red;
}
```

Finally, there's the actual Javascript setting up our Monaco instance (stored in **src/static/minilogo.ts**), and for setting up Langium as well. This is the most complex part of setting up Langium + Monaco in the web, so we'll walk through the file in parts.

(*Update on Oct. 4th, 2023: Previously we wrote this as **src/static/setup.js**. This new file can be considered the same, but reworked into TypeScript & updated for the new versions of Langium & the MER.*)

First, we need to import and setup the worker, as well as some language client wrapper configuration.

```ts
import { MonacoEditorLanguageClientWrapper, UserConfig } from "monaco-editor-wrapper/bundle";
import { buildWorkerDefinition } from "monaco-editor-workers";
import { addMonacoStyles } from 'monaco-editor-wrapper/styles';

/**
 * Prepare to setup the wrapper, building the worker def & setting up styles
 */
function setup() {
    buildWorkerDefinition(
        './monaco-editor-workers/workers',
        new URL('', window.location.href).href,
        false
    );
    addMonacoStyles('monaco-editor-styles');
}
```

Then, we'll want to instantiate our language client wrapper. In previous versions of the `monaco-editor-wrapper` package (before 2.0.0), configuration was performed by manually setting properties on the `MonacoEditorLanguageClientWrapper` instance. However, as of 3.1.0 (at the time of writing this), the constructor for `MonacoEditorLanguageClientWrapper` now takes a configuration object as its first argument. This configuration object allows us to set the same properties as before, but with more fine-grained control over all the properties that are set.

We're going to walk through the parts that will be used to build up this configuration first, and then joining the actual configuration object together afterwards.

To start, let's keep in mind that our current language id will be `minilogo`. This should match the id of the language that will be recognized by our language server.

Then, we'll want to add some static syntax highlighting. To do this we have a couple choices, using a TextMate or a [Monarch grammar](https://microsoft.github.io/monaco-editor/monarch.html). Both will provide us with the ability to parse our language, and apply styling to our tokens. However we have to choose one, we cannot use both simultaneously. This is related to how Monaco itself is configured with regards to whether we're using the VSCode API config, or the classic editor config. This makes sense to a degree, as we can only prepare the editor one way or the other.

For MiniLogo, our monarch grammar will look like so:

```ts
/**
 * Returns a Monarch grammar definition for MiniLogo
 */
function getMonarchGrammar() {
    return {
        keywords: [
            'color','def','down','for','move','pen','to','up'
        ],
        operators: [
            '-',',','*','/','+','='
        ],
        symbols:  /-|,|\(|\)|\{|\}|\*|\/|\+|=/,
    
        tokenizer: {
            initial: [
                { regex: /#(\d|[a-fA-F]){3,6}/, action: {"token":"string"} },
                { regex: /[_a-zA-Z][\w_]*/, action: { cases: { '@keywords': {"token":"keyword"}, '@default': {"token":"string"} }} },
                { regex: /(?:(?:-?[0-9]+)?\.[0-9]+)|-?[0-9]+/, action: {"token":"number"} },
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
    };
}
```

We can produce this Monarch grammar by updating our **langium-config.json** to produce a Monarch file as output. Note that although we're talking about MiniLogo here, we based this example off of the hello-world example produced by the yeoman generator. As such, we still have hello world names here and there, and for this tutorial we'll just use the same name again as for the TextMate grammar.

```json
...
"textMate": {
    "out": "syntaxes/minilogo.tmLanguage.json"
},
"monarch": {
    "out": "syntaxes/minilogo.monarch.ts"
}
```

To generate this file, run `npm run langium:generate`. You can then copy over the definition of the grammar from **syntaxes/hello-world.monarch.ts** (or whatever other name you have given this file). Keep in mind that this generated monarch grammar is *very* simple. If you want more complex highlighting, we recommend writing your own custom monarch grammar, and storing it somewhere else to prevent it from being overridden. If you're interested, you can find more details about the [Monarch grammar highlighting language here](https://microsoft.github.io/monaco-editor/monarch.html).

Then, we want to setup the code that shows up by default. The following is a fixed MiniLogo program that should display a white diamond in the top left corner of the screen.

```ts
/**
 * Retrieves the program code to display, either a default or from local storage
 */
function getMainCode() {
    let mainCode = `
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
    
    `;
    
    // optionally: use local storage to save the code
    // and seek to restore any previous code from our last session
    if (window.localStorage) {
        const storedCode = window.localStorage.getItem('mainCode');
        if (storedCode !== null) {
            mainCode = storedCode;
        }
    }

    return mainCode;
}
```

Since we're planning to use a language server with Monaco, we'll need to setup a language client config too. To do this we'll also need to generate a worker using our language server worker file, but that's fairly straightforward to setup here. Keep in mind that you'll need to have access to the bundle produced from your **main-browser.ts** from before. Here the built result is copied over as **public/minilogo-server-worker.js**.

```ts
/**
 * Creates & returns a fresh worker using the MiniLogo language server
 */
function getWorker() {
    const workerURL = new URL('minilogo-server-worker.js', window.location.href);
    return new Worker(workerURL.href, {
        type: 'module',
        name: 'MiniLogoLS'
    });
}
```

By creating the worker in advance, we give ourselves the ability to directly interact with the worker/LS independent of the wrapper itself, and to even pre-configure it before use. This can be hugely beneficial, especially if we expect to customize our LS on the fly.

Lastly, let's setup the user config, which will be used to startup the wrapper.

```ts
type WorkerUrl = string;

/**
 * Generalized configuration used with 'getMonacoEditorReactConfig' to generate a working configuration for monaco-editor-react
 */
interface ClassicConfig {
    code: string,
    htmlElement: HTMLElement,
    languageId: string,
    worker: WorkerUrl | Worker,
    monarchGrammar: any;
}

/**
 * Generates a UserConfig for a given Langium example, which is then passed to the monaco-editor-react component
 * 
 * @param config A VSCode API or classic editor config to generate a UserConfig from
 * @returns A completed UserConfig
 */
function createUserConfig(config: ClassicConfig): UserConfig {
    // setup urls for config & grammar
    const id = config.languageId;

    // generate langium config
    return {
        htmlElement: config.htmlElement,
        wrapperConfig: {
            editorAppConfig: {
                $type: 'classic',
                languageId: id,
                useDiffEditor: false,
                automaticLayout: true,
                code: config.code,
                theme: 'vs-dark',
                languageDef: config.monarchGrammar
            },
            serviceConfig: {
                enableModelService: true,
                configureConfigurationService: {
                    defaultWorkspaceUri: '/tmp/'
                },
                enableKeybindingsService: true,
                enableLanguagesService: true,
                debugLogging: false
            }
        },
        languageClientConfig: {
            options: {
                $type: 'WorkerDirect',
                worker: config.worker as Worker,
                name: `${id}-language-server-worker`
            }
        }
    };
}
```

This particular UserConfig will be for configuring a classic editor, rather than a VSCode API editor. This is because we're using a Monarch grammar, which is not supported by the VSCode API. However, if we wanted to use a TextMate grammar, we could use the VSCode API type instead.

```json
editorAppConfig: {
    $type: 'vscodeApi',
    languageId: id,
    useDiffEditor: false,
    code: config.code,
    ...
}
```

You would just need to fill in the rest of the details for associating a TextMate grammar & such. [Here's an example from the monaco-components repo](https://github.com/TypeFox/monaco-components/blob/4f301445eca943b9775166704304637cf5e8bd00/packages/examples/src/langium/config/wrapperLangiumVscode.ts#L37).

Regardless of how the user config is setup, we can now invoke that helper function with a handful of configuration details, and have a working UserConfig to pass to the wrapper.

```ts
// create a wrapper instance
const wrapper = new MonacoEditorLanguageClientWrapper();

// start up with a user config
await wrapper.start(createUserConfig({
    htmlElement: document.getElementById("monaco-editor-root")!,
    languageId: 'minilogo',
    code: getMainCode(),
    worker: getWorker(),
    monarchGrammar: getMonarchGrammar()
}));
```

That's it! Now if everything was configured correctly, we should have a valid wrapper that will display the code we want in our browser.

## Serving via NodeJS

Now that we have our files all setup, and our build process prepared, we can put together a mini server application to make viewing our public assets easy. We'll do this by adding **src/web/app.ts** to our project, and giving it the following contents:

```ts
/**
 * Simple server app for serving generated examples locally
 * Based on: https://developer.mozilla.org/en-US/docs/Learn/Server-side/Node_server_without_framework
 */
import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";

const port = 3000;

const MIME_TYPES: Record<string,string> = {
  default: "application/octet-stream",
  html: "text/html; charset=UTF-8",
  js: "application/javascript",
  css: "text/css",
};

const STATIC_PATH = path.join(process.cwd(), "./public");

const toBool = [() => true, () => false];

const prepareFile = async (url: string) => {
  const paths = [STATIC_PATH, url];
  if (url.endsWith("/")) {
    paths.push("index.html");
  }
  const filePath = path.join(...paths);
  const pathTraversal = !filePath.startsWith(STATIC_PATH);
  const exists = await fs.promises.access(filePath).then(...toBool);
  const found = !pathTraversal && exists;
  // there's no 404, just redirect to index.html in all other cases
  const streamPath = found ? filePath : STATIC_PATH + "/index.html";
  const ext = path.extname(streamPath).substring(1).toLowerCase();
  const stream = fs.createReadStream(streamPath);
  return { found, ext, stream };
};

http
  .createServer(async (req, res) => {
    const file = await prepareFile(req.url!);
    const statusCode = file.found ? 200 : 404;
    const mimeType: string = MIME_TYPES[file.ext] || MIME_TYPES.default;
    res.writeHead(statusCode, { "Content-Type": mimeType });
    file.stream.pipe(res);
    console.log(`${req.method} ${req.url} ${statusCode}`);
  })
  .listen(port);

console.log(`Server for MiniLogo assets listening on http://localhost:${port}`);
```

If you would like to compact this, and don't mind adding additional deps to your project, you can include `express` and `@types/express` to your project, and use the following code instead:

```ts
/**
 * Simple express app for serving generated examples
 */

import express from 'express';
const app = express();
const port = 3000;
app.use(express.static('./public'));
app.listen(port, () => {
console.log(`Server for MiniLogo assets listening on http://localhost:${port}`);
});
```

And to invoke the server, we need to add one more script to our package.json.

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

You should be greeted with a page that contains a working Monaco instance and a small MiniLogo program in the editor. This editor has the highlighting we would expect, and also is fully connected to the language server for our language. This means we have full LSP support for operations that we would expect to have in a native IDE, such as VSCode.

And that's it, we have successfully implemented Langium + Monaco in the web for our language. It's not doing much at this time besides presenting us with an editor, but in the next tutorial we'll talk about [using the same setup to add generation in the web](/tutorials/generation_in_the_web). Since our generation has already been configured natively in prior tutorials, we can use what we've written to quickly implement a web application that translates MiniLogo programs into drawing instructions for an HTML5 canvas.
