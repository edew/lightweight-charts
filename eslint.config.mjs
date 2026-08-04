import tseslint from 'typescript-eslint';

// Deliberately minimal: only rules that catch dead code and likely bugs.
// Style/formatting is left alone.
export default tseslint.config(
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin,
		},
		rules: {
			'no-unused-private-class-members': 'error',
			'@typescript-eslint/no-unused-expressions': 'error',
			'@typescript-eslint/no-unused-vars': ['error', { args: 'all', argsIgnorePattern: '^_' }],
			'@typescript-eslint/no-unnecessary-condition': 'warn',
		},
	}
);
