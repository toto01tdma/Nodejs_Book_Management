import { Pool as PgPool } from 'pg';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
const dbType = process.env.DB_TYPE || 'postgresql'; // postgresql or mysql
let pool: PgPool | mysql.Pool;
let isConnected = false;

// Initialize the appropriate database pool
if (dbType.toLowerCase() === 'mysql') {
  // MySQL configuration
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'book_management',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
} else {
  // PostgreSQL configuration (default)
  pool = new PgPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'book_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'toto1234567890',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

// Database query wrapper
export const query = async (text: string, params: any[] = []): Promise<any> => {
  if (dbType.toLowerCase() === 'mysql') {
    const mysqlPool = pool as mysql.Pool;
    const [rows] = await mysqlPool.execute(text, params);
    return { rows };
  } else {
    const pgPool = pool as PgPool;
    return await pgPool.query(text, params);
  }
};

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    if (dbType.toLowerCase() === 'mysql') {
      const mysqlPool = pool as mysql.Pool;
      const connection = await mysqlPool.getConnection();
      console.log('✅ Connected to MySQL database successfully');
      connection.release();
    } else {
      const pgPool = pool as PgPool;
      const client = await pgPool.connect();
      console.log('✅ Connected to PostgreSQL database successfully');
      client.release();
    }
    isConnected = true;
    return true;
  } catch (error) {
    console.error(`❌ ${dbType.toUpperCase()} database connection failed:`, error);
    isConnected = false;
    return false;
  }
};

// Get connection status
export const getConnectionStatus = (): boolean => {
  return isConnected;
};

// Get database type
export const getDatabaseType = (): string => {
  return dbType;
};

// Initialize database tables
export const initDatabase = async (): Promise<boolean> => {
  try {
    if (dbType.toLowerCase() === 'mysql') {
      // MySQL table creation
      await query(`
        CREATE TABLE IF NOT EXISTS books (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          author VARCHAR(255) NOT NULL,
          published_year INT,
          genre VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
    } else {
      // PostgreSQL table creation
      await query(`
        CREATE TABLE IF NOT EXISTS books (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          author VARCHAR(255) NOT NULL,
          published_year INTEGER,
          genre VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create trigger for updated_at (PostgreSQL only)
      await query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      await query(`
        DROP TRIGGER IF EXISTS update_books_updated_at ON books;
        CREATE TRIGGER update_books_updated_at 
          BEFORE UPDATE ON books 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    console.log(`✅ ${dbType.toUpperCase()} database tables initialized successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${dbType.toUpperCase()} database initialization failed:`, error);
    return false;
  }
};

export default pool; 