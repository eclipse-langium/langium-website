---
title: "Generation"
weight: 3
aliases:
  - /tutorials/generation
---

{{< toc format=html >}}

In this tutorial we'll be showing how to implement basic generation for your language. When we're talking about generation, we're talking about transforming an AST from your Langium-based language into some output target. This could be another language of similar functionality (transpilation), a lower level language (compilation), or generating some artifacts/data that will be consumed by another application. If you haven't already, make sure to go back over and check out the [tutorial on customizing your CLI](/docs/learn/minilogo/customizing_cli), as it touches on details about how to implement endpoints for your application (like generation).

Per usual, we'll be using the MiniLogo language as a motivating example here.

We'll be describing how to write a simple MiniLogo generator to output drawing a JSON array of drawing instructions. This tutorial will give you a general idea of how you can traverse an AST to produce generated output.

## Setting up the Generator API

To write the generator, we're going to work in the **src/cli/generator.ts** file. If you're using a language produced by the yeoman generator for Langium, then you should already have a function in here called `generateJavascript`. For MiniLogo, we'll change this to `generateCommands`, which will generate drawing commands to be handled later. We will also change the function signature to take a `Model`, and return a string of the generated file path.

```ts
// import the 'Model' type from our semantic model
import { Model } from '../language/generated/ast.ts';

export function generateCommands(mode: Model, filePath: string, destination: string | undefined): string {
    // ...
}
```

This function will serve as our generator endpoint. All MiniLogo programs that we want to generate from will be processed from here.

Now, our objective is to take a program like this:

```minilogo
def test() {
    pen(down)
    move(10,10)
    pen(up)
}

test()
```

And translate it into a generated JSON-like list of drawing commands like so:

```json
[
    { cmd: 'penDown' },
    { cmd: 'move', x: 10, y: 10 },
    { cmd: 'penUp' }
]
```

## Deciding Output to Generate

Notice that there's no notion of macros, definitions, for loops, or other constructs that are present in MiniLogo. We only need to produce a generated output that contains information relevant to our *semantic domain*. If you remember this term from the very beginning of writing our grammar, then you'll likely also remember that our semantic domain is a series of transformations performed on a drawing context. With this in mind, we can safely reduce a MiniLogo program to such a series of transformations on the pen, position, and color. We don't need to include anything else. In this context, you could think of it like a form of evaluation.

To be able to produce this output, we need to be able to traverse through all nodes of our AST. We can perform such a traversal by creating functions that map from our AST to our generated output. This is as simple as accessing the properties stored on a node, and writing functions to process the types of those properties such that generation is defined for every type of node in your AST.

An example of this would be defining a `generateStatements` function that takes a list of Statements, and produces some generated result from those statements. Anytime we were working with a node that contained statements, we could invoke this function on it, and return the results.

We can add this function to our `generateCommands` function to begin generation from the top-level statements in our `Model`.

```ts
export function generateCommands(mode: Model, filePath: string, destination: string | undefined): string {
    const result: Object[] = generateStatements(model.stmts);
    
}

...

function generateStatements(stmts: Stmt[]): Object[] { ... }
```

As a side note, to support generation with string content (like for generating file/program contents) we've added a `CompositeGeneratorNode` that is designed to help collect generated output. This is located in our **cli-util.ts**, and provides more structure with constructing textual outputs, without resorting to direct manipulation of strings.

## Generating from Statements

Now, let's expand on `generateStatements`. From our grammar, there are 5 types of statements:

- **pen**
- **move**
- **macro**
- **for**
- **color**

We we want to expand our function to handle each of these cases. This is easy to do using some special `isTYPE` functions made available from our semantic model. These are automatically generated from our grammar, and allow us to verify the type of a node from our AST at runtime.

```ts
import { isPen, isMove, isMacro, isFor, isColor } from '../language/generated/ast';

...

if(isPen(stmt)) {
    ...
} else if(isMove(stmt)) {
    ...
} else if(isMacro(stmt)) {
    ...
} else if(isFor(stmt)) {
    ...
} else if (isColor(stmt)) {
    ...
}
```

For `isPen` we have the easiest case where we could emit something like so:

```ts
{
    cmd: stmt.mode === 'up' ? 'penUp' : 'penDown'
};
```

However, for the rest of the statements, we need to be able to evaluate expressions first.

## Writing an Expression Evaluator

We need to *evaluate* our expressions to final values for statements, as we don't want to emit literal expressions like `1 + x * 5`; but rather their evaluated result. We'll handle this in a new `evalExprWithEnv` function.

