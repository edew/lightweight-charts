// Bundles bench/bench.ts with Vite and runs it in Node with --expose-gc.
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'node_modules/.cache/bench');

await build({
	root,
	configFile: false,
	logLevel: 'warn',
	define: { 'process.env.NODE_ENV': JSON.stringify('production') },
	build: {
		ssr: resolve(root, 'bench/bench.ts'),
		outDir,
		emptyOutDir: true,
		minify: false,
	},
});

const result = spawnSync(process.execPath, ['--expose-gc', '--max-old-space-size=8192', resolve(outDir, 'bench.mjs')], { stdio: 'inherit' });
process.exit(result.status ?? 1);
