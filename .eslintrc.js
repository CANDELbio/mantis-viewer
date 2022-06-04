/* eslint-disable no-undef */
module.exports = {
    parser: '@typescript-eslint/parser', // Specifies the ESLint parser
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'plugin:react/recommended', // Uses the recommended rules from @eslint-plugin-react
        'plugin:@typescript-eslint/recommended', // Uses the recommended rules from @typescript-eslint/eslint-plugin
        'plugin:prettier/recommended', // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
    ],
    parserOptions: {
        ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
        sourceType: 'module', // Allows for the use of imports
        ecmaFeatures: {
            jsx: true, // Allows for the parsing of JSX
        },
    },
    rules: {
        'import/order': [
            1,
            {
                groups: ['external', 'builtin', 'internal', 'sibling', 'parent', 'index'],
                pathGroups: [
                    {
                        pattern: 'components',
                        group: 'internal',
                    },
                    {
                        pattern: 'common',
                        group: 'internal',
                    },
                    {
                        pattern: 'routes/ **',
                        group: 'internal',
                    },
                    {
                        pattern: 'assets/**',
                        group: 'internal',
                        position: 'after',
                    },
                ],
                pathGroupsExcludedImportTypes: ['internal'],
                alphabetize: {
                    order: 'asc',
                    caseInsensitive: true,
                },
            },
        ],
        // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
        // e.g. "@typescript-eslint/explicit-function-return-type": "off",
    },
    settings: {
        react: {
            version: 'detect', // Tells eslint-plugin-react to automatically detect the version of React to use
        },
    },
}
