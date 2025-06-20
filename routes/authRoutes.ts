import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { UserService } from '../models/UserService';
import { authenticateToken, requireAdmin, requireOwnershipOrAdmin } from '../middleware/authMiddleware';
import { requireDatabase } from '../middleware/dbMiddleware';

const router = express.Router();

// Validation middleware
const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('role')
    .optional()
    .isIn(['admin', 'user'])
    .withMessage('Role must be either admin or user')
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const validateUserId = [
  param('id').isInt({ min: 1 }).withMessage('Invalid user ID')
];

const validateRoleUpdate = [
  body('role')
    .isIn(['admin', 'user'])
    .withMessage('Role must be either admin or user')
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

// POST /api/auth/register - Register a new user
router.post('/register', requireDatabase, validateRegister, handleValidationErrors, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { username, email, password, role } = req.body;
    
    const result = await UserService.registerUser({
      username,
      email,
      password,
      role
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in register route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/auth/login - Login user
router.post('/login', requireDatabase, validateLogin, handleValidationErrors, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    const result = await UserService.loginUser({ email, password });

    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('Error in login route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', requireDatabase, authenticateToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const user = await UserService.getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const userResponse = UserService.formatUserResponse(user);
    res.json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Error in me route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/auth/logout - Logout user (client-side token removal)
router.post('/logout', (req: express.Request, res: express.Response): void => {
  // Since JWT is stateless, logout is handled on the client side
  // This endpoint exists for consistency and potential future server-side token blacklisting
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// GET /api/auth/users - Get all users (admin only)
router.get('/users', requireDatabase, authenticateToken, requireAdmin, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const users = await UserService.getAllUsers();
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error in get users route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/auth/users/:id - Delete user (admin only)
router.delete('/users/:id', requireDatabase, authenticateToken, requireAdmin, validateUserId, handleValidationErrors, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);
    
    // Prevent admin from deleting themselves
    if (req.user && req.user.userId === userId) {
      res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
      return;
    }

    const deleted = await UserService.deleteUser(userId);
    
    if (deleted) {
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
  } catch (error) {
    console.error('Error in delete user route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/auth/users/:id/role - Update user role (admin only)
router.put('/users/:id/role', requireDatabase, authenticateToken, requireAdmin, [...validateUserId, ...validateRoleUpdate], handleValidationErrors, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    
    // Prevent admin from changing their own role
    if (req.user && req.user.userId === userId) {
      res.status(400).json({
        success: false,
        message: 'You cannot change your own role'
      });
      return;
    }

    const updated = await UserService.updateUserRole(userId, role);
    
    if (updated) {
      res.json({
        success: true,
        message: 'User role updated successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
  } catch (error) {
    console.error('Error in update user role route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router; 