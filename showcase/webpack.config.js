const path = require('path');

module.exports = {
    entry: path.resolve(__dirname, 'src', 'serverWorker.ts'),
    module: {
        rules: [{
            test: /\.ts?$/,
            use: ['ts-loader']
        },
        ]
    },
    experiments: {
        outputModule: true,
    },
    output: {
        filename: 'serverWorker-es.js',
        path: path.resolve(__dirname, 'dist', 'worker'),
        module: true
    },
    target: 'web',
    resolve: {
        extensions: ['.ts', '.js'],
        fallback: {
            fs: require.resolve("path-browserify"),
            path: require.resolve("path-browserify"),
            os: require.resolve("os-browserify/browser")
        }
    },
    mode: process.env['NODE_ENV'] === 'production' ? 'production' : 'development'
};
