---
title: "Code Bundling"
weight: 900
aliases:
  - /guides/code-bundling
---

When you first create a Langium project using the [Yeoman generator](/docs/learn/workflow/install), it will only contain a plain TypeScript configuration, without any additional build processes.
However, if you want to make your language available for consumption in a non-development context, you'll want to create a bundle.
It is not absolutely necessary in a Node.js context, since you can always resolve local `node_modules` but it's still recommended [for vscode extensions](https://code.visualstudio.com/api/working-with-extensions/bundling-extension).
It improves performance and decreases file size by minifying your code and only including what you actually need.

We generally recommend using [esbuild](https://esbuild.github.io/) to bundle Langium based language servers and extensions. To install it, simply run:

```sh
npm i --save-dev esbuild
```

You can see a minimal configuration file below that bundles both your language server and your extension.

```ts
//@ts-check
import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const minify = process.argv.includes('--minify');

const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts', 'src/language/main.ts'],
    outdir: 'out',
    bundle: true,
    target: "es6",
    loader: { '.ts': 'ts' },
    external: ['vscode'], // the vscode-module is created on-the-fly and must be excluded.
    platform: 'node', // VSCode extensions run in a node process
    sourcemap: !minify,
    minify
});

if (watch) {
    await ctx.watch();
} else {
    await ctx.rebuild();
    ctx.dispose();
}
```

Store it in a module JavaScript file (`.mjs`) and create a corresponding script in your `package.json` file:

```js
"scripts": {
  "build": "node ./esbuild.mjs"
}
```

If you want to use a Langium language server in the browser, you can get away with an even smaller setup with the following script:

```js
"scripts": {
  "build:worker": "esbuild ./src/main.ts --bundle --format=iife --outfile=./public/languageServerWorker.js"
}
```

If you're more inclined to use [webpack](https://webpack.js.org/), a configuration for an extension bundler can be seen below:

```js
const path = require('path');

const commonConfig = {
    target: 'node',
    mode: 'none',
    devtool: 'nosources-source-map',
    externals: {
        vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                enforce: 'pre',
                loader: 'source-map-loader',
                exclude: /vscode/
            },
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader'
                    }
                ]
            }
        ]
    }
}
const lspConfig = {
    ...commonConfig,
    entry: './src/language/main.ts', // the entry point of the language server
    output: {
        path: path.resolve(__dirname, 'out', 'language'),
        filename: 'main.js',
        libraryTarget: 'commonjs2',
        devtoolModuleFilenameTemplate: '../../[resource-path]',
        clean: true
    }
};
const vscodeConfig = {
    ...commonConfig,
    entry: './src/extension.ts', // the entry point of this extension
    output: {
        path: path.resolve(__dirname, 'out'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
        devtoolModuleFilenameTemplate: '../[resource-path]'
    }
};
module.exports = [lspConfig, vscodeConfig];
```