```ts
// map of names to values
type MiniLogoGenEnv = Map<string,number>;

// evalutes exprs in the context of an env
function evalExprWithEnv(e: Expr, env: MiniLogoGenEnv): number {
    ...
}
```

As we mentioned before, in order to perform generation in this context, we're also writing an evaluator for our language. Thankfully, MiniLogo is relatively simple, especially since it doesn't have variables outside of definitions and for loops.

So let's write our expression evaluator. Assuming we have the function declaration from above, our first case to be added into that function is for `Lit`. Again, this is imported from our generated semantic model.

```ts
if(isLit(e)) {
    return e.val;
}
```

Pretty easy. A literal returns its value. Now for references.

```ts
if(isRef(e)) {
    const v = env.get(e.val.ref?.name ?? '');
    if (v !== undefined) {
        return v;
    }
    // handle the error case...
}
```

Since we have cross references, we can retrieve the node in question (ref), and check if we have a value stored for its name. In the case that we do, we return the value, otherwise we would want to report an error.

For binary expressions, we can invoke `evalExprWithEnv` recursively on the left & right operands. Since we used actions to restructure our semantic model a bit, we have access to this `isBinExpr` function to find `BinExpr` nodes. It's quite convenient, since we can now handle all 4 cases at once.

```ts
if(isBinExpr(e)) {
    let opval = e.op;
    let v1    = evalExprWithEnv(e.e1, env);
    let v2    = evalExprWithEnv(e.e2, env);

    switch(opval) {
        case '+': return v1 + v2;
        case '-': return v1 - v2;
        case '*': return v1 * v2;
        case '/': return v1 / v2;
        default:    throw new Error(`Unrecognized bin op passed: ${opval}`);
    }
}
```

For negated expressions, it's also fairly straight forward. We invert whatever value we would get normally.

```ts
if (isNegExpr(e)) {
    return -1 * evalExprWithEnv(e.ne, env);
}
```

Lastly, for groups we extract the 'grouped' value and evaluate it.

```ts
if(isGroup(e)) {
    return evalExprWithEnv(e.ge, env);
}
```

Lastly, it's always a good measure to *sanity check* that you aren't missing a case. Throwing an error is often much more desirable than having something silently fail, and produce strange results on generation. This means adding a default for your switches, and a final `else` clause to handle unexpected nodes.

With all those cases above, we can combine them into a series of `else if` clauses to have a clean case-by-case check.

## Generating from Statements with the Evaluator

Now that we can evaluate expressions, we can handle the rest of our statement cases. In order to incorporate our `env`, we'll also want to update our `generateStatements` function, and create a new `evalStmt` function to help out.

```ts
function generateStatements(stmts: Stmt[]): Object[] {
    // minilogo evaluation env
    let env : MiniLogoGenEnv = new Map<string,number>();

    // generate mini logo cmds off of statements
    return stmts.flatMap(s => evalStmt(s,env)).filter(e => e !== undefined) as Object[];
}

/**
 * Takes an statement, an environment, and produces a list of generated objects
 */
function evalStmt(stmt: Stmt, env: MiniLogoGenEnv) : (Object | undefined)[] {
    if (isPen(stmt)) {
        return [{
            cmd: stmt.mode === 'up' ? 'penUp' : 'penDown'
        }];
    }

    // ... the rest of our cases will follow ...
}
```

This gives us an `env` that can be updated by evaluating each statement, and persist from one to another; which is what we want for MiniLogo. Now, for `isMove`, we just need to evaluate the x & y arguments to their values using this env

```ts
if (isMove(stmt)) {
    return [{
        cmd: 'move',
        x: evalExprWithEnv(stmt.ex, env),
        y: evalExprWithEnv(stmt.ey, env)
    }];
}
```

For `isMacro` we need to save and restore our execution environment after the macro has been evaluated. We can do this by generating a new env, setting the parameters from the arguments, and passing that new env to the macro's statements instead.

*Keep in mind* arguments need to be evaluated before setting them into the env, and we want to carefully do this using the *original* env, not the new one being constructed. If there are names that already exist, and would be shadowed by this macro, then it could change the result of the macro (or even the value of subsequent arguments).

```ts
// get the cross ref
const macro: Def = stmt.def.ref as Def;

// copied env
let macroEnv = new Map(env);

// produce pairs of string & exprs, using a tmp env
// this is important to avoid mixing of params that are only present in the tmp env w/ our actual env
let tmpEnv = new Map<string, number>();

// evalute args independently, staying out of the environment
macro.params.map((elm, idx) => tmpEnv.set(elm.name, evalExprWithEnv(stmt.args[idx], macroEnv)));
// add new params into our copied env
tmpEnv.forEach((v,k) => macroEnv.set(k,v));

// evaluate all statements under this macro
return macro.body.flatMap(s => evalStmt(s, macroEnv));
```

