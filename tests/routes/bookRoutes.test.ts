import request from 'supertest';
import express from 'express';
import bookRoutes from '../../routes/bookRoutes';
import { BookService } from '../../services/BookService';

// Mock dependencies
jest.mock('../../services/BookService');
jest.mock('../../middleware/dbMiddleware', () => ({
  requireDatabase: (req: any, res: any, next: any) => next()
}));
jest.mock('../../middleware/authMiddleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { userId: 1, username: 'testuser', role: 'user' };
    next();
  },
  optionalAuth: (req: any, res: any, next: any) => next()
}));

const mockBookService = BookService as jest.Mocked<typeof BookService>;

// Create test app
const app = express();
app.use(express.json());
app.use('/api/books', bookRoutes);

describe('Book Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/books', () => {
    it('should return paginated books', async () => {
      const mockResult = {
        data: [
          {
            id: 1,
            title: 'Test Book',
            author: 'Test Author',
            published_year: 2023,
            genre: 'Fiction',
            created_at: new Date(),
            updated_at: new Date()
          }
        ],
        total: 1,
        page: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      };

      mockBookService.getAllBooks.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/books')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            title: 'Test Book',
            author: 'Test Author',
            genre: 'Fiction',
            published_year: 2023,
            created_at: expect.any(String),
            updated_at: expect.any(String)
          })
        ]),
        total: 1,
        page: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      });
    });

    it('should handle query parameters', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      };

      mockBookService.getAllBooks.mockResolvedValue(mockResult);

      await request(app)
        .get('/api/books')
        .query({
          page: '2',
          limit: '5',
          search: 'test',
          genre: 'Fiction',
          author: 'Test Author',
          year: '2023'
        })
        .expect(200);

      expect(mockBookService.getAllBooks).toHaveBeenCalledWith({
        search: 'test',
        genre: 'Fiction',
        author: 'Test Author',
        year: 2023,
        limit: 5,
        offset: 5
      });
    });

    it('should handle array parameters for genre and author', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      };

      mockBookService.getAllBooks.mockResolvedValue(mockResult);

      await request(app)
        .get('/api/books')
        .query('genre=Fiction&genre=Mystery&author=Author1&author=Author2')
        .expect(200);

      expect(mockBookService.getAllBooks).toHaveBeenCalledWith({
        search: undefined,
        genre: ['Fiction', 'Mystery'],
        author: ['Author1', 'Author2'],
        year: undefined,
        limit: 10,
        offset: 0
      });
    });

    it('should handle validation errors', async () => {
      await request(app)
        .get('/api/books')
        .query({ page: '0', limit: '101' })
        .expect(400);
    });
  });

  describe('GET /api/books/:id', () => {
    it('should return a single book', async () => {
      const mockBook = {
        id: 1,
        title: 'Test Book',
        author: 'Test Author',
        published_year: 2023,
        genre: 'Fiction',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockBookService.getBookById.mockResolvedValue(mockBook);

      const response = await request(app)
        .get('/api/books/1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: 1,
          title: 'Test Book'
        })
      });
    });

    it('should return 404 for non-existent book', async () => {
      mockBookService.getBookById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/books/999')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Book not found'
      });
    });

    it('should validate book ID parameter', async () => {
      await request(app)
        .get('/api/books/invalid')
        .expect(400);
    });
  });

  describe('POST /api/books', () => {
    it('should create a new book', async () => {
      const bookData = {
        title: 'New Book',
        author: 'New Author',
        published_year: 2023,
        genre: 'Fiction'
      };

      const mockCreatedBook = {
        id: 1,
        ...bookData,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockBookService.createBook.mockResolvedValue(mockCreatedBook);

      const response = await request(app)
        .post('/api/books')
        .send(bookData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: 1,
          title: 'New Book'
        }),
        message: 'Book created successfully'
      });
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/books')
        .send({})
        .expect(400);
    });

    it('should validate published year', async () => {
      await request(app)
        .post('/api/books')
        .send({
          title: 'Test Book',
          author: 'Test Author',
          published_year: 999
        })
        .expect(400);
    });
  });

  describe('PUT /api/books/:id', () => {
    it('should update an existing book', async () => {
      const updateData = {
        title: 'Updated Title',
        published_year: 2024
      };

      const mockUpdatedBook = {
        id: 1,
        title: 'Updated Title',
        author: 'Original Author',
        published_year: 2024,
        genre: 'Fiction',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockBookService.updateBook.mockResolvedValue(mockUpdatedBook);

      const response = await request(app)
        .put('/api/books/1')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: 1,
          title: 'Updated Title'
        }),
        message: 'Book updated successfully'
      });
    });

    it('should return 404 for non-existent book', async () => {
      mockBookService.updateBook.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/books/999')
        .send({ title: 'New Title' })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Book not found'
      });
    });
  });

  describe('DELETE /api/books/:id', () => {
    it('should delete an existing book', async () => {
      mockBookService.deleteBook.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/books/1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Book deleted successfully'
      });
    });

    it('should return 404 for non-existent book', async () => {
      mockBookService.deleteBook.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/books/999')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Book not found'
      });
    });
  });

  describe('GET /api/books/filters/genres', () => {
    it('should return unique genres', async () => {
      const mockGenres = ['Fiction', 'Non-Fiction', 'Mystery'];
      mockBookService.getGenres.mockResolvedValue(mockGenres);

      const response = await request(app)
        .get('/api/books/filters/genres')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockGenres
      });
    });
  });

  describe('GET /api/books/filters/authors', () => {
    it('should return unique authors', async () => {
      const mockAuthors = ['Author 1', 'Author 2', 'Author 3'];
      mockBookService.getAuthors.mockResolvedValue(mockAuthors);

      const response = await request(app)
        .get('/api/books/filters/authors')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockAuthors
      });
    });
  });

  describe('GET /api/books/stats', () => {
    it('should return book statistics', async () => {
      const mockStats = {
        totalBooks: 10,
        totalAuthors: 5,
        totalGenres: 3,
        recentBooks: 2
      };

      mockBookService.getStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/books/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStats
      });
    });
  });
}); 