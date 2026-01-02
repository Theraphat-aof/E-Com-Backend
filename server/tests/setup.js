require('dotenv').config({ path: '.env.test' });

// Mock database if needed
jest.mock('../config/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  release: jest.fn()
}));

// Global timeout
jest.setTimeout(10000);

// Suppress console logs during tests
if (process.env.SUPPRESS_LOGS === 'true') {
  global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };
}
