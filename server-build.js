const { build } = require('esbuild')

const args = process.argv.slice(2);

async function go() {

  await build({
	 entryPoints: ['./src/dev.ts', './src/prod.ts', './src/server.ts'],
	 bundle: false,
	 outdir: './out',
	 format: 'cjs',
	 platform: 'node',
	 logLevel: 'info',
	 watch: args[0] == 'watch',
  });
}

go();
