import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default [
	{
		ignores: ['.svelte-kit/', 'build/', 'node_modules/', 'static/pagefind/']
	},
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.js', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		},
		rules: {
			// The starter accepts both internal and external href props through shared components.
			'svelte/no-navigation-without-resolve': 'off',
			// The Steps component progressively enhances rendered MDSvex content.
			'svelte/no-dom-manipulating': 'off'
		}
	}
];
