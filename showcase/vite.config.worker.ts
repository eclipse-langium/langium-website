import path from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/main.ts'),
            name: 'serverWorker',
            fileName: (format) => `serverWorker-${format}.js`,
            formats: ['es', 'iife']
        },
        outDir: 'static/libs/worker',
        emptyOutDir: false,
        commonjsOptions: {
            include: [/langium/, /langium-statemachine-dsl/]
        }
    }
});

export default config;
