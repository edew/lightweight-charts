import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url));

const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

/**
 * Replaces each use of a member of an exported `const enum` with its value.
 *
 * The TypeScript compiler does this, but the bundler compiles each file alone: it
 * keeps an enum from a different file as an object. The members must have number
 * values that are written in the declaration.
 */
function inlineConstEnums(): Plugin {
	const values = new Map<string, string>();
	const sourceFiles = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(
		(entry) => entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : entry.name.endsWith('.ts') ? [join(dir, entry.name)] : []
	);

	for (const file of sourceFiles(resolve(__dirname, 'src'))) {
		for (const [, name, body] of readFileSync(file, 'utf-8').matchAll(/export const enum (\w+) \{([^}]*)\}/g)) {
			for (const [, member, value] of body.matchAll(/^\s*(\w+) = (-?[\d.]+),/gm)) {
				values.set(`${name}.${member}`, value);
			}
		}
	}

	const names = [...new Set([...values.keys()].map((key) => key.split('.')[0]))].join('|');
	const use = new RegExp(`\\b(?:${names})\\.\\w+\\b`, 'g');

	return {
		name: 'inline-const-enums',
		enforce: 'pre',
		transform(code, id) {
			if (!id.endsWith('.ts') || !use.test(code)) {
				return null;
			}
			return code.replace(use, (key) => {
				const value = values.get(key);
				if (value === undefined) {
					throw new Error(`${id}: no value for ${key}`);
				}
				return `(${value} /* ${key} */)`;
			});
		},
	};
}

export default defineConfig({
	plugins: [inlineConstEnums()],
	build: {
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: 'LightweightCharts',
			// the proper extensions will be added
			fileName: 'lightweight-charts',
		},
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
		'process.env.BUILD_VERSION': JSON.stringify(packageJson.version),
	},
});
