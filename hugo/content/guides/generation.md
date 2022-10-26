---
title: "Generation"
weight: 3
draft: true
---

In this guide we'll be talking about the basics of generation. When we're talking about generation, we're talking about transforming an AST from your Langium-based language into an output target. This could be another language of similar functionality (transpilation), a lower level language (compilation), or just generating some artifacts/data that will be consumed by another application. If you haven't already, make sure to go back over and check out the [guide on customizing your CLI](/guides/customizing_cli), as it touches on details about how to implement endpoints for your application (like generation).

Per usual, we'll be using the MiniLogo language as a motiviating example for generation.

Assuming you have an understanding of how to extend your CLI and modify it, then you're likely interested in implementing custom generator functionality. We'll be describing how write a simple MiniLogo generator to output simple drawing instructions. This guide will just give you a general idea of how you can do is utilize AST traversals to produce generated output, and in a way that can be generalized to other applications.

## Writing the Generator

To start writing the generator, we're going to work in the **src/cli/generator.ts** file. If you're using the yeoman generator example, then you should already have a function in here called `generateJavascript`. For MiniLogo, we just want to make this `generateCommands`, which will generate drawing commands to be handled later. We can also change the function signature to take a `Model`, and return a string of the generated file path.

```ts
// import the 'Model' type from our semantic model
import { Model } from '../language-server/generated/ast.ts';
...
export function generateCommands(mode: Model, filePath: string, destination: string | undefined): string {
    // ...
}
```

This function will serve as our generator endpoint. All MiniLogo programs that we want to generate from will start here.

Now, our objective is to take a program like this:
```minilogo
def test() {
    pen(down)
    move(10,10)
    pen(up)
}

test()
```

And translate it into a generated JSON-like list of drawing commands:

```json
[
    { cmd: 'penDown' },
    { cmd: 'move', x: 10, y: 10 },
    { cmd: 'penUp' }
]
```

Notice that there's no notion of macros, definitions, or other constructs that are in MiniLogo. This is because when we're generating output, we're transforming into an output that matches our *semantic domain*. If you remember this term from the very beginning of writing our grammar, then you'll likely also remember that our semantic domain is of transformations to a drawing context. With this in mind, we can safely reduce a MiniLogo program to a series of transformations on the pen, position, and color. We don't need to include anything else. In this context, you could think of it like a form of evaluation.

So, to be able to produce this output, we need to be able to run our generator through all nodes of our AST. This is going to be a traversal in essense. In terms of how you we can do this to traversal, one way is to traverse the AST by hand, from function to function. This is as simple as accessing the properties stored on a node, and mapping functions onto the types of those properties such that generation is defined for every type of node in your AST.

An example of this would be defining a `generateStatements` function that takes a list of Statements, and produces some generated result from those statements. Anytime we were working with a node that contained statements, we could invoke this function on it, and return the results.

We can add this function to our `generateCommands` function to begin generating from the statements in our program.

```ts
export function generateCommands(mode: Model, filePath: string, destination: string | undefined): string {
    const result: Object[] = generateStatements(model.stmts);
    
}

...

function generateStatements(stmts: Stmt[]): Object[] { ... }
```

As another side node, to support generation with string content (like for generating file/program contents) we've added a `CompositeGeneratorNode` that is designed to help collect generated output. This provides more structure with constructing generated outputs, without resorting to direct manipulation of strings.

Now, let's expand on `generateStatements`. From our grammar, we should recall there are 5 types of statements:

- **pen**
- **move**
- **macro**
- **for**
- **color**

We we want to expand our function to handle each of these cases using some special `isTYPE` functions. These are automatically generated from our grammar, and allow us to verify the type of a node at runtime.

```ts
import { isPen, isMove, isMacro, isFor, isColor } from '../language-server/generated/ast';

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
} else {
    throw new Error('Unrecognized Statement encountered: ' + (stmt as any)?.$type ?? 'Unknown Type');
}
```

For `isPen` we have the easiest, we could emit something like what we wrote above:

```ts
{
    cmd: stmt.mode === 'up' ? 'penUp' : 'penDown'
};
```

However, for all our other cases, we need to *evaluate* our expressions to final values, as we don't want to emit something like `1 + x * 5`. We'll handle this in an `evalExprWithEnv` function.

```ts
// map of names to values
type MiniLogoGenEnv = Map<string,number>;

// evalutes exprs in the context of an env
function evalExprWithEnv(e: Expr, env: MiniLogoGenEnv): number {
    ...
}
```

As we mentioned before, in order to perform generation in this context, we're also writing an evaluator for our language. But don't worry, we won't get too far into things. Thanksfully MiniLogo is relatively simple, especially since it doesn't have variables. However, we still need to handle the case of arguments being bound to parameters, which can happen for the `Macro` and `For` cases.

