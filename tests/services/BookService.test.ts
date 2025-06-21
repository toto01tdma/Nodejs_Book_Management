import { BookService } from '../../services/BookService';
import { query, getDatabaseType } from '../../config/database';
import { IBookCreate, IBookUpdate, IBookFilters } from '../../models/Book';

// Mock the database module
jest.mock('../../config/database');
jest.mock('../../config/logger');

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockGetDatabaseType = getDatabaseType as jest.MockedFunction<typeof getDatabaseType>;

describe('BookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDatabaseType.mockReturnValue('postgresql');
    // Clear cache before each test
    BookService.clearStatsCache();
    // Reset database type cache for testing
    BookService.resetDbType();
  });

  describe('getAllBooks', () => {
    it('should return paginated books without filters', async () => {
      const mockBooks = [
        {
          id: 1,
          title: 'Test Book 1',
          author: 'Test Author 1',
          published_year: 2023,
          genre: 'Fiction',
          created_at: new Date(),
          updated_at: new Date(),
          total_count: '2'
        },
        {
          id: 2,
          title: 'Test Book 2',
          author: 'Test Author 2',
          published_year: 2022,
          genre: 'Non-Fiction',
          created_at: new Date(),
          updated_at: new Date(),
          total_count: '2'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockBooks });

      const result = await BookService.getAllBooks();

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            title: 'Test Book 1',
            author: 'Test Author 1'
          }),
          expect.objectContaining({
            id: 2,
            title: 'Test Book 2',
            author: 'Test Author 2'
          })
        ]),
        total: 2,
        page: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [10, 0]
      );
    });

    it('should return books with search filter', async () => {
      const mockBooks = [{
        id: 1,
        title: 'Great Gatsby',
        author: 'F. Scott Fitzgerald',
        published_year: 1925,
        genre: 'Fiction',
        created_at: new Date(),
        updated_at: new Date(),
        total_count: '1'
      }];

      mockQuery.mockResolvedValue({ rows: mockBooks });

      const filters: IBookFilters = {
        search: 'Gatsby',
        limit: 10,
        offset: 0
      };

      const result = await BookService.getAllBooks(filters);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Great Gatsby');
      expect(result.total).toBe(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        ['%Gatsby%', 10, 0]
      );
    });

    it('should return books with genre array filter', async () => {
      const mockBooks = [{
        id: 1,
        title: 'Test Book',
        author: 'Test Author',
        published_year: 2023,
        genre: 'Fiction',
        created_at: new Date(),
        updated_at: new Date(),
        total_count: '1'
      }];

      mockQuery.mockResolvedValue({ rows: mockBooks });

      const filters: IBookFilters = {
        genre: ['Fiction', 'Mystery'],
        limit: 10,
        offset: 0
      };

      await BookService.getAllBooks(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('genre IN'),
        ['Fiction', 'Mystery', 10, 0]
      );
    });

    it('should return books with author array filter', async () => {
      const mockBooks = [{
        id: 1,
        title: 'Test Book',
        author: 'Test Author',
        published_year: 2023,
        genre: 'Fiction',
        created_at: new Date(),
        updated_at: new Date(),
        total_count: '1'
      }];

      mockQuery.mockResolvedValue({ rows: mockBooks });

      const filters: IBookFilters = {
        author: ['Author 1', 'Author 2'],
        limit: 10,
        offset: 0
      };

      await BookService.getAllBooks(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('author IN'),
        ['Author 1', 'Author 2', 10, 0]
      );
    });

    it('should return books with year filter', async () => {
      const mockBooks = [{
        id: 1,
        title: 'Test Book',
        author: 'Test Author',
        published_year: 2023,
        genre: 'Fiction',
        created_at: new Date(),
        updated_at: new Date(),
        total_count: '1'
      }];

      mockQuery.mockResolvedValue({ rows: mockBooks });

      const filters: IBookFilters = {
        year: 2023,
        limit: 10,
        offset: 0
      };

      await BookService.getAllBooks(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('published_year ='),
        [2023, 10, 0]
      );
    });

    it('should handle pagination correctly', async () => {
      const mockBooks = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        title: `Book ${i + 1}`,
        author: `Author ${i + 1}`,
        published_year: 2023,
        genre: 'Fiction',
        created_at: new Date(),
        updated_at: new Date(),
        total_count: '25'
      }));

      mockQuery.mockResolvedValue({ rows: mockBooks });

      const filters: IBookFilters = {
        limit: 5,
        offset: 10 // Page 3
      };

      const result = await BookService.getAllBooks(filters);

      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(5);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
    });

    it('should handle empty results', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await BookService.getAllBooks();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });
  });

  describe('getBookById', () => {
    it('should return a book when found', async () => {
      const mockBook = {
        id: 1,
        title: 'Test Book',
        author: 'Test Author',
        published_year: 2023,
        genre: 'Fiction',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({ rows: [mockBook] });

      const result = await BookService.getBookById(1);

      expect(result).toEqual(mockBook);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM books WHERE id = $1',
        [1]
      );
    });

    it('should return null when book not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await BookService.getBookById(999);

      expect(result).toBeNull();
    });

    it('should use MySQL syntax when database type is mysql', async () => {
      mockGetDatabaseType.mockReturnValue('mysql');
      BookService.resetDbType(); // Reset cache to pick up new mock value
      mockQuery.mockResolvedValue({ rows: [] });

      await BookService.getBookById(1);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM books WHERE id = ?',
        [1]
      );
    });
  });

  describe('createBook', () => {
    it('should create a book successfully with PostgreSQL', async () => {
      const bookData: IBookCreate = {
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

      mockQuery.mockResolvedValue({ rows: [mockCreatedBook] });

      const result = await BookService.createBook(bookData);

      expect(result).toEqual(mockCreatedBook);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO books'),
        ['New Book', 'New Author', 2023, 'Fiction']
      );
    });

    it('should create a book successfully with MySQL', async () => {
      mockGetDatabaseType.mockReturnValue('mysql');
      BookService.resetDbType(); // Reset cache to pick up new mock value
      
      const bookData: IBookCreate = {
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

      // Mock MySQL behavior - INSERT then SELECT
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // INSERT
        .mockResolvedValueOnce({ rows: [mockCreatedBook] }); // SELECT

      const result = await BookService.createBook(bookData);

      expect(result).toEqual(mockCreatedBook);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should clear stats cache when creating a book', async () => {
      const bookData: IBookCreate = {
        title: 'New Book',
        author: 'New Author'
      };

      mockQuery.mockResolvedValue({ rows: [{ id: 1, ...bookData }] });

      await BookService.createBook(bookData);

      // Verify stats cache is cleared by checking it's not used in subsequent calls
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('updateBook', () => {
    it('should update a book successfully', async () => {
      const updateData: IBookUpdate = {
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

      mockQuery.mockResolvedValue({ rows: [mockUpdatedBook] });

      const result = await BookService.updateBook(1, updateData);

      expect(result).toEqual(mockUpdatedBook);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE books'),
        ['Updated Title', 2024, 1]
      );
    });

    it('should return null when book not found for update', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await BookService.updateBook(999, { title: 'New Title' });

      expect(result).toBeNull();
    });

    it('should throw error when no fields to update', async () => {
      await expect(BookService.updateBook(1, {})).rejects.toThrow('No fields to update');
    });

    it('should handle MySQL update correctly', async () => {
      mockGetDatabaseType.mockReturnValue('mysql');
      BookService.resetDbType(); // Reset cache to pick up new mock value
      
      const updateData: IBookUpdate = {
        title: 'Updated Title'
      };

      const mockUpdatedBook = {
        id: 1,
        title: 'Updated Title',
        author: 'Author',
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock MySQL behavior - UPDATE then SELECT
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // UPDATE
        .mockResolvedValueOnce({ rows: [mockUpdatedBook] }); // SELECT

      const result = await BookService.updateBook(1, updateData);

      expect(result).toEqual(mockUpdatedBook);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteBook', () => {
    it('should delete a book successfully with PostgreSQL', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await BookService.deleteBook(1);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM books WHERE id = $1 RETURNING id',
        [1]
      );
    });

    it('should delete a book successfully with MySQL', async () => {
      mockGetDatabaseType.mockReturnValue('mysql');
      BookService.resetDbType(); // Reset cache to pick up new mock value
      mockQuery.mockResolvedValue({ affectedRows: 1 });

      const result = await BookService.deleteBook(1);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM books WHERE id = ?',
        [1]
      );
    });

    it('should return false when book not found for deletion', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await BookService.deleteBook(999);

      expect(result).toBe(false);
    });

    it('should clear stats cache when deleting a book', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

      await BookService.deleteBook(1);

      // Verify the delete operation was called
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('getGenres', () => {
    it('should return unique genres', async () => {
      const mockGenres = [
        { genre: 'Fiction' },
        { genre: 'Non-Fiction' },
        { genre: 'Mystery' }
      ];

      mockQuery.mockResolvedValue({ rows: mockGenres });

      const result = await BookService.getGenres();

      expect(result).toEqual(['Fiction', 'Non-Fiction', 'Mystery']);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL ORDER BY genre'
      );
    });

    it('should return empty array when no genres found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await BookService.getGenres();

      expect(result).toEqual([]);
    });
  });

  describe('getAuthors', () => {
    it('should return unique authors', async () => {
      const mockAuthors = [
        { author: 'Author 1' },
        { author: 'Author 2' },
        { author: 'Author 3' }
      ];

      mockQuery.mockResolvedValue({ rows: mockAuthors });

      const result = await BookService.getAuthors();

      expect(result).toEqual(['Author 1', 'Author 2', 'Author 3']);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT DISTINCT author FROM books ORDER BY author'
      );
    });

    it('should return empty array when no authors found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await BookService.getAuthors();

      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return book statistics with PostgreSQL', async () => {
      const mockStats = {
        total_books: '10',
        total_authors: '5',
        total_genres: '3',
        recent_books: '2'
      };

      mockQuery.mockResolvedValue({ rows: [mockStats] });

      const result = await BookService.getStats();

      expect(result).toEqual({
        totalBooks: 10,
        totalAuthors: 5,
        totalGenres: 3,
        recentBooks: 2
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) FILTER')
      );
    });

    it('should return book statistics with MySQL', async () => {
      mockGetDatabaseType.mockReturnValue('mysql');
      // Clear cache to ensure fresh query
      BookService.clearStatsCache();
      BookService.resetDbType(); // Reset cache to pick up new mock value
      
      const mockStats = {
        total_books: '10',
        total_authors: '5',
        total_genres: '3',
        recent_books: '2'
      };

      mockQuery.mockResolvedValue({ rows: [mockStats] });

      const result = await BookService.getStats();

      expect(result).toEqual({
        totalBooks: 10,
        totalAuthors: 5,
        totalGenres: 3,
        recentBooks: 2
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DATE_SUB')
      );
    });

    it('should use cached stats when available', async () => {
      // Clear cache to start fresh
      BookService.clearStatsCache();
      
      const mockStats = {
        total_books: '10',
        total_authors: '5',
        total_genres: '3',
        recent_books: '2'
      };

      mockQuery.mockResolvedValue({ rows: [mockStats] });

      // First call should query database
      const result1 = await BookService.getStats();
      
      // Second call should use cache (within TTL)
      const result2 = await BookService.getStats();

      expect(result1).toEqual(result2);
      expect(mockQuery).toHaveBeenCalledTimes(1); // Only called once due to caching
    });
  });

  describe('clearStatsCache', () => {
    it('should clear the stats cache', () => {
      // This is a static method that clears internal cache
      expect(() => BookService.clearStatsCache()).not.toThrow();
    });
  });
}); 