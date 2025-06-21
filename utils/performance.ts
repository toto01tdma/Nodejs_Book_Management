import logger from '../config/logger';

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private startTime: number;
  private memoryBaseline: NodeJS.MemoryUsage;

  private constructor() {
    this.startTime = Date.now();
    this.memoryBaseline = process.memoryUsage();
    
    // Log memory usage every 5 minutes in development
    if (process.env.NODE_ENV !== 'production') {
      setInterval(() => this.logMemoryUsage(), 300000);
    }
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Track operation performance
  trackOperation<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
    const startTime = process.hrtime.bigint();
    
    return operation().then(result => {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000; // Convert to ms
      
      if (duration > 1000) { // Log operations taking more than 1 second
        logger.warn(`Slow operation detected: ${operationName}`, {
          duration: `${duration.toFixed(2)}ms`,
          operation: operationName
        });
      }
      
      return result;
    }).catch(error => {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logger.error(`Operation failed: ${operationName}`, {
        duration: `${duration.toFixed(2)}ms`,
        operation: operationName,
        error: error.message
      });
      throw error;
    });
  }

  // Log current memory usage
  logMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    const uptime = Date.now() - this.startTime;
    
    logger.info('Memory usage report', {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      uptime: `${Math.round(uptime / 1000)}s`,
      memoryGrowth: {
        rss: `${Math.round((memUsage.rss - this.memoryBaseline.rss) / 1024 / 1024)}MB`,
        heapUsed: `${Math.round((memUsage.heapUsed - this.memoryBaseline.heapUsed) / 1024 / 1024)}MB`
      }
    });
  }

  // Force garbage collection (if available)
  forceGC(): void {
    if (global.gc) {
      global.gc();
      logger.info('Garbage collection forced');
    }
  }

  // Get performance metrics
  getMetrics(): {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    memoryGrowth: {
      rss: number;
      heapUsed: number;
    };
  } {
    const memUsage = process.memoryUsage();
    return {
      uptime: Date.now() - this.startTime,
      memory: memUsage,
      memoryGrowth: {
        rss: memUsage.rss - this.memoryBaseline.rss,
        heapUsed: memUsage.heapUsed - this.memoryBaseline.heapUsed
      }
    };
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance(); 