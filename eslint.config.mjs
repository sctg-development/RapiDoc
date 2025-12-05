import path from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
    ...compat.config({
        parser: '@babel/eslint-parser',
        parserOptions: {
            sourceType: 'module',
            allowImportExportEverywhere: false,
            ecmaVersion: 'latest',
            babelOptions: {
                configFile: './.babelrc.json',
            },
        },
        settings: {
            'import/resolver': {
                webpack: {
                    config: './webpack.config.js',
                },
            },
        },
        env: {
            browser: true,
            node: true,
        },
        globals: {
            globalThis: false,
        },
        rules: {
            'max-len': [1, 300, 2, { ignoreComments: true }],
            'no-debugger': 0,
            'no-plusplus': 0,
            'no-param-reassign': 0,
            'no-nested-ternary': 0,
            'no-continue': 0,
            'no-restricted-syntax': 0,
            'guard-for-in': 0,
            'consistent-return': 0,
            'array-callback-return': 0,
            'class-methods-use-this': 0,
            'prefer-destructuring': ['error', { object: true, array: false }],
            'no-unused-vars': ['error', { vars: 'all', args: 'after-used', caughtErrors: 'all', ignoreRestSiblings: false }],
            'object-curly-newline': ['error', { ObjectPattern: { multiline: true }, ImportDeclaration: 'never', ExportDeclaration: { multiline: true, minProperties: 6 } }],
        },
    }),
];
