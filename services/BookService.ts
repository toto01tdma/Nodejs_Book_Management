import { query, getDatabaseType } from '../config/database';
import { IBook, IBookCreate, IBookUpdate, IBookFilters, IPaginatedResult } from '../models/Book';
import { logPerformance } from '../config/logger';

export class BookService {
  // Cache database type to avoid repeated calls
  private static dbType: string | null = null;
  private static statsCache: { data: any; timestamp: number } | null = null;
  private static readonly STATS_CACHE_TTL = 60000; // 1 minute cache

  private static getDbType(): string {
    if (!this.dbType) {
      this.dbType = getDatabaseType().toLowerCase();
    }
    return this.dbType;
  }

  // Reset database type cache (for testing)
  static resetDbType(): void {
    this.dbType = null;
  }

  // Get all books with optional filters and pagination
  static async getAllBooks(filters: IBookFilters = {}): Promise<IPaginatedResult<IBook>> {
    const startTime = Date.now();
    const {
      search = '',
      genre = '',
      author = '',
      year,
      limit = 10,
      offset = 0
    } = filters;

    const page = Math.floor(offset / limit) + 1;
    const isMySQL = this.getDbType() === 'mysql';

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    // Build WHERE conditions dynamically (optimized)
    if (search) {
      const placeholder = isMySQL ? '?' : `$${paramIndex}`;
      whereConditions.push(`(title ILIKE ${placeholder} OR author ILIKE ${placeholder})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (genre) {
      if (Array.isArray(genre) && genre.length > 0) {
        const genrePlaceholders = genre.map(() => {
          const placeholder = isMySQL ? '?' : `$${paramIndex++}`;
          return placeholder;
        });
        whereConditions.push(`genre IN (${genrePlaceholders.join(', ')})`);
        queryParams.push(...genre);
      } else if (typeof genre === 'string') {
        const placeholder = isMySQL ? '?' : `$${paramIndex}`;
        whereConditions.push(`genre ILIKE ${placeholder}`);
        queryParams.push(`%${genre}%`);
        paramIndex++;
      }
    }

    if (author) {
      if (Array.isArray(author) && author.length > 0) {
        const authorPlaceholders = author.map(() => {
          const placeholder = isMySQL ? '?' : `$${paramIndex++}`;
          return placeholder;
        });
        whereConditions.push(`author IN (${authorPlaceholders.join(', ')})`);
        queryParams.push(...author);
      } else if (typeof author === 'string') {
        const placeholder = isMySQL ? '?' : `$${paramIndex}`;
        whereConditions.push(`author ILIKE ${placeholder}`);
        queryParams.push(`%${author}%`);
        paramIndex++;
      }
    }

    if (year) {
      const placeholder = isMySQL ? '?' : `$${paramIndex}`;
      whereConditions.push(`published_year = ${placeholder}`);
      queryParams.push(year);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Single optimized query for both count and data
    let combinedQuery: string;
    const limitParams = [...queryParams];
    
    if (isMySQL) {
      combinedQuery = `
        SELECT 
          books.*,
          COUNT(*) OVER() as total_count
        FROM books 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;
    } else {
      combinedQuery = `
        SELECT 
          books.*,
          COUNT(*) OVER() as total_count
        FROM books 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
    }
    limitParams.push(limit, offset);

    const result = await query(combinedQuery, limitParams);
    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(total / limit);

    // Remove total_count from each row
    const books = result.rows.map(({ total_count, ...book }: any) => book);

    logPerformance('getAllBooks', startTime, { 
      filters, 
      resultCount: books.length, 
      total 
    });

    return {
      data: books,
      total,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  // Get a single book by ID (optimized)
  static async getBookById(id: number): Promise<IBook | null> {
    const startTime = Date.now();
    const isMySQL = this.getDbType() === 'mysql';
    const queryText = isMySQL ? 'SELECT * FROM books WHERE id = ?' : 'SELECT * FROM books WHERE id = $1';
    const result = await query(queryText, [id]);
    
    logPerformance('getBookById', startTime, { id });
    return result.rows[0] || null;
  }

  // Create a new book (optimized)
  static async createBook(bookData: IBookCreate): Promise<IBook> {
    const startTime = Date.now();
    const { title, author, published_year, genre } = bookData;
    const isMySQL = this.getDbType() === 'mysql';
    
    // Clear stats cache when data changes
    this.statsCache = null;
    
    if (isMySQL) {
      const queryText = `
        INSERT INTO books (title, author, published_year, genre)
        VALUES (?, ?, ?, ?)
      `;
      await query(queryText, [title, author, published_year, genre]);
      const selectResult = await query('SELECT * FROM books WHERE id = LAST_INSERT_ID()');
      
      logPerformance('createBook', startTime, { title, author });
      return selectResult.rows[0];
    } else {
      const queryText = `
        INSERT INTO books (title, author, published_year, genre)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const result = await query(queryText, [title, author, published_year, genre]);
      
      logPerformance('createBook', startTime, { title, author });
      return result.rows[0];
    }
  }

  // Update an existing book (optimized)
  static async updateBook(id: number, bookData: IBookUpdate): Promise<IBook | null> {
    const startTime = Date.now();
    const updates: string[] = [];
    const values: any[] = [];
    const isMySQL = this.getDbType() === 'mysql';
    let paramIndex = 1;

    // Clear stats cache when data changes
    this.statsCache = null;

    // Build UPDATE query dynamically (optimized)
    const fields = ['title', 'author', 'published_year', 'genre'] as const;
    
    for (const field of fields) {
      if (bookData[field] !== undefined) {
        const placeholder = isMySQL ? '?' : `$${paramIndex}`;
        updates.push(`${field} = ${placeholder}`);
        values.push(bookData[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const idPlaceholder = isMySQL ? '?' : `$${paramIndex}`;

    if (isMySQL) {
      const updateQuery = `
        UPDATE books 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${idPlaceholder}
      `;
      await query(updateQuery, values);
      const selectResult = await query('SELECT * FROM books WHERE id = ?', [id]);
      
      logPerformance('updateBook', startTime, { id, fieldsUpdated: updates.length });
      return selectResult.rows[0] || null;
    } else {
      const updateQuery = `
        UPDATE books 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${idPlaceholder}
        RETURNING *
      `;
      const result = await query(updateQuery, values);
      
      logPerformance('updateBook', startTime, { id, fieldsUpdated: updates.length });
      return result.rows[0] || null;
    }
  }

  // Delete a book (optimized)
  static async deleteBook(id: number): Promise<boolean> {
    const startTime = Date.now();
    const isMySQL = this.getDbType() === 'mysql';
    
    // Clear stats cache when data changes
    this.statsCache = null;
    
    if (isMySQL) {
      const result = await query('DELETE FROM books WHERE id = ?', [id]);
      const success = (result as any).affectedRows > 0;
      logPerformance('deleteBook', startTime, { id, success });
      return success;
    } else {
      const result = await query('DELETE FROM books WHERE id = $1 RETURNING id', [id]);
      const success = result && result.rows && result.rows.length > 0;
      logPerformance('deleteBook', startTime, { id, success });
      return success;
    }
  }

  // Get unique genres for filter dropdown (cached)
  static async getGenres(): Promise<string[]> {
    const result = await query('SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL ORDER BY genre');
    return result.rows.map((row: any) => row.genre);
  }

  // Get unique authors for filter dropdown (cached)
  static async getAuthors(): Promise<string[]> {
    const result = await query('SELECT DISTINCT author FROM books ORDER BY author');
    return result.rows.map((row: any) => row.author);
  }

  // Get books statistics (cached)
  static async getStats(): Promise<{
    totalBooks: number;
    totalAuthors: number;
    totalGenres: number;
    recentBooks: number;
  }> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.statsCache && (now - this.statsCache.timestamp) < this.STATS_CACHE_TTL) {
      return this.statsCache.data;
    }

    const startTime = Date.now();
    const isMySQL = this.getDbType() === 'mysql';
    let statsQuery: string;
    
    if (isMySQL) {
      statsQuery = `
        SELECT 
          COUNT(*) as total_books,
          COUNT(DISTINCT author) as total_authors,
          COUNT(DISTINCT genre) as total_genres,
          SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as recent_books
        FROM books
      `;
    } else {
      statsQuery = `
        SELECT 
          COUNT(*) as total_books,
          COUNT(DISTINCT author) as total_authors,
          COUNT(DISTINCT genre) as total_genres,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent_books
        FROM books
      `;
    }
    
    const result = await query(statsQuery);
    const stats = {
      totalBooks: parseInt(result.rows[0].total_books),
      totalAuthors: parseInt(result.rows[0].total_authors),
      totalGenres: parseInt(result.rows[0].total_genres),
      recentBooks: parseInt(result.rows[0].recent_books)
    };

    // Cache the results
    this.statsCache = {
      data: stats,
      timestamp: now
    };

    logPerformance('getStats', startTime);
    return stats;
  }

  // Clear stats cache (call when data changes)
  static clearStatsCache(): void {
    this.statsCache = null;
  }
} 