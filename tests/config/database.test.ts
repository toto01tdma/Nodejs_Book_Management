import { getDatabaseType, getConnectionStatus } from '../../config/database';

// Mock environment variables
const originalEnv = process.env;

describe('Database Configuration', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getDatabaseType', () => {
    it('should return postgresql by default', () => {
      delete process.env.DB_TYPE;
      const { getDatabaseType } = require('../../config/database');
      
      expect(getDatabaseType()).toBe('postgresql');
    });

    it('should return configured database type', () => {
      process.env.DB_TYPE = 'mysql';
      const { getDatabaseType } = require('../../config/database');
      
      expect(getDatabaseType()).toBe('mysql');
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connection status', () => {
      // This test would need actual database connection to be meaningful
      // In a real scenario, you'd mock the connection status
      expect(typeof getConnectionStatus()).toBe('boolean');
    });
  });
}); 