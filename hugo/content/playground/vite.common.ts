import path from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'common.ts'),
            name: 'common',
            fileName: () => 'common.js',
            formats: ['es']            
        },
        outDir: path.resolve(__dirname, '../../static/playground/libs/worker'),
        emptyOutDir: false
    }
});

export default config;
