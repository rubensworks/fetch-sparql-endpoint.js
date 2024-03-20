const config = require('@rubensworks/eslint-config');

module.exports = config([
  {
    files: [ '**/*.ts' ],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: [ './tsconfig.eslint.json' ],
      },
    },
  },
  {
    files: [ '**/*.ts', 'webpack.config.js' ],
    rules: {
      'import/no-nodejs-modules': 'off',
      // The naming convention rules complain about the public static properties, as well
      'ts/naming-convention': 'off',
    },
  },
  {
    // The readme contains examples with console logging
    files: [ 'README.md/*' ],
    rules: {
      'no-console': 'off',
    },
  },
]);
