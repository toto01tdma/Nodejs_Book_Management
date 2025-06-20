import pool from '../config/database';
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

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Build WHERE conditions dynamically
    if (search) {
      whereConditions.push(`(title ILIKE $${paramIndex} OR author ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (genre) {
      whereConditions.push(`genre ILIKE $${paramIndex}`);
      queryParams.push(`%${genre}%`);
      paramIndex++;
    }

    if (author) {
      whereConditions.push(`author ILIKE $${paramIndex}`);
      queryParams.push(`%${author}%`);
      paramIndex++;
    }

    if (year) {
      whereConditions.push(`published_year = $${paramIndex}`);
      queryParams.push(year);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM books ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const dataQuery = `
      SELECT * FROM books 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const result = await pool.query(dataQuery, queryParams);
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
    const query = 'SELECT * FROM books WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // Create a new book
  static async createBook(bookData: IBookCreate): Promise<IBook> {
    const { title, author, published_year, genre } = bookData;
    const query = `
      INSERT INTO books (title, author, published_year, genre)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [title, author, published_year, genre]);
    return result.rows[0];
  }

  // Update an existing book
  static async updateBook(id: number, bookData: IBookUpdate): Promise<IBook | null> {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    // Build UPDATE query dynamically
    if (bookData.title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      values.push(bookData.title);
      paramIndex++;
    }

    if (bookData.author !== undefined) {
      updates.push(`author = $${paramIndex}`);
      values.push(bookData.author);
      paramIndex++;
    }

    if (bookData.published_year !== undefined) {
      updates.push(`published_year = $${paramIndex}`);
      values.push(bookData.published_year);
      paramIndex++;
    }

    if (bookData.genre !== undefined) {
      updates.push(`genre = $${paramIndex}`);
      values.push(bookData.genre);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const query = `
      UPDATE books 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  // Delete a book
  static async deleteBook(id: number): Promise<boolean> {
    const query = 'DELETE FROM books WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows.length > 0;
  }

  // Get unique genres for filter dropdown
  static async getGenres(): Promise<string[]> {
    const query = 'SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL ORDER BY genre';
    const result = await pool.query(query);
    return result.rows.map(row => row.genre);
  }

  // Get unique authors for filter dropdown
  static async getAuthors(): Promise<string[]> {
    const query = 'SELECT DISTINCT author FROM books ORDER BY author';
    const result = await pool.query(query);
    return result.rows.map(row => row.author);
  }

  // Get books statistics
  static async getStats(): Promise<{
    totalBooks: number;
    totalAuthors: number;
    totalGenres: number;
    recentBooks: number;
  }> {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_books,
        COUNT(DISTINCT author) as total_authors,
        COUNT(DISTINCT genre) as total_genres,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent_books
      FROM books
    `;
    
    const result = await pool.query(statsQuery);
    return {
      totalBooks: parseInt(result.rows[0].total_books),
      totalAuthors: parseInt(result.rows[0].total_authors),
      totalGenres: parseInt(result.rows[0].total_genres),
      recentBooks: parseInt(result.rows[0].recent_books)
    };
  }
} 