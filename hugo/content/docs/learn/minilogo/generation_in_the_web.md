---
title: "Generation in the Web"
weight: 7
aliases:
  - /tutorials/generation_in_the_web
---

{{< toc format=html >}}

*Updated on Oct. 4th, 2023 for usage with monaco-editor-wrapper 3.1.0 & above.*

In this tutorial we'll be talking about how to perform generation in the web by listening for document builder notifications. There are multiple ways to hook into Langium to utilize the generator, such as by directly exporting the generator API. However, by listening to notifications from the document builder, we can do this with less code. This lets us quickly integrate new functionality into our existing Langium + Monaco integration, and focus more on what we would want to do with the generated output.

*(This tutorial previously utilized custom LSP commands to achieve the same goal of generation. This is still a valid approach, but we've found setting up listening for notifications this way is much more straightforward. We've implemented this in our own example languages as well, and would recommend it going forward.)*

We'll assume that you've already looked over most of the other tutorials at this point. It is particularly important that you have a language with working generation, and have a working instance of Langium + Monaco for your language (or another editor of your choice). In the case that you don't have a language to work with, you can follow along with [MiniLogo](https://github.com/langium/langium-minilogo), which is the example language used throughout many of these tutorials.

Since we're working with MiniLogo here, we already know that our generated output is in the form of drawing instructions that transform some drawing context. The generated output that we've implemented so far consists of a JSON array of commands, making it very easy to interpret. Now that we're working in a web-based context, this approach lends itself naturally towards manipulating an HTML5 canvas.

The parts that we still need to setup are:

- handle document validations, and generate notifications with our generator output
- listen for these notifications in the client, and extract the generated output
- interpret the generated output as drawing commands, and update the canvas

## Handling Document Validations

This is the first step we'll need, since without being able to generate notifications in the first place we would have nothing to listen to.

Thankfully a lot of the groundwork has already been done in previous tutorials, as well as within Langium itself. We just need to setup the an onBuildPhase listener for the document builder in our LS. Using the LS entry point **main-browser.ts** that we setup in the last tutorial on Langium + Monaco, we can add the following code to the end of our `startLanguageServer` function.

```ts
// modified import from the previous tutorial: Langium + Monaco
import {
    BrowserMessageReader,
    BrowserMessageWriter,
    Diagnostic,
    NotificationType,
    createConnection
} from 'vscode-languageserver/browser.js';

// additional imports
import { Model } from './generated/ast.js';
import { Command, getCommands } from './minilogo-actions.js';
import { generateStatements } from '../generator/generator.js';

// startLanguageServer...

// Send a notification with the serialized AST after every document change
type DocumentChange = { uri: string, content: string, diagnostics: Diagnostic[] };
const documentChangeNotification = new NotificationType<DocumentChange>('browser/DocumentChange');
// use the built-in AST serializer
const jsonSerializer = MiniLogo.serializer.JsonSerializer;
// listen on fully validated documents
shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, documents => {
    // perform this for every validated document in this build phase batch
    for (const document of documents) {
        const model = document.parseResult.value as Model;
        let json: Command[] = [];
        
        // only generate commands if there are no errors
        if(document.diagnostics === undefined 
            || document.diagnostics.filter((i) => i.severity === 1).length === 0
            ) {
            json = generateStatements(model.stmts);
        }
        
        // inject the commands into the model
        // this is safe so long as you careful to not clobber existing properties
        // and is incredibly helpful to enrich the feedback you get from the LS per document
        (model as unknown as {$commands: Command[]}).$commands = json;

        // send the notification for this validated document,
        // with the serialized AST + generated commands as the content
        connection.sendNotification(documentChangeNotification, {
            uri: document.uri.toString(),
            content: jsonSerializer.serialize(model, { sourceText: true, textRegions: true }),
            diagnostics: document.diagnostics ?? []
        });
    }
});
```

And that's it for setting up the onBuildPhase listener itself. We still need to address the usage of `generateMiniLogoCmds`, which is tied to the LS implementation.

