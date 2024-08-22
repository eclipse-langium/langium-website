import cp from 'child_process';
import { dirname, resolve } from 'path';

const baseUrl = getBaseUrl();
console.log(`Building website for location '${baseUrl}'...`);
performHugoBuild(baseUrl);

function getBaseUrl() {
    return process.env['BASE_URL'] || '/';
}

function performHugoBuild(rootDir) {
    const executable = resolve(dirname(process.execPath), 'npm');
    cp.spawnSync(executable, [
        'exec',
        '--', 'hugo',
        '--config', 'config.toml', 
        '-b', rootDir,
        '-d', '../public',
        '--gc',
        '--minify'
    ], {
        env: {
            NODE_ENV: "production"
        },
        shell: true,
        stdio: 'inherit'
    });
}