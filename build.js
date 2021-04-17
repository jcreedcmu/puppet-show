const { buildSync } = require('esbuild')

buildSync({
  entryPoints: ['./src/dev.ts', './src/prod.ts'],
  bundle: false,
  outdir: './out',
  format: 'cjs',
  platform: 'node',
  logLevel: 'info',
});
