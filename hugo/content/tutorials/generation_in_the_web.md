---
title: "Generation in the Web"
weight: 7
---

{{< toc format=html >}}

In this tutorial we'll be talking about how to perform generation in the web by executing a custom LSP command. There are multiple ways to hook into Langium to utilize the generator, such as by directly exporting the generator API. However by using the LSP as is, we can save ourselves the effort of doing additional work. By using an LSP command, we can quickly and easily integrate new functionality into our existing Langium + Monaco integration.

We'll assume that you've already looked over most of the other tutorials at this point. It is particularly important that you have a language with working generation, and have a working instance of Langium + Monaco for your language (or another editor of your choice). In the case that you don't have a language to work with, you can follow along with [MiniLogo](https://github.com/langium/langium-minilogo), which is the example language used throughout these tutorials.

Since we're working with MiniLogo, we already know that our generated output is in the form of drawing instructions that transform some drawing context. The generated output that we've implemented so far consists of a JSON array of commands, making it very easy to interpret. Now that we're working in a web-based context, this approach lends itself naturally towards manipulating an HTML5 canvas.

The parts that we still need to setup are:

- exposing the generator via a custom LSP command
- invoking this custom command and getting the result
- adding a way to translate the generated result into drawing on an HTML5 canvas.

## Overview of LSP Commands

Based on the work done in previous tutorials, we already have set up a working generator with MinLogo. If you haven't already set this up you can go back to the [tutorial on generation](/tutorials/generation) and give it a look over. Continuing off of the code written in that tutorial, we want to factor out our existing generator (removing any non-web compatible dependencies, like 'fs'), and invoke it via a custom LSP command handler.

If you're not familiar with the LSP (or custom commands), that's perfectly fine. The LSP is just a protocol that defines how our client & server communicate with each other, and this works even when they're both in the same application. In our case, the server will be Langium, and the client will be Monaco. This protocol also defines a way to [describe commands](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#command), and to [execute those custom commands from the client](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#workspace_executeCommand). So, we'll be having Monaco execute a custom command, Langium handling that command, and then getting the results returned to Monaco.

Lastly, Langium itself provides an easy way to register custom handlers for these commands. Handlers are registered for commands by name, and are invoked when that command is received. There are a number of reasons why this is a powerful approach:

- Clients can send commands without any knowledge of Langium's internals
- Langium can handle commands without any knowledge of the client sending them
- Commands can be executed server-side with *full access* to Langium's capabilities

This effectively allows Langium to integrate with just about any application that is capable of working with the LSP (and sending custom commands). It also does this without requiring any tight dependencies on Langium itself, keeping your existing application logic separate from your Langium logic.

## Adding a Generator Endpoint for the Web

We'll start by adding a new file **src/web/index.ts** that will act as the generator endpoint for the web. This directory was created in the previous tutorial about running Langium + Monaco in the web, and should already contain an express `app.ts` configuration.

Our new file will contain a single exported function as our entry point, which will be used by our command handler. For MiniLogo we'll call this function `parseAndGenerate`. Much like the name suggests, this function takes a concrete MiniLogo program, parses it, and then generates output from the corresponding AST. This will share some logic that was used with the CLI before, so the code should be familiar if you've read the tutorial on [customizing the CLI](/tutorials/customizing_cli).

For our `parseAndGenerate` function to work, we will have to make a slight change to the way that we extract an AST node from our document. Previously, we referenced a file on disk to read from. In this context we have no such file, instead our program is a string stored in memory. So, we'll need to create an in-memory document. Once we have this document, the rest of our process is the same. We can write this supporting function for creating in-memory documents like so:

```ts
import { AstNode, LangiumServices } from "langium";
import { URI } from "vscode-uri";

/**
 * Extracts an AST node from a virtual document, represented as a string
 * @param content Content to create virtual document from
 * @param services For constructing & building a virtual document
 * @returns A promise for the parsed result of the document
 */
 async function extractAstNodeFromString<T extends AstNode>(content: string, services: LangiumServices): Promise<T> {
    // create a document from a string instead of a file
    const doc = services.shared.workspace.LangiumDocumentFactory.fromString(content, URI.parse('memory://minilogo.document'));
    // proceed with build & validation
    await services.shared.workspace.DocumentBuilder.build([doc], { validationChecks: 'all' });
    // get the parse result (root of our AST)
    return doc.parseResult?.value as T;
}
```

Once we have this function in place, we can create our `parseAndGenerate` function in the same file.

