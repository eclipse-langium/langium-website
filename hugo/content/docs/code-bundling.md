---
title: "Code Bundling"
weight: 500
---

esbuild:

```js
const watch = process.argv.includes('--watch');
const minify = process.argv.includes('--minify');
const success = watch ? 'Watch build succeeded' : 'Build succeeded';

require('esbuild').build({
    // Two entry points, one for the extension, one for the language server
    entryPoints: ['src/extension.ts', 'src/language-server/main.ts'],
    outdir: 'out',
    bundle: true,
    loader: { '.ts': 'ts' },
    external: ['vscode'], // the vscode-module is created on-the-fly and must be excluded
    platform: 'node', // VSCode extensions run in a node process
    sourcemap: true,
    watch: watch ? {
        onRebuild(error) {
            if (error) console.error('Watch build failed')
            else console.log(success)
        }
    } : false,
    minify
})
    .then(() => console.log(success))
    .catch(() => process.exit(1));
```

Webpack:

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
    entry: './src/language-server/main.ts', // the entry point of the language server
    output: {
        path: path.resolve(__dirname, 'out', 'language-server'),
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