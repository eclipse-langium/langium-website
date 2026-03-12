#!/usr/bin/env node

/**
 * Pre-build script: bundles web workers and copies static assets
 * for the Langium website.
 */

import { execSync } from 'child_process';
import { cpSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const rootNodeModules = resolve(root, '../node_modules');
const webNodeModules = resolve(root, 'node_modules');
const publicDir = resolve(root, 'public');

// Resolve a package path from either workspace node_modules or root node_modules
function resolvePackagePath(...parts) {
  const webPath = resolve(webNodeModules, ...parts);
  if (existsSync(webPath)) return webPath;
  return resolve(rootNodeModules, ...parts);
}

// Build a NODE_PATH that includes nested node_modules dirs so esbuild
// can resolve transitive deps like vscode-languageserver-types that npm
// hoists only to nested locations (e.g. root/node_modules/vscode-languageserver/node_modules/)
function buildNodePath() {
  const paths = [webNodeModules, rootNodeModules];
  // Add nested node_modules inside root packages (for hoisted nested deps)
  const nestedSearchRoots = ['vscode-languageserver', 'vscode-languageclient'];
  for (const pkg of nestedSearchRoots) {
    const nested = resolve(rootNodeModules, pkg, 'node_modules');
    if (existsSync(nested)) paths.push(nested);
  }
  return paths.join(':');
}

const nodeModules = rootNodeModules;
const esbuildNodePath = buildNodePath();

function run(cmd, env = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root, env: { ...process.env, NODE_PATH: esbuildNodePath, ...env } });
}

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Clean previous builds
const dirsToClean = [
  resolve(publicDir, 'workers'),
  resolve(publicDir, 'libs'),
];
for (const dir of dirsToClean) {
  if (existsSync(dir)) {
    execSync(`rm -rf "${dir}"`);
  }
}

// Ensure output directories
ensureDir(resolve(publicDir, 'workers'));
ensureDir(resolve(publicDir, 'libs/monaco-editor-workers/workers'));

// === Build showcase workers (IIFE bundles) ===
const showcaseWorkers = [
  {
    entry: resolvePackagePath('langium-statemachine-dsl', 'out', 'language-server', 'main-browser.js'),
    out: `${publicDir}/workers/statemachineServerWorker.js`,
  },
  {
    entry: resolvePackagePath('langium-arithmetics-dsl', 'out', 'language-server', 'main-browser.js'),
    out: `${publicDir}/workers/arithmeticsServerWorker.js`,
  },
  {
    entry: resolvePackagePath('langium-domainmodel-dsl', 'out', 'language-server', 'main-browser.js'),
    out: `${publicDir}/workers/domainmodelServerWorker.js`,
  },
  {
    entry: resolvePackagePath('langium-minilogo', 'out', 'language-server', 'main-browser.js'),
    out: `${publicDir}/workers/minilogoServerWorker.js`,
  },
];

for (const { entry, out } of showcaseWorkers) {
  run(`npx esbuild "${entry}" --bundle --format=iife --outfile="${out}"`);
}

// === Build SQL worker (from local source) ===
// TODO: Update path once SQL language server source is moved to web/workers/
const sqlWorkerEntry = resolve(root, '../hugo/assets/scripts/sql/language-server.ts');
if (existsSync(sqlWorkerEntry)) {
  run(`npx esbuild "${sqlWorkerEntry}" --bundle --format=iife --outfile="${publicDir}/workers/sqlServerWorker.js"`);
}

// === Build playground workers ===
const playgroundWorkerDir = resolve(root, 'workers/playground');
const playgroundWorkers = [
  { entry: 'langium-worker.ts', out: 'langiumServerWorker.js', format: 'iife' },
  { entry: 'user-worker.ts', out: 'userServerWorker.js', format: 'iife' },
  { entry: 'common.ts', out: 'common.js', format: 'esm' },
];

for (const { entry, out, format } of playgroundWorkers) {
  const entryPath = resolve(playgroundWorkerDir, entry);
  if (existsSync(entryPath)) {
    run(`npx esbuild "${entryPath}" --bundle --format=${format} --outfile="${publicDir}/workers/${out}"`);
  } else {
    console.warn(`Warning: Playground worker source not found: ${entryPath}`);
  }
}

// === Copy Monaco editor workers ===
const monacoWorkersSource = resolvePackagePath('monaco-editor-workers', 'dist');
const monacoWorkersDest = resolve(publicDir, 'libs/monaco-editor-workers');

if (existsSync(monacoWorkersSource)) {
  cpSync(resolve(monacoWorkersSource, 'index.js'), resolve(monacoWorkersDest, 'index.js'));
  if (existsSync(resolve(monacoWorkersSource, 'index.css'))) {
    cpSync(resolve(monacoWorkersSource, 'index.css'), resolve(monacoWorkersDest, 'index.css'));
  }
  const editorWorker = resolve(monacoWorkersSource, 'workers/editorWorker-iife.js');
  if (existsSync(editorWorker)) {
    cpSync(editorWorker, resolve(monacoWorkersDest, 'workers/editorWorker-iife.js'));
  }
  console.log('Copied monaco-editor-workers.');
} else {
  console.warn('Warning: monaco-editor-workers not found in node_modules.');
}

console.log('Worker build complete.');
