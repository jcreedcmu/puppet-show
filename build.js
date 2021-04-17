const { buildSync } = require('esbuild')

buildSync({
  entryPoints: ['./src/dev.ts', './src/prod.ts', './src/server.ts'],
  bundle: false,
  outdir: './out',
  format: 'cjs',
  platform: 'node',
  logLevel: 'info',
});
