/**
 * Jest Test Setup
 * Configuration for ES Modules testing environment
 */

// Mock performance.now for Node.js environment
if (typeof performance === 'undefined') {
    global.performance = {
        now: () => Date.now()
    };
}

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_MASTER_KEY = 'test-master-key-for-testing-only';
process.env.LOG_LEVEL = 'error';
process.env.LOG_TO_FIREBASE = 'false';

