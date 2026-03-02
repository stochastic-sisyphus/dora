import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import cypressPlugin from 'eslint-plugin-cypress';
import sveltePlugin from 'eslint-plugin-svelte';
import globals from 'globals';
import svelteParser from 'svelte-eslint-parser';

export default [
	js.configs.recommended,
	{
		ignores: ['**/static/', '**/build/', '**/dist/', '**/.svelte-kit/', '**/src-tauri/']
	},
	{
		files: ['src/**/*.{js,ts,mts,cts,jsx,tsx,mtsx,ctsx}'],
		
		languageOptions: {
			parser: tsParser,
			ecmaVersion: 2020,
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.es2017,
				...globals.node
			}
		},
		plugins: {
			'@typescript-eslint': tsPlugin
		},
		rules: {
			...tsPlugin.configs.recommended.rules
		}
	},
	{
		files: ['src/**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tsParser
			},
			ecmaVersion: 2020,
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.es2017,
				...globals.node
			}
		},
		plugins: {
			svelte: sveltePlugin
		},
		rules: {
			...sveltePlugin.configs.recommended.rules
		}
	},
	{
		files: ['cypress/**/*.{js,ts}'],
		plugins: {
			cypress: cypressPlugin
		},
		rules: {
			...cypressPlugin.configs.recommended.rules
		}
	}
];
