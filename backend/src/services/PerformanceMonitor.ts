import { performance } from 'perf_hooks';

export interface PerformanceMetrics {
  timestamp: number;
  operation: string;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  errorCount: number;
  successCount: number;
  metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
  scheduleGeneration: number; // max 5000ms
  uiResponse: number; // max 100ms
  apiResponse: number; // max 200ms
  memoryUsage: number; // max 256MB for browser, 512MB for server
  errorRate: number; // max 5%
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private operationStarts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private successCounts: Map<string, number> = new Map();
  
  private readonly thresholds: PerformanceThresholds = {
    scheduleGeneration: 5000,
    uiResponse: 100,
    apiResponse: 200,
    memoryUsage: 512 * 1024 * 1024, // 512MB in bytes
    errorRate: 0.05 // 5%
  };

  /**
   * Start timing an operation
   */
  startTiming(operationId: string, operation: string): void {
    const startTime = performance.now();
    this.operationStarts.set(operationId, startTime);
    
    // Initialize counters if not exists
    if (!this.errorCounts.has(operation)) {
      this.errorCounts.set(operation, 0);
      this.successCounts.set(operation, 0);
    }
  }

  /**
   * End timing and record metrics
   */
  endTiming(operationId: string, operation: string, success: boolean = true, metadata?: Record<string, any>): PerformanceMetrics | null {
    const startTime = this.operationStarts.get(operationId);
    if (!startTime) {
      console.warn(`No start time found for operation: ${operationId}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Update counters
    if (success) {
      this.successCounts.set(operation, (this.successCounts.get(operation) || 0) + 1);
    } else {
      this.errorCounts.set(operation, (this.errorCounts.get(operation) || 0) + 1);
    }

    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      operation,
      duration,
      memoryUsage: process.memoryUsage(),
      errorCount: this.errorCounts.get(operation) || 0,
      successCount: this.successCounts.get(operation) || 0,
      metadata
    };

    this.metrics.push(metric);
    this.operationStarts.delete(operationId);

    // Check thresholds and log warnings
    this.checkThresholds(metric);

    return metric;
  }

  /**
   * Time a function execution
   */
  async timeFunction<T>(
    operation: string, 
    fn: () => Promise<T> | T,
    metadata?: Record<string, any>
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const operationId = `${operation}_${Date.now()}_${Math.random()}`;
    this.startTiming(operationId, operation);
    
    let success = true;
    let result: T;
    
    try {
      result = await fn();
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const metrics = this.endTiming(operationId, operation, success, metadata);
      if (metrics) {
        return { result: result!, metrics };
      }
    }
    
    throw new Error('Failed to record metrics');
  }

  /**
   * Check if metrics exceed thresholds
   */
  private checkThresholds(metric: PerformanceMetrics): void {
    const operation = metric.operation.toLowerCase();
    
    // Check duration thresholds
    if (operation.includes('schedule') && metric.duration > this.thresholds.scheduleGeneration) {
      console.warn(`Schedule generation exceeded threshold: ${metric.duration}ms > ${this.thresholds.scheduleGeneration}ms`);
    }
    
    if (operation.includes('ui') && metric.duration > this.thresholds.uiResponse) {
      console.warn(`UI response exceeded threshold: ${metric.duration}ms > ${this.thresholds.uiResponse}ms`);
    }
    
    if (operation.includes('api') && metric.duration > this.thresholds.apiResponse) {
      console.warn(`API response exceeded threshold: ${metric.duration}ms > ${this.thresholds.apiResponse}ms`);
    }

    // Check memory threshold
    const heapUsed = metric.memoryUsage.heapUsed;
    if (heapUsed > this.thresholds.memoryUsage) {
      console.warn(`Memory usage exceeded threshold: ${heapUsed} bytes > ${this.thresholds.memoryUsage} bytes`);
    }

    // Check error rate
    const errorRate = metric.errorCount / (metric.errorCount + metric.successCount);
    if (errorRate > this.thresholds.errorRate) {
      console.warn(`Error rate exceeded threshold: ${errorRate * 100}% > ${this.thresholds.errorRate * 100}%`);
    }
  }

  /**
   * Get aggregated performance statistics
   */
  getAggregatedStats(operation?: string): {
    totalOperations: number;
    averageDuration: number;
    medianDuration: number;
    p95Duration: number;
    errorRate: number;
    memoryStats: {
      averageHeapUsed: number;
      maxHeapUsed: number;
      averageRss: number;
      maxRss: number;
    };
  } {
    let filteredMetrics = this.metrics;
    if (operation) {
      filteredMetrics = this.metrics.filter(m => m.operation === operation);
    }

    if (filteredMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        medianDuration: 0,
        p95Duration: 0,
        errorRate: 0,
        memoryStats: {
          averageHeapUsed: 0,
          maxHeapUsed: 0,
          averageRss: 0,
          maxRss: 0
        }
      };
    }

    const durations = filteredMetrics.map(m => m.duration).sort((a, b) => a - b);
    const totalErrors = filteredMetrics.reduce((sum, m) => sum + m.errorCount, 0);
    const totalSuccess = filteredMetrics.reduce((sum, m) => sum + m.successCount, 0);
    
    const heapUsages = filteredMetrics.map(m => m.memoryUsage.heapUsed);
    const rssUsages = filteredMetrics.map(m => m.memoryUsage.rss);

    return {
      totalOperations: filteredMetrics.length,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      medianDuration: durations[Math.floor(durations.length / 2)],
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      errorRate: totalErrors / (totalErrors + totalSuccess),
      memoryStats: {
        averageHeapUsed: heapUsages.reduce((sum, h) => sum + h, 0) / heapUsages.length,
        maxHeapUsed: Math.max(...heapUsages),
        averageRss: rssUsages.reduce((sum, r) => sum + r, 0) / rssUsages.length,
        maxRss: Math.max(...rssUsages)
      }
    };
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(operation?: string, limitMinutes: number = 5): PerformanceMetrics[] {
    const cutoffTime = Date.now() - (limitMinutes * 60 * 1000);
    let filteredMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    
    if (operation) {
      filteredMetrics = filteredMetrics.filter(m => m.operation === operation);
    }
    
    return filteredMetrics;
  }

  /**
   * Clear old metrics to prevent memory leaks
   */
  clearOldMetrics(olderThanMinutes: number = 60): void {
    const cutoffTime = Date.now() - (olderThanMinutes * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: {
      totalOperations: number;
      averageDuration: number;
      medianDuration: number;
      p95Duration: number;
      errorRate: number;
      memoryStats: {
        averageHeapUsed: number;
        maxHeapUsed: number;
        averageRss: number;
        maxRss: number;
      };
    };
    operations: Array<{
      operation: string;
      stats: {
        totalOperations: number;
        averageDuration: number;
        medianDuration: number;
        p95Duration: number;
        errorRate: number;
        memoryStats: {
          averageHeapUsed: number;
          maxHeapUsed: number;
          averageRss: number;
          maxRss: number;
        };
      };
    }>;
    alerts: string[];
  } {
    const summary = this.getAggregatedStats();
    const operations = Array.from(new Set(this.metrics.map(m => m.operation)))
      .map(operation => ({
        operation,
        stats: this.getAggregatedStats(operation)
      }));

    const alerts: string[] = [];
    
    // Check for performance issues
    operations.forEach(({ operation, stats }) => {
      if (operation.toLowerCase().includes('schedule') && stats.averageDuration > this.thresholds.scheduleGeneration) {
        alerts.push(`Schedule generation performance degraded: ${stats.averageDuration.toFixed(2)}ms average`);
      }
      
      if (stats.errorRate > this.thresholds.errorRate) {
        alerts.push(`High error rate for ${operation}: ${(stats.errorRate * 100).toFixed(2)}%`);
      }
      
      if (stats.memoryStats.maxHeapUsed > this.thresholds.memoryUsage) {
        alerts.push(`Memory usage spike for ${operation}: ${(stats.memoryStats.maxHeapUsed / 1024 / 1024).toFixed(2)}MB`);
      }
    });

    return {
      summary,
      operations,
      alerts
    };
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * Check if system is under memory pressure
   */
  isMemoryPressureHigh(): boolean {
    const usage = this.getCurrentMemoryUsage();
    return usage.heapUsed > this.thresholds.memoryUsage * 0.8; // 80% threshold
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();