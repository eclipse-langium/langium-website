import path from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, '../node_modules/langium-statemachine-dsl/src/language-server/main-browser.ts'),
            name: 'serverWorker',
            fileName: (format) => `serverWorker.js`,
            formats: ['iife']
        },
        outDir: 'static/libs/worker',
        emptyOutDir: false,
        commonjsOptions: {
            include: [/langium/, /langium-statemachine-dsl/]
        }
    }
});

export default config;
