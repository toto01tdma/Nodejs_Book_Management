import { Request, Response, NextFunction } from 'express';
import { requireDatabase } from '../../middleware/dbMiddleware';
import { getConnectionStatus } from '../../config/database';

// Mock database module
jest.mock('../../config/database');

const mockGetConnectionStatus = getConnectionStatus as jest.MockedFunction<typeof getConnectionStatus>;

describe('Database Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('requireDatabase', () => {
    it('should continue when database is connected', () => {
      mockGetConnectionStatus.mockReturnValue(true);

      requireDatabase(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 503 when database is not connected', () => {
      mockGetConnectionStatus.mockReturnValue(false);

      requireDatabase(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database not connected. Please check your database configuration.',
        error: 'SERVICE_UNAVAILABLE'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
}); 