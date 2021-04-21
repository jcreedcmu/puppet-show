const { build } = require('esbuild')

const args = process.argv.slice(2);

async function go() {

  await build({
	 entryPoints: ['./client-src/index.ts'],
	 sourcemap: true,
	 bundle: true,
	 outfile: './public/js/bundle.js',
	 format: 'cjs',
	 logLevel: 'info',
	 watch: args[0] == 'watch',
  });
}

go();