Based on the work done in previous tutorials, we already have set up a working generator with MinLogo. If you haven't already set this up you can go back to the [tutorial on generation](./generation) and give it a look over. Ideally, we'll already have setup our `generateStatements` function for MiniLogo, meaning so long as the imported module doesn't have any modules that are browser incompatible, we should be able to use it as is. Based on the previous setup however, we should have a **generator.js** file that is free of such conflicts, as much of them should be separated into the cli directly.

This saves us quite a bit of time, since we don't need to handle setting up & dispatching a document for validation, we simply tap into the existing workflow and collect the result when it's ready. This is a great example of how Langium's architecture allows us to easily extend existing functionality, and add new features without having to rewrite existing code.

As a concluding note for this section, don't forget to rebuild your language server bundle! It might not be a bad idea to clean as well, just to be sure everything is working as expected at this step.

## Listening for Notifications in the Client

The next step we need to make is to actually listen for these notifications from the client's end. This takes us back to the [Langium + Monaco](./langium_and_monaco) setup in the previous tutorial.

After starting the wrapper successfully, we want to retrieve the MonacoLanguageClient instance (a wrapper around the language client itself) and listen for `browser/DocumentChange` notifications.

```ts
// wrapper has started...

// get the language client
const client = wrapper.getLanguageClient();
if (!client) {
    throw new Error('Unable to obtain language client!');
}

// listen for document change notifications
client.onNotification('browser/DocumentChange', onDocumentChange);

function onDocumentChange(resp: any) {
    let commands = JSON.parse(resp.content).$commands;
    // ... do something with these commands
}
```

Now this works, but when do we receive notifications, and how often? Well a good thing you asked, because if you started this up and began editing your program, you would be receiving a notification for every single change! Including whitespace changes. Now that's probably not what we're looking for, but the content is correct, we just want to slow it down a bit. We can do this by setting a timeout and a semaphore to prevent multiple notifications from being processed at once.

```ts
let running = false;
let timeout: number | null = null;

function onDocumentChange(resp: any) {
    // block until we're finished with a given run
    if (running) {
        return;
    }
    
    // clear previous timeouts
    if (timeout) {
        clearTimeout(timeout);
    }

    timeout = window.setTimeout(async () => {
        running = true;
        let commands = JSON.parse(resp.content).$commands;
        await updateMiniLogoCanvas(commands);
        running = false;

    }, 200); // delay of 200ms is arbitrary, choose what makes the most sense in your use case
}
```

And now we have a nice delay where repeated updates are discarded, until we have about 200ms without a subsequent update. That allows us to take the commands we're working with, and start doing something with them. The semaphore will prevent following updates from overriding the current run, allowing it to finish before starting a new execution.

You may have also noticed we added `updateMiniLogoCanvas` as the action to perform with our commands. This will be implemented in the next step, where we interpret our drawing commands.

That's it for listening for notifications! Now that we have our commands extracted, we'll can actually perform a series of drawing actions on an HTML5 canvas.

## Interpreting Draw Commands (Drawing)

If you've gotten to this point then you're on the final stretch! The last part we need to implement is the actual logic that takes our drawing commands and updates the canvas. This logic will be the content of the `updateMiniLogoCanvas` function, and we'll walk through each step here.

First, let's get a handle on our canvas, as well as the associated 2D context.

```ts
const canvas : HTMLCanvasElement | null = document.getElementById('minilogo-canvas') as HTMLCanvasElement | null;
if (!canvas) {
    throw new Error('Unable to find canvas element!');
}

const context = canvas.getContext('2d');
if (!context) {
    throw new Error('Unable to get canvas context!');
}
```

We'll also want to clean up the context, in case we already drew something there before. This will be relevant when we're updating the canvas multiple times with a new program.

```ts
context.clearRect(0, 0, canvas.width, canvas.height);
```

Next, we want to setup a background grid to display. It's not essential for drawing, but it looks nicer than an empty canvas.

