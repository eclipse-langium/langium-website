import { resolve } from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, './assets/scripts/mer.ts'),
            name: 'mer',
            fileName: () => 'mer.js',
            formats: ['es']
        },
        outDir: resolve(__dirname, 'static/libs/mer'),
        assetsDir: resolve(__dirname, 'static/libs/mer/assets'),
        emptyOutDir: false,
        cssCodeSplit: false,
        commonjsOptions: {
            strictRequires: true
        },
        rollupOptions: {
            output: {
                name: 'mer',
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