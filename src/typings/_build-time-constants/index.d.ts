// this file contains build-time constants
// which will be replaced (injected) by Vite while bundling
// see vite.config.ts for the reference

declare namespace NodeJS {
	interface ProcessEnv {
		NODE_ENV: 'development' | 'production';
		BUILD_VERSION: string;
	}

	interface Process {
		env: ProcessEnv;
	}
}

declare var process: NodeJS.Process;
