import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { BookService } from '../services/BookService';
import { requireDatabase } from '../middleware/dbMiddleware';
import { authenticateToken, optionalAuth } from '../middleware/authMiddleware';

const router: express.Router = express.Router();

// Validation middleware
const validateBook = [
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('author').trim().isLength({ min: 1 }).withMessage('Author is required'),
  body('published_year').optional().isInt({ min: 1000, max: new Date().getFullYear() }).withMessage('Published year must be a valid year'),
  body('genre').optional().trim().isLength({ max: 100 }).withMessage('Genre must be less than 100 characters'),
];

const validateBookUpdate = [
  body('title').optional().trim().isLength({ min: 1 }).withMessage('Title cannot be empty'),
  body('author').optional().trim().isLength({ min: 1 }).withMessage('Author cannot be empty'),
  body('published_year').optional().isInt({ min: 1000, max: new Date().getFullYear() }).withMessage('Published year must be a valid year'),
  body('genre').optional().trim().isLength({ max: 100 }).withMessage('Genre must be less than 100 characters'),
];

const validateId = [
  param('id').isInt({ min: 1 }).withMessage('Invalid book ID'),
];

// Error handling middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ 
      success: false, 
      message: 'Validation failed', 
      errors: errors.array() 
    });
    return;
  }
  next();
};

// GET /api/books/stats - Get books statistics
router.get('/stats', requireDatabase, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const stats = await BookService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/books/filters/genres - Get all unique genres
router.get('/filters/genres', requireDatabase, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const genres = await BookService.getGenres();
    res.json({ success: true, data: genres });
  } catch (error) {
    console.error('Error fetching genres:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/books/filters/authors - Get all unique authors
router.get('/filters/authors', requireDatabase, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const authors = await BookService.getAuthors();
    res.json({ success: true, data: authors });
  } catch (error) {
    console.error('Error fetching authors:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/books - Get all books with filtering and pagination
router.get('/', [
  requireDatabase,
  optionalAuth,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim(),
  query('genre').optional().custom((value) => {
    if (Array.isArray(value)) {
      return value.every(item => typeof item === 'string' && item.trim().length > 0);
    }
    return typeof value === 'string';
  }).withMessage('Genre must be a string or array of strings'),
  query('author').optional().custom((value) => {
    if (Array.isArray(value)) {
      return value.every(item => typeof item === 'string' && item.trim().length > 0);
    }
    return typeof value === 'string';
  }).withMessage('Author must be a string or array of strings'),
  query('year').optional().isInt().withMessage('Year must be a number'),
  handleValidationErrors
], async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Parse genre and author filters (can be arrays)
    const parseArrayParam = (param: any): string | string[] | undefined => {
      if (!param) return undefined;
      if (Array.isArray(param)) return param.filter(Boolean);
      return param;
    };

    const filters = {
      search: req.query.search as string,
      genre: parseArrayParam(req.query.genre),
      author: parseArrayParam(req.query.author),
      year: req.query.year ? parseInt(req.query.year as string) : undefined,
      limit,
      offset
    };

    const result = await BookService.getAllBooks(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/books/:id - Get a single book
router.get('/:id', requireDatabase, validateId, handleValidationErrors, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const book = await BookService.getBookById(id);
    
    if (!book) {
      res.status(404).json({ success: false, message: 'Book not found' });
      return;
    }
    
    res.json({ success: true, data: book });
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/books - Create a new book (authentication required)
router.post('/', requireDatabase, authenticateToken, validateBook, handleValidationErrors, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const bookData = {
      title: req.body.title,
      author: req.body.author,
      published_year: req.body.published_year,
      genre: req.body.genre
    };

    const newBook = await BookService.createBook(bookData);
    res.status(201).json({ success: true, data: newBook, message: 'Book created successfully' });
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/books/:id - Update a book (authentication required)
router.put('/:id', requireDatabase, authenticateToken, [...validateId, ...validateBookUpdate], handleValidationErrors, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const updateData = {
      title: req.body.title,
      author: req.body.author,
      published_year: req.body.published_year,
      genre: req.body.genre
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    const updatedBook = await BookService.updateBook(id, updateData);
    
    if (!updatedBook) {
      res.status(404).json({ success: false, message: 'Book not found' });
      return;
    }
    
    res.json({ success: true, data: updatedBook, message: 'Book updated successfully' });
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/books/:id - Delete a book (authentication required)
router.delete('/:id', requireDatabase, authenticateToken, validateId, handleValidationErrors, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await BookService.deleteBook(id);
    
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Book not found' });
      return;
    }
    
    res.json({ success: true, message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router; 