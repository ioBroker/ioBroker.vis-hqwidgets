import config, { reactConfig } from '@iobroker/eslint-config';

export default [
    ...config,
    ...reactConfig,
    {
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['*.js', '*.mjs'],
                },
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        files: ['**/*.js'],
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
    {
        // `widgets/` holds the hand-maintained vis-1 widget set plus the generated vis-2 bundle
        ignores: [
            'widgets/**/*',
            'test/**/*',
            'src-widgets/build/**/*',
            'src-widgets/node_modules/**/*',
            'src-widgets/.__mf__temp/**/*',
            'src-widgets/vite.config.*',
            'src-widgets/checkWidgets.mjs',
            'src-widgets/preview/**/*',
            'src-widgets/public/**/*',
        ],
    },
    {
        // disable temporary the rule 'jsdoc/require-param' and enable 'jsdoc/require-jsdoc'
        rules: {
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/require-param': 'off',
            'prettier/prettier': [
                'error',
                {
                    endOfLine: 'auto',
                },
            ],
        },
    },
];