So let's write our expression evaluator. Assuming we have the function declaration from above, our first case is for `isLit`. Again, this is imported from our generated semantic model, and corresponds with recognizing a node of type `Lit`.

```ts
if(isLit(e)) {
    return e.val;
}
```

Pretty easy. A literal returns it's value. Now for references.

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

For binary expressions, we can invoke this function recursively on the left & right operands. Since we used actions to restructure our semantic model a bit, we have access to this `isBinExpr` function to find `BinExpr` nodes. It's quite convenient, since we can now handle all 4 cases at once.

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

For negated expressions, it's also fairly straight forward. We just need to invert whatever value we would get normally.

```ts
if (isNegExpr(e)) {
    return -1 * evalExprWithEnv(e.ne, env);

}
```

Lastly, for groups, there's no real work involved at all. We just need to extract the 'grouped' value and evalute it.

```ts
if(isGroup(e)) {
    return evalExprWithEnv(e.ge, env);

}
```

Lastly lastly, it's always a good measure to *sanity check* that you aren't missing a case. Throwing an error is often much more desirable than having something silently fail, and produce strange results on generation.

```ts
throw new Error('Unhandled Expression: ' + e);
```

With all those cases above, we could combine them into a series of `else if` clauses to have a clean case-by-case check.

Now that we can evaluate expressions, we can handle the rest of our statement cases. In order to incorpoate our `env`, we'll also want to update our `generateStatements` function, and create a new `evalStmt` function to help out.

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
        return {
            cmd: stmt.mode === 'up' ? 'penUp' : 'penDown'
        };
    }

    // ... the rest of our cases will follow ...
}
```

This gives us an `env` that can be effectually updated by statements, and persist from one to another; which is perfect for this language. Now, for `isMove`, we just need to evaluate the x & y arguments to their values using this env

```ts
if (isMove(stmt)) {
    return {
        cmd: 'move',
        x: evalExprWithEnv(stmt.ex, env),
        y: evalExprWithEnv(stmt.ey, env)
    };
}
```

For `isMacro` we need to save and restore our execution environment after the macro has been evaluted. We can do this by generating a new env, setting the parameters from the arguments, and passing that new env to the macro's statements instead.

Keep in mind we need to evaluate the arguments before setting them into the env, and we want to carefully do this using the *original* env, not the new one being constructed. If there are names that already exist, and would be shadowed by this macro, then it could change the result of the macro (or even the value of an argument).

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
return macro.body.flatMap(s => evalStmt(s, macroEnv, state));
```

For `isFor`, we can handle it similarly with a copied env, so that we don't alter the original outside of the loop.

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
        results = results.concat(evalStmt(s, new Map(loopEnv), state));
    });
}

return results;
```

Lastly, to handle `isColor`, we just need to check whether one set of properies is defined or the other (like color vs. any of the r,g,b properties).

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

We're effectively done writing the core of our generator at this point. The last touches are to write the output to a file, and to connect what we've written here with a command in our CLI.

To do this, we can go back to the top of our generator, and update the `generateCommands` function to write our generated result to disk. Most of the structure here is carried over from the original code from the yeoman generator, which makes it relatively convenient to add in.

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

And to connect it to the CLI, which is setup in **src/cli/index.ts**, we can register it by slightly modifying the existing `generateAction` endpoint that was setup by default.

```ts
export const generateAction = async (fileName: string, opts: GenerateOptions): Promise<void> => {
    const services = createHelloWorldServices(NodeFileSystem).HelloWorld;
    const model = await extractAstNode<Model>(fileName, services);
    // now with 'generateCommands' instead
    const generatedFilePath = generateCommands(model, fileName, opts.destination);
    console.log(chalk.green(`MiniLogo commands generated successfully: ${generatedFilePath}`));
};
```

Towards the bottom of the same file, we can modify just the description for the logic that registers this action:

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

```
npm run build
./bin/cli generate test.logo
```

This should produce **generated/test.json**, which contians a JSON array of the drawing commands generated by our program. For the following example program:

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

If you're looking at the implementation of [MiniLogo that we've already written in the Langium organization on Github](https://github.com/langium/langium-minilogo), you may notice that the program and output are slightly different. This interpretation of MiniLogo has gone through some iterations, and so there are some slight differences here and there. What's most important however, is that your version produces the generated output that you expect.

We could continue to extend on this with new features, and generate new sorts of output using a given input language. In this guide, we're able to take MiniLogo program and convert it into some simple JSON drawing instructions that can be consumed by another program. This open the door for us to write such a simple program in another language, such as Python or Javascript, and draw with these results. In later guides, we'll be talking about how to run Langium in the web with generation, so that we can immediately verify our results on an HTML5 canvas.

[In our next guide, will be talking about how we can bundle your language with Langium to reduce its size](/guides/bundling_an_extension). This is an important step before deployment as an extension for VSCode. This also important if you're planning to later deploy you language in the web.
