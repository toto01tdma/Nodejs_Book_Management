import express from 'express';
import { UserService } from '../services/UserService';
import { IJWTPayload } from '../models/User';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IJWTPayload;
    }
  }
}

// Middleware to verify JWT token
export const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access token is required',
      error: 'UNAUTHORIZED'
    });
    return;
  }

  const decoded = UserService.verifyToken(token);
  if (!decoded) {
    res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
      error: 'FORBIDDEN'
    });
    return;
  }

  req.user = decoded;
  next();
};

// Middleware to check if user is admin
export const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'UNAUTHORIZED'
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
      error: 'FORBIDDEN'
    });
    return;
  }

  next();
};

// Middleware to check if user owns the resource or is admin
export const requireOwnershipOrAdmin = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'UNAUTHORIZED'
    });
    return;
  }

  const resourceUserId = parseInt(req.params.userId);
  const currentUserId = req.user.userId;
  const isAdmin = req.user.role === 'admin';

  if (!isAdmin && resourceUserId !== currentUserId) {
    res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources.',
      error: 'FORBIDDEN'
    });
    return;
  }

  next();
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const decoded = UserService.verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }

  next();
}; 