/** @type {import('jest').Config} */
module.exports = {
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  transformIgnorePatterns: [
    '[/\\\\]node_modules[/\\\\].+\\.(js|jsx)$',
  ],
  testRegex: '(/test/.*|(\\.|/)(test|spec))\\.ts$',
  moduleFileExtensions: [
    'ts',
    'js',
  ],
  collectCoverage: true,
  setupFilesAfterEnv: [
    'jest-rdf',
  ],
  testEnvironment: 'node',
};
