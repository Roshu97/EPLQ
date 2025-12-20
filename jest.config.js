/**
 * Jest Configuration
 */
export default {
    testEnvironment: 'node',
    transform: {},
    moduleFileExtensions: ['js', 'mjs'],
    testMatch: ['**/tests/**/*.test.js'],
    setupFilesAfterEnv: ['./tests/setup.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js',
        '!src/api/routes.js'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    verbose: true,
    testTimeout: 10000,
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    }
};

