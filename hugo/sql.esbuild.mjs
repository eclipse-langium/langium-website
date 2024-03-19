import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['./assets/scripts/sql/language-server.ts'],
  bundle: true,
  format: "iife",
  outfile: './static/showcase/libs/worker/sqlServerWorker.js',
})