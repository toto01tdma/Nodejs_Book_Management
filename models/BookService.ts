import { query, getDatabaseType } from '../config/database';
import { IBook, IBookCreate, IBookUpdate, IBookFilters, IPaginatedResult } from './Book';

export class BookService {
  // Get all books with optional filters and pagination
  static async getAllBooks(filters: IBookFilters = {}): Promise<IPaginatedResult<IBook>> {
    const {
      search = '',
      genre = '',
      author = '',
      year,
      limit = 10,
      offset = 0
    } = filters;

    const page = Math.floor(offset / limit) + 1;
    const dbType = getDatabaseType();
    const isMySQL = dbType.toLowerCase() === 'mysql';

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Build WHERE conditions dynamically
    if (search) {
      const placeholder = isMySQL ? '?' : `$${paramIndex}`;
      whereConditions.push(`(title LIKE ${placeholder} OR author LIKE ${placeholder})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (genre) {
      const placeholder = isMySQL ? '?' : `$${paramIndex}`;
      whereConditions.push(`genre LIKE ${placeholder}`);
      queryParams.push(`%${genre}%`);
      paramIndex++;
    }

    if (author) {
      const placeholder = isMySQL ? '?' : `$${paramIndex}`;
      whereConditions.push(`author LIKE ${placeholder}`);
      queryParams.push(`%${author}%`);
      paramIndex++;
    }

    if (year) {
      const placeholder = isMySQL ? '?' : `$${paramIndex}`;
      whereConditions.push(`published_year = ${placeholder}`);
      queryParams.push(year);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as count FROM books ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count || countResult.rows[0]['COUNT(*)']);

    // Get paginated results - adjust LIMIT syntax for different databases
    let dataQuery: string;
    const limitParams = [...queryParams];
    
    if (isMySQL) {
      dataQuery = `
        SELECT * FROM books 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;
    } else {
      dataQuery = `
        SELECT * FROM books 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
    }
    limitParams.push(limit, offset);

    const result = await query(dataQuery, limitParams);
    const totalPages = Math.ceil(total / limit);

    return {
      data: result.rows,
      total,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  // Get a single book by ID
  static async getBookById(id: number): Promise<IBook | null> {
    const dbType = getDatabaseType();
    const queryText = dbType.toLowerCase() === 'mysql' ? 'SELECT * FROM books WHERE id = ?' : 'SELECT * FROM books WHERE id = $1';
    const result = await query(queryText, [id]);
    return result.rows[0] || null;
  }

  // Create a new book
  static async createBook(bookData: IBookCreate): Promise<IBook> {
    const { title, author, published_year, genre } = bookData;
    const dbType = getDatabaseType();
    
    if (dbType.toLowerCase() === 'mysql') {
      const queryText = `
        INSERT INTO books (title, author, published_year, genre)
        VALUES (?, ?, ?, ?)
      `;
      await query(queryText, [title, author, published_year, genre]);
      // For MySQL, we need to fetch the created record
      const selectResult = await query('SELECT * FROM books WHERE id = LAST_INSERT_ID()');
      return selectResult.rows[0];
    } else {
      const queryText = `
        INSERT INTO books (title, author, published_year, genre)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const result = await query(queryText, [title, author, published_year, genre]);
      return result.rows[0];
    }
  }

  // Update an existing book
  static async updateBook(id: number, bookData: IBookUpdate): Promise<IBook | null> {
    const updates = [];
    const values = [];
    const dbType = getDatabaseType();
    const isMySQL = dbType.toLowerCase() === 'mysql';
    let paramIndex = 1;

    // Build UPDATE query dynamically
    if (bookData.title !== undefined) {
      const placeholder = isMySQL ? '?' : `$${paramIndex}`;
      updates.push(`title = ${placeholder}`);
      values.push(bookData.title);
      paramIndex++;
    }

    if (bookData.author !== undefined) {
      const placeholder = isMySQL ? '?' : `$${paramIndex}`;
      updates.push(`author = ${placeholder}`);
      values.push(bookData.author);
      paramIndex++;
    }

    if (bookData.published_year !== undefined) {
      const placeholder = isMySQL ? '?' : `$${paramIndex}`;
      updates.push(`published_year = ${placeholder}`);
      values.push(bookData.published_year);
      paramIndex++;
    }

    if (bookData.genre !== undefined) {
      const placeholder = isMySQL ? '?' : `$${paramIndex}`;
      updates.push(`genre = ${placeholder}`);
      values.push(bookData.genre);
      paramIndex++;
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
      // For MySQL, fetch the updated record
      const selectResult = await query('SELECT * FROM books WHERE id = ?', [id]);
      return selectResult.rows[0] || null;
    } else {
      const updateQuery = `
        UPDATE books 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${idPlaceholder}
        RETURNING *
      `;
      const result = await query(updateQuery, values);
      return result.rows[0] || null;
    }
  }

  // Delete a book
  static async deleteBook(id: number): Promise<boolean> {
    const dbType = getDatabaseType();
    const isMySQL = dbType.toLowerCase() === 'mysql';
    
    if (isMySQL) {
      const result = await query('DELETE FROM books WHERE id = ?', [id]);
      return (result.rows as any).affectedRows > 0;
    } else {
      const result = await query('DELETE FROM books WHERE id = $1 RETURNING id', [id]);
      return result.rows.length > 0;
    }
  }

  // Get unique genres for filter dropdown
  static async getGenres(): Promise<string[]> {
    const result = await query('SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL ORDER BY genre');
    return result.rows.map((row: any) => row.genre);
  }

  // Get unique authors for filter dropdown
  static async getAuthors(): Promise<string[]> {
    const result = await query('SELECT DISTINCT author FROM books ORDER BY author');
    return result.rows.map((row: any) => row.author);
  }

  // Get books statistics
  static async getStats(): Promise<{
    totalBooks: number;
    totalAuthors: number;
    totalGenres: number;
    recentBooks: number;
  }> {
    const dbType = getDatabaseType();
    let statsQuery: string;
    
    if (dbType.toLowerCase() === 'mysql') {
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
    return {
      totalBooks: parseInt(result.rows[0].total_books),
      totalAuthors: parseInt(result.rows[0].total_authors),
      totalGenres: parseInt(result.rows[0].total_genres),
      recentBooks: parseInt(result.rows[0].recent_books)
    };
  }
} 