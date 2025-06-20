import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { testConnection, initDatabase, getConnectionStatus, getDatabaseType } from './config/database';
import bookRoutes from './routes/bookRoutes';
import authRoutes from './routes/authRoutes';
import dbStatusRoutes from './routes/dbStatus';
import { BookService } from './models/BookService';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

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
      genres: [],
      authors: [],
      dbConnected: false
    });
    return;
  }

  try {
    const stats = await BookService.getStats();
    const genres = await BookService.getGenres();
    const authors = await BookService.getAuthors();
    
    res.render('index', { 
      title: 'Book Management System',
      stats,
      genres,
      authors,
      dbConnected: true
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.render('index', { 
      title: 'Book Management System',
      stats: { totalBooks: 0, totalAuthors: 0, totalGenres: 0, recentBooks: 0 },
      genres: [],
      authors: [],
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
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Initialize database and start server
async function startServer() {
  // Test database connection
  const dbConnected = await testConnection();
  
  if (dbConnected) {
    // Initialize database tables
    await initDatabase();
  } else {
    console.log('⚠️  Server will start without database connection');
  }
  
  // Start server regardless of database status
  app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`🗄️  Database type: ${getDatabaseType().toUpperCase()}`);
    if (dbConnected) {
      console.log(`📚 Book Management System is ready!`);
    } else {
      console.log(`⚠️  Book Management System started with limited functionality (no database)`);
    }
  });
}

startServer();