```ts
import { EmptyFileSystem } from "langium";
import { createHelloWorldServices } from '../language-server/hello-world-module';
import { Model } from "../language-server/generated/ast";
import { generateCommands } from '../generator/generator';

/**
 * Parses a MiniLogo program & generates output as a list of Objects
 * @param miniLogoProgram MiniLogo program to parse
 * @returns Generated output from this MiniLogo program
 */
export async function parseAndGenerate (miniLogoProgram: string): Promise<Object[]> {
    const services = createHelloWorldServices(EmptyFileSystem).HelloWorld;
    const model = await extractAstNodeFromString<Model>(miniLogoProgram, services);
    // generate mini logo drawing commands from the model
    const cmds = generateCommands(model);
    return Promise.resolve(cmds);
}
```

Ah, but we don't yet have a `generator` folder to import from! So let's make that real quick as part of our next step.

## Factoring out the Generator

While factoring out into a separate `generator` folder, it's important to make sure that the code that your generator depends on is not tightly coupled with any file system related functionality -- or anything else that is not compatible with running in the browser. As an example, the yeoman generator example produces a generator that is connected with the CLI, which uses the file system. Thankfully, the implementation is quite simple, and it's not too difficult to decouple the generator from the CLI.

First, create a new folder, **src/generator/** . Then, move **src/cli/generator.ts** into **src/generator/generator.ts**. Be sure to update imports in your generator, as well as anything in the CLI that references this.

Alright, now we need to decouple the file system related functionality from the generator. To do this, we're going to take our `generateCommands` function, and compress it down to this:

```ts
/**
 * Generates simple drawing commands from a MiniLogo Model
 * @param model Model to generate commmands from
 * @returns Generated commands that captures the program's drawing intent
 */
export function generateCommands(model: Model): Object[] {
    return generateStatements(model.stmts);
}
```

Notice how we dropped all the other parameters, as well as any other logic *besides* the actual generation itself. This is what we want, a simple generator interface that does exactly what it says, and nothing else. However, this completely breaks the existing CLI function `generateAction` (located in **src/cli/index.ts**) that we wrote before, so we need to correct it as well. This involves moving up some of the file system logic into this function instead.

```ts
import { extractDestinationAndName } from './cli-util';
import path from 'path';
import fs from 'fs';

export const generateAction = async (fileName: string, opts: GenerateOptions): Promise<void> => {
    const services = createHelloWorldServices(NodeFileSystem).HelloWorld;
    const model = await extractAstNode<Model>(fileName, services);

    // invoke generator to get commands
    const cmds = generateCommands(model);

    // handle file related functionality here now
    const data = extractDestinationAndName(fileName, opts.destination);
    const generatedFilePath = `${path.join(data.destination, data.name)}.json`;
    if (!fs.existsSync(data.destination)) {
        fs.mkdirSync(data.destination, { recursive: true });
    }
    fs.writeFileSync(generatedFilePath, JSON.stringify(cmds, undefined, 2));

    console.log(chalk.green(`MiniLogo commands generated successfully: ${generatedFilePath}`));
};
```

Now the generator is cleanly separated from our CLI, and thus from our file system dependencies. At this point we're ready to write up a custom command handler, and invoke our generator API through it.

## Adding a Custom LSP Command Handler to Langium

To add a custom command handler, start by modifying the existing module file for our language. For MiniLogo, this is located in **src/language-server/minilogo-module.ts**. In this file we can add our custom command handler as a special class:

```typescript
import { AbstractExecuteCommandHandler, ExecuteCommandAcceptor } from 'langium';

...

