import path from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        target: ['es2020'],
        rollupOptions: {
            input: {
                app: path.resolve(__dirname, 'static/index.html'),
                statemachine: path.resolve(__dirname, 'static/statemachine/index.html')
            },
            output: {
                esModule: true
            }
        },
        commonjsOptions: {
            include: [/langium/]
        },
        outDir: path.resolve(__dirname, 'dist/vite')
    },
    optimizeDeps: {
        esbuildOptions: {
            target: 'es2020'
        }
    },
    server: {
        open: 'static/index.html',
    }
});

export default config;
