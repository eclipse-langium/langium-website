import path from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/language-server/main-browser.ts'),
            name: 'serverWorker',
            fileName: (format) => `serverWorker-${format}.js`,
            formats: ['es', 'iife']
        },
        outDir: 'static/libs/worker',
        emptyOutDir: false,
        commonjsOptions: {
            include: [/langium/]
        }
    }
});

export default config;
