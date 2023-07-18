import { resolve } from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, '../node_modules/langium-statemachine-dsl/out/language-server/main-browser.js'),
            name: 'statemachineServerWorker',
            fileName: () => 'statemachineServerWorker.js',
            formats: ['iife']            
        },
        outDir: resolve(__dirname, 'static/showcase/libs/worker/'),
        emptyOutDir: false,
        commonjsOptions: {
            strictRequires: true
        }
    }
});

export default config;