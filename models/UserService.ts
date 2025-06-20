import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, getDatabaseType } from '../config/database';
import { IUser, IUserCreate, IUserLogin, IUserResponse, IAuthResponse, IJWTPayload } from './User';

export class UserService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
  private static readonly SALT_ROUNDS = 12;

  // Register a new user
  static async registerUser(userData: IUserCreate): Promise<IAuthResponse> {
    const { username, email, password, role = 'user' } = userData;

    try {
      // Check if user already exists
      const existingUser = await this.getUserByEmail(email);
      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists'
        };
      }

      // Check if username is taken
      const existingUsername = await this.getUserByUsername(username);
      if (existingUsername) {
        return {
          success: false,
          message: 'Username is already taken'
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

      // Create user
      const dbType = getDatabaseType();
      const isMySQL = dbType.toLowerCase() === 'mysql';

      if (isMySQL) {
        const queryText = `
          INSERT INTO users (username, email, password_hash, role)
          VALUES (?, ?, ?, ?)
        `;
        await query(queryText, [username, email, passwordHash, role]);
        
        return {
          success: true,
          message: 'User registered successfully'
        };
      } else {
        const queryText = `
          INSERT INTO users (username, email, password_hash, role)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `;
        await query(queryText, [username, email, passwordHash, role]);
        
        return {
          success: true,
          message: 'User registered successfully'
        };
      }
    } catch (error) {
      console.error('Error registering user:', error);
      return {
        success: false,
        message: 'Failed to register user'
      };
    }
  }

  // Login user
  static async loginUser(credentials: IUserLogin): Promise<IAuthResponse> {
    const { email, password } = credentials;

    try {
      // Get user by email
      const user = await this.getUserByEmail(email);
      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Generate token
      const token = this.generateToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      });

      const userResponse = this.formatUserResponse(user);

      return {
        success: true,
        message: 'Login successful',
        user: userResponse,
        token
      };
    } catch (error) {
      console.error('Error logging in user:', error);
      return {
        success: false,
        message: 'Failed to login'
      };
    }
  }

  // Get user by email
  static async getUserByEmail(email: string): Promise<IUser | null> {
    try {
      const dbType = getDatabaseType();
      const queryText = dbType.toLowerCase() === 'mysql' 
        ? 'SELECT * FROM users WHERE email = ?' 
        : 'SELECT * FROM users WHERE email = $1';
      
      const result = await query(queryText, [email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  // Get user by username
  static async getUserByUsername(username: string): Promise<IUser | null> {
    try {
      const dbType = getDatabaseType();
      const queryText = dbType.toLowerCase() === 'mysql' 
        ? 'SELECT * FROM users WHERE username = ?' 
        : 'SELECT * FROM users WHERE username = $1';
      
      const result = await query(queryText, [username]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  // Get user by ID
  static async getUserById(id: number): Promise<IUser | null> {
    try {
      const dbType = getDatabaseType();
      const queryText = dbType.toLowerCase() === 'mysql' 
        ? 'SELECT * FROM users WHERE id = ?' 
        : 'SELECT * FROM users WHERE id = $1';
      
      const result = await query(queryText, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  // Generate JWT token
  static generateToken(payload: Omit<IJWTPayload, 'iat' | 'exp'>): string {
    const jwtPayload = {
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
      role: payload.role
    };
    // @ts-ignore - JWT types issue with expiresIn option
    return jwt.sign(jwtPayload, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES_IN });
  }

  // Verify JWT token
  static verifyToken(token: string): IJWTPayload | null {
    try {
      return jwt.verify(token, this.JWT_SECRET) as IJWTPayload;
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  }

  // Format user response (remove password)
  static formatUserResponse(user: IUser): IUserResponse {
    const { password_hash, ...userResponse } = user;
    return userResponse;
  }

  // Get all users (admin only)
  static async getAllUsers(): Promise<IUserResponse[]> {
    try {
      const result = await query('SELECT * FROM users ORDER BY created_at DESC');
      return result.rows.map((user: IUser) => this.formatUserResponse(user));
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  // Delete user (admin only)
  static async deleteUser(id: number): Promise<boolean> {
    try {
      const dbType = getDatabaseType();
      const isMySQL = dbType.toLowerCase() === 'mysql';
      
      if (isMySQL) {
        const result = await query('DELETE FROM users WHERE id = ?', [id]);
        return (result.rows as any).affectedRows > 0;
      } else {
        const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        return result.rows.length > 0;
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  // Update user role (admin only)
  static async updateUserRole(id: number, role: 'admin' | 'user'): Promise<boolean> {
    try {
      const dbType = getDatabaseType();
      const isMySQL = dbType.toLowerCase() === 'mysql';
      
      if (isMySQL) {
        const result = await query(
          'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [role, id]
        );
        return (result.rows as any).affectedRows > 0;
      } else {
        const result = await query(
          'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
          [role, id]
        );
        return result.rows.length > 0;
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      return false;
    }
  }
} 