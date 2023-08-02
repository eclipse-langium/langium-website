import { resolve } from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, './assets/scripts/monaco-editor-react.ts'),
            name: 'monaco-editor-react',
            fileName: () => 'monaco-editor-react.js',
            formats: ['es']
        },
        outDir: resolve(__dirname, 'static/libs/monaco-editor-react'),
        assetsDir: resolve(__dirname, 'static/libs/monaco-editor-react/assets'),
        emptyOutDir: false,
        cssCodeSplit: false,
        commonjsOptions: {
            strictRequires: true
        },
        rollupOptions: {
            output: {
                name: 'monaco-editor-react',
                exports: 'named',
                sourcemap: false,
                assetFileNames: (assetInfo) => {
                    return `assets/${assetInfo.name}`;
                }
            }
        }
    },
    resolve: {
        alias: {
            path: 'path-browserify'
        }
    },
    assetsInclude: ['**/*.wasm']
});

export default config;