```ts
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

```ts
context.strokeStyle = 'white';
```

Let's also setup some initial drawing state. This will be used to keep track of the pen state, and where we are on the canvas.

```ts
// maintain some state about our drawing context
let drawing = false;
let posX = 0;
let posY = 0;
```

And let's begin evaluating each of our commands. To do this, we'll setup an interval that repeatedly shifts the top element from our list of commands, evaluates it, and repeats. Once we're out of commands to evaluate, we'll clear the interval. The whole invocation will be wrapped in a promise, to make it easy to await later on. Feel free to adjust the delay (or remove it entirely) in your version.

```ts
const doneDrawingPromise = new Promise((resolve) => {
    // use the command list to execute each command with a small delay
    const id = setInterval(() => {
        if (cmds.length > 0) {
            dispatchCommand(cmds.shift() as MiniLogoCommand, context);
        } else {
            // finish existing draw
            if (drawing) {
                context.stroke();
            }
            clearInterval(id);
            resolve('');
        }
    }, 1);
});
```

`dispatchCommand` itself only needs to handle 4 cases:

- penUp
- penDown
- move
- color

Knowing this, and the details about what properties each command type can have, we can evaluate each command and update our context. This can be done with a switch and a case for each command type.

*Be sure to add this function inside the `updateMiniLogoCanvas` function, otherwise it will not have access to the necessary state!*

```ts
// dispatches a single command in the current context
function dispatchCommand(cmd: MiniLogoCommand, context: CanvasRenderingContext2D) {
    if (cmd.name) {
        switch (cmd.name) {
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
                const x = cmd.args.x;
                const y = cmd.args.y;
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
                if ((cmd.args as { color: string }).color) {
                    // literal color or hex
                    context.strokeStyle = (cmd.args  as { color: string }).color;
                } else {
                    // literal r,g,b components
                    const args = cmd.args as { r: number, g: number, b: number };
                    context.strokeStyle = `rgb(${args.r},${args.g},${args.b})`;
                }
                break;

            // fallback in case we missed an instruction
            default:
                throw new Error('Unrecognized command received: ' + JSON.stringify(cmd));

        }
    }
}
```

Now that we can interpret commands into drawing instructions, we're effectively done with setting up the last part of MiniLogo. Since we're listening to document updates, we don't need to do anything other than to just start it up and start with an example program.

That's it, we're all done writing up our TS file. We should now be able to run the following (assuming the generator script is also executed by `build:web`), and get our results in `localhost:3000`.

```bash
npm run build:web
npm run serve
```

If all went well, you should see a white diamond sketched out on the canvas when the page loads. If not, double check that you receive & use the `code` value correctly in your `createUserConfig` function. You can also add the program yourself from here:

```minilogo
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
```

Once you have something drawing on the screen, you're all set, congratulations! You've just successfully written your own Langium-based language, deployed it in the web, and hooked up generation to boot. In fact, you've done *quite* a lot if you've gone through all of these tutorials so far.

- writing your own grammar
- implementing custom validation
- customizing your CLI
- adding generation
- configuring code bundling
- building an extension
- setting up Langium + Monaco in the web
- adding a document build phase listener
- listening for notifications in the client, and using the results

And the concepts that we've gone over from the beginning to now are not just for MiniLogo of course, they can be easily generalized to work for your own language as well. As you've been going through these tutorials, we hope that you've been thinking about how you could have done things *differently* too. Whether a simple improvement, or another approach, we believe it's this creative kind of thinking that takes an idea of a language and really allows it to grow into something great.

One easy note is how the example code shown in these tutorials was designed to be easy to demonstrate. It could definitely be improved with better error checking, better logic, generator optimizations, etc; something to keep in mind.

It's also easy to imagine how one could extend their generator to produce their own functionality besides drawing. For example, imagine that you might have multiple generator targets, as there is no requirement to have a single generator output form like we've done in these tutorials. You could add as many different output forms as you need for each specific target, and even share some functionality between generators.

We hope that these tutorials have given you a practical demonstration of how to construct a language in Langium, and facilitated further exploration into more advanced topics & customizations. If you're interested about learning more about Langium, you can continue through our other tutorials, reach out to us via discussions on Github, or continue working on your Langium-based language.
