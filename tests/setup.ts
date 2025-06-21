import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DB_TYPE = 'postgresql';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'book_management_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'test';
process.env.DB_CONNECTION_LIMIT = '2';
process.env.LOG_LEVEL = 'error';

export {}; 