import { Pool as PgPool } from 'pg';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
const dbType = process.env.DB_TYPE || 'postgresql'; // postgresql or mysql
let pool: PgPool | mysql.Pool;
let isConnected = false;

// Connection monitoring
let connectionCount = 0;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

// Initialize the appropriate database pool with optimized settings
if (dbType.toLowerCase() === 'mysql') {
  // MySQL configuration - optimized for performance
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'book_management',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
    queueLimit: 0
  });
} else {
  // PostgreSQL configuration - optimized for performance
  pool = new PgPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'book_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'toto1234567890',
    max: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
    min: 2, // Minimum pool size
    idleTimeoutMillis: 300000, // 5 minutes
    connectionTimeoutMillis: 10000, // 10 seconds
    maxUses: 7500, // Maximum uses per connection
    // Performance optimizations
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
    allowExitOnIdle: true,
    // Statement timeout
    statement_timeout: 30000, // 30 seconds
    query_timeout: 30000, // 30 seconds
    // Application name for monitoring
    application_name: 'book_management_system'
  });

  // Handle pool events for monitoring
  pool.on('connect', () => {
    connectionCount++;
    console.log(`📊 PostgreSQL connection established (active: ${connectionCount})`);
  });

  pool.on('remove', () => {
    connectionCount--;
    console.log(`📊 PostgreSQL connection removed (active: ${connectionCount})`);
  });

  pool.on('error', (err) => {
    console.error('❌ PostgreSQL pool error:', err);
    isConnected = false;
  });
}

// Optimized database query wrapper with connection health monitoring
export const query = async (text: string, params: any[] = []): Promise<any> => {
  // Periodic health check
  const now = Date.now();
  if (now - lastHealthCheck > HEALTH_CHECK_INTERVAL) {
    lastHealthCheck = now;
    // Don't await this to avoid blocking queries
    performHealthCheck().catch(console.error);
  }

  const startTime = Date.now();
  
  try {
    if (dbType.toLowerCase() === 'mysql') {
      const mysqlPool = pool as mysql.Pool;
      const [rows] = await mysqlPool.execute(text, params);
      
      // Log slow queries
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`🐌 Slow MySQL query (${duration}ms):`, text.substring(0, 100));
      }
      
      return { rows };
    } else {
      const pgPool = pool as PgPool;
      const result = await pgPool.query(text, params);
      
      // Log slow queries
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`🐌 Slow PostgreSQL query (${duration}ms):`, text.substring(0, 100));
      }
      
      return result;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Database query failed after ${duration}ms:`, {
      query: text.substring(0, 200),
      params: params.length,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};

// Periodic health check to maintain connection pool health
const performHealthCheck = async (): Promise<void> => {
  try {
    if (dbType.toLowerCase() === 'mysql') {
      const mysqlPool = pool as mysql.Pool;
      const connection = await mysqlPool.getConnection();
      await connection.ping();
      connection.release();
    } else {
      const pgPool = pool as PgPool;
      const client = await pgPool.connect();
      await client.query('SELECT 1');
      client.release();
    }
    
    if (!isConnected) {
      console.log('✅ Database connection restored');
      isConnected = true;
    }
  } catch (error) {
    if (isConnected) {
      console.error('❌ Database health check failed:', error instanceof Error ? error.message : String(error));
      isConnected = false;
    }
  }
};

// Test database connection with retry logic
export const testConnection = async (retries = 3): Promise<boolean> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (dbType.toLowerCase() === 'mysql') {
        const mysqlPool = pool as mysql.Pool;
        const connection = await mysqlPool.getConnection();
        await connection.ping();
        connection.release();
        console.log('✅ Connected to MySQL database successfully');
      } else {
        const pgPool = pool as PgPool;
        const client = await pgPool.connect();
        await client.query('SELECT version()');
        client.release();
        console.log('✅ Connected to PostgreSQL database successfully');
      }
      
      isConnected = true;
      return true;
    } catch (error) {
      console.error(`❌ ${dbType.toUpperCase()} database connection attempt ${attempt}/${retries} failed:`, error instanceof Error ? error.message : String(error));
      
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  isConnected = false;
  return false;
};

// Get connection status
export const getConnectionStatus = (): boolean => {
  return isConnected;
};

// Get database type
export const getDatabaseType = (): string => {
  return dbType;
};

// Get connection pool stats for monitoring
export const getPoolStats = () => {
  if (dbType.toLowerCase() === 'mysql') {
    const mysqlPool = pool as any;
    return {
      totalConnections: mysqlPool.pool?._allConnections?.length || 0,
      freeConnections: mysqlPool.pool?._freeConnections?.length || 0,
      queuedRequests: mysqlPool.pool?._connectionQueue?.length || 0
    };
  } else {
    const pgPool = pool as PgPool;
    return {
      totalConnections: pgPool.totalCount,
      idleConnections: pgPool.idleCount,
      waitingClients: pgPool.waitingCount
    };
  }
};

// Initialize database tables with optimized queries
export const initDatabase = async (): Promise<boolean> => {
  try {
    if (dbType.toLowerCase() === 'mysql') {
      // MySQL table creation with optimized indexes
      await query(`
        CREATE TABLE IF NOT EXISTS books (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          author VARCHAR(255) NOT NULL,
          published_year INT,
          genre VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          -- Optimized indexes for common queries
          INDEX idx_title (title(50)),
          INDEX idx_author (author(50)),
          INDEX idx_genre (genre),
          INDEX idx_year (published_year),
          INDEX idx_created (created_at),
          INDEX idx_search (title(50), author(50)) -- Composite index for search
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // MySQL users table with optimized indexes
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          role ENUM('admin', 'user') DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          -- Optimized indexes
          INDEX idx_email (email),
          INDEX idx_username (username),
          INDEX idx_role (role)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } else {
      // PostgreSQL table creation with optimized indexes
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

      // Create optimized indexes for PostgreSQL
      await query(`
        CREATE INDEX IF NOT EXISTS idx_books_title ON books USING btree (title);
        CREATE INDEX IF NOT EXISTS idx_books_author ON books USING btree (author);
        CREATE INDEX IF NOT EXISTS idx_books_genre ON books USING btree (genre);
        CREATE INDEX IF NOT EXISTS idx_books_year ON books USING btree (published_year);
        CREATE INDEX IF NOT EXISTS idx_books_created ON books USING btree (created_at);
        CREATE INDEX IF NOT EXISTS idx_books_search ON books USING gin (to_tsvector('english', title || ' ' || author));
      `);

      // PostgreSQL users table
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create optimized indexes for users
      await query(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users USING btree (email);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users USING btree (username);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users USING btree (role);
      `);

      // Create trigger for updated_at
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
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);

      await query(`
        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
        CREATE TRIGGER update_users_updated_at
          BEFORE UPDATE ON users
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    console.log('✅ Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error initializing database tables:', error);
    return false;
  }
};

// Graceful shutdown function
export const closePool = async (): Promise<void> => {
  try {
    if (dbType.toLowerCase() === 'mysql') {
      const mysqlPool = pool as mysql.Pool;
      await mysqlPool.end();
    } else {
      const pgPool = pool as PgPool;
      await pgPool.end();
    }
    console.log('✅ Database pool closed gracefully');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
  }
};

// Handle process termination
process.on('SIGINT', closePool);
process.on('SIGTERM', closePool);

export default pool; 