For `isFor`, we also use a copied env, so that we don't alter the original env outside of the loop.

```ts
// compute for loop bounds
// start
let vi = evalExprWithEnv(stmt.e1, env);
// end
let ve = evalExprWithEnv(stmt.e2, env);

let results : (Object | undefined)[] = [];

// perform loop
const loopEnv = new Map(env);
while(vi < ve) {
    loopEnv.set(stmt.var.name, vi++);
    stmt.body.forEach(s => {
        results = results.concat(evalStmt(s, new Map(loopEnv)));
    });
}

return results;
```

Lastly, to handle `isColor`, check whether one set of properties is defined or the other (like color vs. any of the r,g,b properties).

```ts
if (stmt.color) {
    // literal color text or hex
    return [{cmd:'color', color: stmt.color}]
} else {
    // color as rgb
    const r = evalExprWithEnv(stmt.r!, env);
    const g = evalExprWithEnv(stmt.g!, env);
    const b = evalExprWithEnv(stmt.b!, env);
    return [{cmd:'color', r, g, b}]
}
```

With that, we're effectively done writing the core of our generator! The last changes to make are to write the output to a file, and to connect what we've written here with a command in our CLI.

## Connecting the Generator to the CLI

To do this, we can go back to the top of our generator, and update the `generateCommands` function to write the generated result to a file. Most of the structure here is carried over from the original code first setup by the yeoman generator, which makes it convenient to add in.

```ts
export function generateCommands(model: Model, filePath: string, destination: string | undefined): string {
    const data = extractDestinationAndName(filePath, destination);
    const generatedFilePath = `${path.join(data.destination, data.name)}.json`;

    if (!fs.existsSync(data.destination)) {
        fs.mkdirSync(data.destination, { recursive: true });
    }

    const result = generateStatements(model.stmts);

    fs.writeFileSync(generatedFilePath, JSON.stringify(result, undefined, 2));
    return generatedFilePath;
}
```

And to connect it to the CLI, which is setup in **src/cli/index.ts**, we can register it by slightly modifying the existing `generateAction` endpoint that was there by default.

```ts
export const generateAction = async (fileName: string, opts: GenerateOptions): Promise<void> => {
    const services = createHelloWorldServices(NodeFileSystem).HelloWorld;
    const model = await extractAstNode<Model>(fileName, services);
    // now with 'generateCommands' instead
    const generatedFilePath = generateCommands(model, fileName, opts.destination);
    console.log(chalk.green(`MiniLogo commands generated successfully: ${generatedFilePath}`));
};
```

Towards the bottom of the same file, we'll modify the description for the logic that registers this action:

```ts
program
    .command('generate')
    .argument('<file>', `source file (possible file extensions: ${fileExtensions})`)
    .option('-d, --destination <dir>', 'destination directory of generating')
    // new description
    .description('generates MiniLogo commands that can be used as simple drawing instructions')
    .action(generateAction);
```

And that's it. Now we can run the following to generate commands from a MiniLogo file of our choice.

```bash
npm run build
./bin/cli generate test.logo
```

This should produce **generated/test.json**, which contains a JSON array of the drawing commands generated by our program. For the following example program:

```minilogo
def test() {
    pen(down)
    move(10,10)
    pen(up)
}

test()
```

our JSON output should be:

```json
[
  {
    "cmd": "penDown"
  },
  {
    "cmd": "move",
    "x": 10,
    "y": 10
  },
  {
    "cmd": "penUp"
  }
]
```

If you're looking at the implementation of [MiniLogo that we've already written in the Langium organization on Github](https://github.com/langium/langium-minilogo), you may notice that the program and output there are *slightly* different. This interpretation of MiniLogo has gone through some iterations, and so there are some slight differences here and there. What's most important is that your version produces the generated output that you expect.

We could continue to extend on this with new features, and generate new sorts of output using a given input language. In this tutorial, we're able to take a MiniLogo program and convert it into some simple JSON drawing instructions that can be consumed by another program. This opens the door for us to write such a program in another language, such as Python or Javascript, and draw with these results. In later tutorials, we'll be talking about how to run Langium in the web with generation, so that we can immediately verify our results by drawing on an HTML5 canvas.

We recommend that you next read [the guide on bundling your language with Langium to reduce its size](/docs/recipes/code-bundling), before moving onto the tutorial about [bundling an extension](/docs/learn/minilogo/building_an_extension). This is an important step before deployment as an extension for VSCode, and also if you're planning to later deploy your language in the web.
