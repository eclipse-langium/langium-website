import path from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, '../../../node_modules/langium-domainmodel-dsl/out/language-server/main-browser.js'),
            name: 'domainmodelServerWorker',
            fileName: () => 'domainmodelServerWorker.js',
            formats: ['iife'],   
        },
        outDir: path.resolve(__dirname, '../../static/showcase/libs/worker/'),
        emptyOutDir: false
    }
});

export default config;
