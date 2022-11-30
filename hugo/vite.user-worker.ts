import { resolve } from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'content/playground/user-worker.ts'),
            name: 'userServerWorker',
            fileName: () => 'userServerWorker.js',
            formats: ['iife']            
        },
        outDir: resolve(__dirname, 'static/playground/libs/worker/'),
        emptyOutDir: false
    }
});

export default config;
