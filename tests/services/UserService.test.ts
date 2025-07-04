import { UserService } from '../../services/UserService';
import { query, getDatabaseType } from '../../config/database';
import { IUserCreate, IUserLogin } from '../../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../config/database');
jest.mock('../../config/logger');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockGetDatabaseType = getDatabaseType as jest.MockedFunction<typeof getDatabaseType>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDatabaseType.mockReturnValue('postgresql');
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      const userData: IUserCreate = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };

      // Mock no existing user
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // getUserByEmail
        .mockResolvedValueOnce({ rows: [] }) // getUserByUsername
        .mockResolvedValueOnce({ rows: [{ id: 1, ...userData }] }); // INSERT

      mockBcrypt.hash.mockResolvedValue('hashedpassword' as never);

      const result = await UserService.registerUser(userData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User registered successfully');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('should fail when email already exists', async () => {
      const userData: IUserCreate = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const existingUser = {
        id: 1,
        email: 'test@example.com',
        username: 'existinguser'
      };

      mockQuery.mockResolvedValueOnce({ rows: [existingUser] }); // getUserByEmail

      const result = await UserService.registerUser(userData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User with this email already exists');
    });

    it('should fail when username already exists', async () => {
      const userData: IUserCreate = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const existingUser = {
        id: 1,
        email: 'other@example.com',
        username: 'testuser'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // getUserByEmail
        .mockResolvedValueOnce({ rows: [existingUser] }); // getUserByUsername

      const result = await UserService.registerUser(userData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Username is already taken');
    });

    it('should handle MySQL database type', async () => {
      mockGetDatabaseType.mockReturnValue('mysql');

      const userData: IUserCreate = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // getUserByEmail
        .mockResolvedValueOnce({ rows: [] }) // getUserByUsername
        .mockResolvedValueOnce({ rows: [] }); // INSERT

      mockBcrypt.hash.mockResolvedValue('hashedpassword' as never);

      const result = await UserService.registerUser(userData);

      expect(result.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['testuser', 'test@example.com'])
      );
    });
  });

  describe('loginUser', () => {
    it('should login user successfully with valid credentials', async () => {
      const credentials: IUserLogin = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user' as const,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({ rows: [mockUser] }); // getUserByEmail
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.sign.mockReturnValue('mock-jwt-token' as never);

      const result = await UserService.loginUser(credentials);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Login successful');
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user).toEqual({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      });
    });

    it('should fail with invalid email', async () => {
      const credentials: IUserLogin = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      mockQuery.mockResolvedValue({ rows: [] }); // getUserByEmail

      const result = await UserService.loginUser(credentials);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid email or password');
    });

    it('should fail with invalid password', async () => {
      const credentials: IUserLogin = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user' as const,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({ rows: [mockUser] }); // getUserByEmail
      mockBcrypt.compare.mockResolvedValue(false as never);

      const result = await UserService.loginUser(credentials);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid email or password');
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user' as const,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({ rows: [mockUser] });

      const result = await UserService.getUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await UserService.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user' as const,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({ rows: [mockUser] });

      const result = await UserService.getUserById(1);

      expect(result).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1]
      );
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await UserService.getUserById(999);

      expect(result).toBeNull();
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token with correct payload', () => {
      const payload = {
        userId: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user' as const
      };

      mockJwt.sign.mockReturnValue('mock-jwt-token' as never);

      const result = UserService.generateToken(payload);

      expect(result).toBe('mock-jwt-token');
      expect(mockJwt.sign).toHaveBeenCalledWith(
        payload,
        expect.any(String),
        { expiresIn: expect.any(String) }
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const mockPayload = {
        userId: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user' as const,
        iat: 1234567890,
        exp: 1234567890
      };

      mockJwt.verify.mockReturnValue(mockPayload as never);

      const result = UserService.verifyToken('valid-token');

      expect(result).toEqual(mockPayload);
      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
    });

    it('should return null for invalid token', () => {
      // Mock console.error to suppress error output during test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = UserService.verifyToken('invalid-token');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error verifying token:', expect.any(Error));
      
      // Restore console.error
      consoleSpy.mockRestore();
    });
  });

  describe('formatUserResponse', () => {
    it('should remove password_hash from user object', () => {
      const user = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user' as const,
        created_at: new Date(),
        updated_at: new Date()
      };

      const result = UserService.formatUserResponse(user);

      expect(result).toEqual({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      });
      expect(result).not.toHaveProperty('password_hash');
    });
  });

  describe('getAllUsers', () => {
    it('should return all users without password hashes', async () => {
      const mockUsers = [
        {
          id: 1,
          username: 'user1',
          email: 'user1@example.com',
          password_hash: 'hash1',
          role: 'user' as const,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          username: 'admin',
          email: 'admin@example.com',
          password_hash: 'hash2',
          role: 'admin' as const,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockUsers });

      const result = await UserService.getAllUsers();

      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('password_hash');
      expect(result[1]).not.toHaveProperty('password_hash');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully with PostgreSQL', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await UserService.deleteUser(1);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [1]
      );
    });

    it('should delete user successfully with MySQL', async () => {
      mockGetDatabaseType.mockReturnValue('mysql');
      mockQuery.mockResolvedValue({ rows: { affectedRows: 1 } });

      const result = await UserService.deleteUser(1);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = ?',
        [1]
      );
    });

    it('should return false when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await UserService.deleteUser(999);

      expect(result).toBe(false);
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully with PostgreSQL', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await UserService.updateUserRole(1, 'admin');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
        ['admin', 1]
      );
    });

    it('should update user role successfully with MySQL', async () => {
      mockGetDatabaseType.mockReturnValue('mysql');
      mockQuery.mockResolvedValue({ rows: { affectedRows: 1 } });

      const result = await UserService.updateUserRole(1, 'admin');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['admin', 1]
      );
    });

    it('should return false when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await UserService.updateUserRole(999, 'admin');

      expect(result).toBe(false);
    });
  });
}); 