class MiniLogoCommandHandler extends AbstractExecuteCommandHandler {
    registerCommands(acceptor: ExecuteCommandAcceptor): void {
        // accept a single command called 'parseAndGenerate'
        acceptor('parseAndGenerate', args => {
            // invoke generator on this data, and return the response
            return parseAndGenerate(args[0]);
        });
    }
}
```

We only need the one function `registerCommands`, which allows us to accept an arbitrary number of custom commands by name. For this example, we're going to accept a command called `parseAndGenerate`, which matches the name of our generator endpoint. Once we've accepted a command matching this name, we receive an array of arguments, and invoke the generator on the first entry. This isn't well typed in this case (just an array of `any`), but we have advance knowledge that we'll be receiving a single string as an argument -- which corresponds to the concrete text of a MiniLogo program.

To register this custom command handler, we also need to update the `createMiniLogoServices` function in the same file. Specifically we need to register this new command handler as our `ExecuteCommandHandler` for the shared LSP services this language provides.

```typescript
shared.lsp.ExecuteCommandHandler = new MiniLogoCommandHandler();
```

For some context, this should follow the creation of the standard services.

```typescript
export function createMiniLogoServices(context: DefaultSharedModuleContext): {
    shared: LangiumSharedServices,
    MiniLogo: MiniLogoServices
} {
    const shared = inject(
        createDefaultSharedModule(context),
        MiniLogoGeneratedSharedModule
    );
    const MiniLogo = inject(
        createDefaultModule({ shared }),
        MiniLogoGeneratedModule,
        MiniLogoModule
    );
    // add our custom command handler to our 'shared' services
    shared.lsp.ExecuteCommandHandler = new MiniLogoCommandHandler();
    shared.ServiceRegistry.register(MiniLogo);
    return { shared, MiniLogo };
}
```

And now our implementation features a custom command handler that takes a MiniLogo program, and returns a generated result from that program's AST. To get these changes into the language server itself, you'll want to rebuild & bundle everything once more. If you recall the command from the last tutorial, we can do this via `build:web`.

```bash
npm run build:web
```

## Importing the Generator

Now, if you've been following along with our prior tutorials, you should have a **src/static/** folder already setup with an HTML and JS file, plus an updated language server bundle. We can now go into the HTML file, and make a couple changes to our HTML file to get things ready to work with our new changes.

- add a canvas
- add a button to trigger updating the canvas

You should also replace the previous HTML & CSS files with the following contents. The HTML updates add Monaco, a Canvas, and a build button. The CSS styles these new additions so that they're properly aligned.

{{< tabs "new-html-css" >}}
{{< tab "HTML" >}}

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

        <!-- Add a button to update our canvas, will invoke a globally accessible function -->
        <div>
            <input class="build" type="button" value="Update Canvas" onclick="window.generateAndDisplay()">
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

{{< /tab >}}
{{< tab "CSS" >}}
We need to update our **styles.css** file as well to allow a side-by-side view of Monaco and our canvas. You can replace your previous CSS content with these new contents to achieve that effect.

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
    min-height: 80vh;
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
```

{{< /tab >}}
{{< /tabs >}}

At this point, running `npm run build:web && npm run serve` should show Monaco on the left, an empty space on the right (this is the canvas), along with an "Update Canvas" button at the bottom. If you see this, then you can trust that the layout was updated correctly.

We'll also want to go into **setup.js** file, and add a small modification to the end. This change will create a global function on the window, giving us a callback that lets us execute our command to parse and generate data from the current program in Monaco. It's important that this goes into the same file as your Monaco setup code, as it directly interacts with the Monaco language client instance.

```js
// modify your previous import to bring in the appropriate monaco-vscode-api version
import { vscode } from './monaco-editor-wrapper/index.js';

...

const generateAndDisplay = (async () => {
    console.info('generating & running current code...');
    const value = client.editor.getValue();
    // parse & generate commands for drawing an image
    // execute custom LSP command, and receive the response
    const minilogoCmds = await vscode.commands.executeCommand('parseAndGenerate', value);
    updateMiniLogoCanvas(minilogoCmds);
});

// Updates the mini-logo canvas
window.generateAndDisplay = generateAndDisplay;

// Takes generated MiniLogo commands, and draws on an HTML5 canvas
function updateMiniLogoCanvas(cmds) {
    // print the commands out, so we can verify what we have received.
    // TODO, will change in th next section...
    alert(JSON.stringify(cmds));
}
```

Running the build & serve workflow again, you should be able to now click "Update Canvas" and view an alert containing your generated commands corresponding with the current MiniLogo program in Monaco. Feel free to use the **examples/langium.logo** or **examples/test.logo** to try this out.

## Interpreting Draw Commands

If you've gotten to this point then you're on the final stretch! The last part we need to implement is the actual logic that takes our drawing commands and updates the canvas. This logic will replace the existing contents of the `updateMiniLogoCanvas` function, and we'll walk through each step here.

First, let's get a handle on our canvas, as well as the associated 2D context.

```js
const canvas = document.getElementById('minilogo-canvas');
const context = canvas.getContext('2d');
```

We'll also want to clean up the context, in case we already drew something there before. This will be relevant when we're updating the canvas multiple times with a new program.

```js
context.clearRect(0, 0, canvas.width, canvas.height);
```

Next, we want to setup a background grid to display. It's not essential for drawing, but it looks nicer than an empty canvas.

```js
context.beginPath();
context.strokeStyle = '#333';
for (let x = 0; x <= canvas.width; x+=(canvas.width / 10)) {
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
}
for (let y = 0; y <= canvas.height; y+=(canvas.height / 10)) {
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
}
context.stroke();
```

