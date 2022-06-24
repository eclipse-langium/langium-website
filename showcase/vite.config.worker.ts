import path from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, './src/serverWorker.ts'),
            name: 'serverWorker',
            fileName: (format) => `serverWorker-${format}.js`,
            formats: ['es']
        },
        outDir: 'dist/worker',
        emptyOutDir: false
    }
});

export default config;
