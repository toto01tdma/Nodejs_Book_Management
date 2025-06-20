import express from 'express';
import { getConnectionStatus, testConnection, initDatabase } from '../config/database';

const router = express.Router();

// GET /api/db/status - Get database connection status
router.get('/status', (req: express.Request, res: express.Response): void => {
  const isConnected = getConnectionStatus();
  res.json({ 
    success: true, 
    connected: isConnected,
    message: isConnected ? 'Database connected' : 'Database not connected'
  });
});

// POST /api/db/reconnect - Attempt to reconnect to database
router.post('/reconnect', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    console.log('🔄 Attempting to reconnect to database...');
    const connected = await testConnection();
    
    if (connected) {
      // Try to initialize database tables
      await initDatabase();
      res.json({ 
        success: true, 
        connected: true,
        message: 'Database reconnected successfully'
      });
    } else {
      res.json({ 
        success: false, 
        connected: false,
        message: 'Failed to reconnect to database'
      });
    }
  } catch (error) {
    console.error('Database reconnection error:', error);
    res.status(500).json({ 
      success: false, 
      connected: false,
      message: 'Database reconnection failed'
    });
  }
});

export default router; 