After drawing a grid, let's reset the stroke to a white color.

```js
context.strokeStyle = 'white';
```

Let's also setup some initial drawing state. This will be used to keep track of the pen state, and where we are on the canvas.

```js
// maintain some state about our drawing context
let drawing = false;
let posX = 0;
let posY = 0;
```

And let's begin evaluating each of our commands. To do this, we'll setup an interval that repeatedly shifts the top element from our list of commands, evaluates it, and repeats. Once we're out of commands to evaluate, we'll clear the interval. Feel free to adjust the delay (or remove it entirely) in your version.

```js
// use the command list to execute each command with a small delay
const id = setInterval(() => {
    if (cmds.length > 0) {
        // evaluate the next command in the current env/context
        evalCmd(cmds.shift(), context);
    } else {
        // finish existing draw
        if (drawing) {
            context.stroke();
        }
        clearInterval(id);
    }
}, 1);
```

The evaluate command itself only needs to handle 4 cases:

- penUp
- penDown
- move
- color

Knowing this, and the details about what properties each command type can have, we can evaluate each command and update our context. This can be done with a switch and a case for each command type.

*Be sure to add this function inside the `updateMiniLogoCanvas` function, otherwise it will not have access to the necessary state!*

```js
// evaluate a single command in the current context
function evalCmd(cmd, context) {
    if (cmd.cmd) {
        switch (cmd.cmd) {
            // pen is lifted off the canvas
            case 'penUp':
                drawing = false;
                context.stroke();
                break;

            // pen is put down onto the canvas
            case 'penDown':
                drawing = true;
                context.beginPath();
                context.moveTo(posX, posY);
                break;

            // move across the canvas
            // will draw only if the pen is 'down'
            case 'move':
                const x = cmd.x;
                const y = cmd.y;
                posX += x;
                posY += y;
                if (!drawing) {
                    // move, no draw
                    context.moveTo(posX, posY);
                } else {
                    // move & draw
                    context.lineTo(posX, posY);
                }
                break;

            // set the color of the stroke
            case 'color':
                if (cmd.color) {
                    // literal color or hex
                    context.strokeStyle = cmd.color;
                } else {
                    // literal r,g,b components
                    context.strokeStyle = `rgb(${cmd.r},${cmd.g},${cmd.b})`;
                }
                break;

        }
    }
}
```

Lastly, we want to view the page with some output on the canvas when our editor is finished starting, rather than an empty half of the screen to start. We can address this by setting the `generateAndDisplay` function to be called once the editor is finished loading. We can place this anywhere after our `startingPromise` has been created.

```js
startingPromise.then(() => {
    generateAndDisplay();
});
```

That's it, we're all done writing up our JS file. We should now be able to run the following (assuming the generator script is also executed by `build:web`), and get our results in `localhost:3000`.

```bash
npm run build:web
npm run serve
```

If all went well, you should see a white diamond sketched out on the canvas when the page loads. If not, double check that you set the `mainCode` that will display in your application on loading in. If you didn't, you can add it like so:

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

Once you have something drawing on the screen, you're all set, congratulations! You've just successfully written your own Langium-based language, deployed it in the web, and hooked up generation to boot. In fact, you've done *quite* a lot if you've gone through all of these tutorials so far.

- writing your own grammar
- implementing custom validation
- customizing your CLI
- adding generation
- configuring code bundling
- building an extension
- setting up Langium + Monaco in the web
- adding a custom LSP command & handler
- using an LSP command to drive generation & draw images

And the concepts that we've gone over from the beginning to now are not just for MiniLogo of course, they can be easily generalized to work for your own language as well. As you've been going through these tutorials, we hope that you've been thinking about how you could have done things *differently* too. Whether a simple improvement, or another approach, we believe it's this creative kind of thinking that takes an idea of a language and really allows it to grow into something great.

One easy point to make is how the example code shown in these tutorials is designed to designed to be easy to demonstrate. However, it can improved with better error checking, better logic, generator optimizations, etc.

It is also easy to imagine how one could extend their generator to produce their own functionality, besides drawing. It's even possible to imagine that you might have multiple generator targets, as there is no requirement to have a single generator output form like we've done in these tutorials. You could add as many different outputs forms as you need for each specific target, and even share some functionality between generators.

We hope that these tutorials have given you a practical demonstration of how to construct a language in Langium, and facilitated further exploration into more advanced topics & customizations. If you're interested about learning more about Langium, you can continue through our other tutorials, reach out to us via discussions on Github, or continue working on your Langium-based language.
