import morgan from 'morgan';
import express from 'express';
import logger, { logHttp } from '../config/logger';

// Custom token for response time in milliseconds
morgan.token('response-time-ms', (req: express.Request, res: express.Response) => {
  const responseTime = res.get('X-Response-Time');
  return responseTime ? `${responseTime}ms` : '0ms';
});

// Custom token for user information (optimized)
morgan.token('user', (req: any) => {
  return req.user ? `${req.user.username}(${req.user.role})` : 'anon';
});

// Custom token for request body size (optimized)
morgan.token('body-size', (req: any) => {
  if (!req.body) return '0';
  
  // Optimize for common cases
  if (typeof req.body === 'string') return req.body.length.toString();
  if (Buffer.isBuffer(req.body)) return req.body.length.toString();
  
  // For objects, use a more efficient method
  try {
    return JSON.stringify(req.body).length.toString();
  } catch {
    return '0';
  }
});

// Custom token for IP address (handles proxies, optimized)
morgan.token('real-ip', (req: express.Request) => {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
         (req.headers['x-real-ip'] as string) || 
         req.socket.remoteAddress ||
         req.ip ||
         'unknown';
});

// Optimized format for production (less verbose)
const productionFormat = ':real-ip :user ":method :url" :status :res[content-length] :response-time-ms';

// Detailed format for development
const developmentFormat = ':real-ip - :user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms :body-size';

// Choose format based on environment
const logFormat = process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat;

// Create Morgan middleware with Winston integration and optimizations
export const httpLogger = morgan(logFormat, {
  stream: {
    write: (message: string) => {
      // Remove trailing newline and log as HTTP level
      logHttp(message.trim());
    }
  },
  skip: (req, res) => {
    // Skip logging for health checks and static files in production
    if (process.env.NODE_ENV === 'production' && req.url) {
      return req.url === '/health' || 
             req.url === '/api/db/status' ||
             req.url.startsWith('/css/') || 
             req.url.startsWith('/js/') || 
             req.url.startsWith('/images/') ||
             req.url.startsWith('/favicon');
    }
    return false;
  }
});

// Optimized middleware to add response time header
export const responseTimeMiddleware = (req: any, res: any, next: any) => {
  const start = process.hrtime.bigint();
  
  // Store the original end method
  const originalEnd = res.end;
  
  // Override the end method to set the header before finishing
  res.end = function(chunk: any, encoding: any) {
    // Calculate duration in milliseconds with high precision
    const duration = Number(process.hrtime.bigint() - start) / 1000000;
    
    // Only set header if response hasn't been sent yet
    if (!res.headersSent) {
      res.set('X-Response-Time', Math.round(duration).toString());
    }
    
    // Call the original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Optimized error logging middleware
export const errorLogger = (error: Error, req: any, res: any, next: any) => {
  // Only log significant errors to reduce noise
  if (res.statusCode >= 500 || error.name === 'ValidationError') {
    const errorInfo = {
      method: req.method,
      url: req.url,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      user: req.user ? `${req.user.username}(${req.user.role})` : 'anonymous',
      statusCode: res.statusCode,
      // Only include body for POST/PUT/PATCH requests to avoid logging sensitive data
      ...(req.method !== 'GET' && req.method !== 'DELETE' && { body: req.body }),
      params: req.params,
      query: req.query
    };

    logger.error('HTTP Error', error, errorInfo);
  }
  
  next(error);
};

// Request logging for sensitive operations (optimized)
export const logSensitiveOperation = (operation: string) => {
  return (req: any, res: any, next: any) => {
    const operationInfo = {
      operation,
      method: req.method,
      url: req.url,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      user: req.user ? `${req.user.username}(${req.user.role})` : 'anonymous',
      timestamp: new Date().toISOString()
    };

    logger.info(`Sensitive Operation: ${operation}`, operationInfo);
    next();
  };
};

// Rate limiting helper for logging (prevents log spam)
const logRateLimit = new Map<string, number>();
const LOG_RATE_LIMIT_WINDOW = 60000; // 1 minute
const LOG_RATE_LIMIT_MAX = 10; // Max 10 logs per minute per key

export const rateLimitedLog = (key: string, logFn: () => void) => {
  const now = Date.now();
  const windowStart = Math.floor(now / LOG_RATE_LIMIT_WINDOW) * LOG_RATE_LIMIT_WINDOW;
  const logKey = `${key}_${windowStart}`;
  
  const count = logRateLimit.get(logKey) || 0;
  if (count < LOG_RATE_LIMIT_MAX) {
    logRateLimit.set(logKey, count + 1);
    logFn();
    
    // Cleanup old entries
    if (logRateLimit.size > 100) {
      const cutoff = now - LOG_RATE_LIMIT_WINDOW * 2;
      for (const [k] of logRateLimit) {
        const timestamp = parseInt(k.split('_').pop() || '0');
        if (timestamp < cutoff) {
          logRateLimit.delete(k);
        }
      }
    }
  }
}; 