const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
	...expoConfig,
	{
		ignores: ['coverage/**', 'dist/**'],
		rules: {
			indent: ['error', 'tab', { SwitchCase: 1 }],
		},
	},
]);
