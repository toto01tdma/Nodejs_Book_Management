import express from 'express';
import { getConnectionStatus } from '../config/database';

// Middleware to check if database is connected
export const requireDatabase = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const isConnected = getConnectionStatus();
  
  if (!isConnected) {
    res.status(503).json({
      success: false,
      message: 'Database not connected. Please check your database configuration.',
      error: 'SERVICE_UNAVAILABLE'
    });
    return;
  }
  
  next();
}; 