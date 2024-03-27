import { resolve } from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, './src/index.ts'),
            name: 'monaco-editor-wrapper-bundle',
            fileName: () => 'index.js',
            formats: ['es']
        },
        outDir: resolve(__dirname, 'bundle/monaco-editor-wrapper-bundle'),
        emptyOutDir: true,
        cssCodeSplit: false,
        sourcemap: true,
        commonjsOptions: {
            strictRequires: true
        },
        rollupOptions: {
            output: {
                name: 'monaco-editor-wrapper-bundle',
                exports: 'named',
                sourcemap: false
            }
        }
    }
});

export default config;
