import { resolve } from 'path';
import { defineConfig, UserConfig } from 'vite';
import inject from "@rollup/plugin-inject";

export default ({ command }) => {
    const config = defineConfig({
        define: {
            'process.env': {}
        },
        build: {
            lib: {
                entry: resolve(__dirname, 'content/playground/common.ts'),
                name: 'common',
                fileName: () => 'common.js',
                formats: ['es']            
            },
            outDir: resolve(__dirname, 'static/playground/libs/worker'),
            emptyOutDir: false,
        }
    }) as UserConfig;
    if (command === 'build') {
        config.build!.rollupOptions = {
            plugins: [
                inject({
                    process: 'process',
                }),
            ],
        }
    } else {
        config.define = { 'process.env': {} }
    }
    return config
}
