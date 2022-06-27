import path from 'path';
import { defineConfig } from 'vite';
import rollupNodePolyFill from 'rollup-plugin-node-polyfills'

const config = defineConfig({
    build: {
        rollupOptions: {
            plugins: [
                // Enable rollup polyfills for production
                rollupNodePolyFill()
            ]
        },
        lib: {
            entry: path.resolve(__dirname, 'src/serverWorker.ts'),
            name: 'serverWorker',
            fileName: (format) => `serverWorker-${format}.js`,
            formats: ['es']
        },
        outDir: 'static/libs/worker',
        emptyOutDir: false,
        commonjsOptions: {
            include: [/langium/]
        }
    }
});

export default config;
