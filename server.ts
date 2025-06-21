import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { testConnection, initDatabase, getConnectionStatus, getDatabaseType } from './config/database';
import bookRoutes from './routes/bookRoutes';
import authRoutes from './routes/authRoutes';
import dbStatusRoutes from './routes/dbStatus';
import { BookService } from './services/BookService';

// Import logging
import { logInfo, logError } from './config/logger';
import { httpLogger, responseTimeMiddleware, errorLogger } from './middleware/loggingMiddleware';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware with production optimizations
app.use(responseTimeMiddleware); // Add response time tracking
app.use(httpLogger); // HTTP request logging
app.use(cors());
app.use(express.json({ limit: '1mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Limit URL-encoded payload size

// Static file serving with caching
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('public', {
    maxAge: '1d', // Cache static files for 1 day
    etag: true,
    lastModified: true
  }));
} else {
  app.use(express.static('public'));
}

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// API Routes
app.use('/api/books', bookRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/db', dbStatusRoutes);

// Frontend Routes
app.get('/', async (req, res) => {
  const isDbConnected = getConnectionStatus();
  
  if (!isDbConnected) {
    res.render('index', { 
      title: 'Book Management System',
      stats: { totalBooks: 0, totalAuthors: 0, totalGenres: 0, recentBooks: 0 },
      dbConnected: false
    });
    return;
  }

  try {
    const stats = await BookService.getStats();
    
    res.render('index', { 
      title: 'Book Management System',
      stats,
      dbConnected: true
    });
  } catch (error) {
    logError('Error loading dashboard', error);
    res.render('index', { 
      title: 'Book Management System',
      stats: { totalBooks: 0, totalAuthors: 0, totalGenres: 0, recentBooks: 0 },
      dbConnected: false
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use(errorLogger); // Log errors with request context
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logError('Unhandled error', error);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Initialize database and start server
async function startServer() {
  logInfo('Starting Book Management System server...');
  
  // Test database connection
  const dbConnected = await testConnection();
  
  if (dbConnected) {
    // Initialize database tables
    await initDatabase();
    logInfo('Database connected and initialized successfully');
  } else {
    logError('Server starting without database connection');
  }
  
  // Start server regardless of database status
  app.listen(port, () => {
    logInfo(`Server running at http://localhost:${port}`, {
      port,
      databaseType: getDatabaseType().toUpperCase(),
      databaseConnected: dbConnected,
      nodeEnv: process.env.NODE_ENV || 'development'
    });
    
    if (dbConnected) {
      logInfo('Book Management System is ready!');
    } else {
      logError('Book Management System started with limited functionality (no database)');
    }
  });
}

startServer();
