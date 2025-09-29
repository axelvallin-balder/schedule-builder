import { performanceMonitor } from './PerformanceMonitor';

export interface ErrorContext {
  operation: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
}

export interface ErrorRecoveryStrategy {
  maxRetries: number;
  retryDelay: number; // milliseconds
  exponentialBackoff: boolean;
  circuitBreakerThreshold: number; // failures before opening circuit
  circuitBreakerTimeout: number; // milliseconds before trying again
}

export interface RecoveryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  retryAttempt: number;
  recoveryStrategy: string;
}

export class ErrorRecoveryService {
  private errorCounts = new Map<string, number>();
  private circuitBreakers = new Map<string, { 
    state: 'closed' | 'open' | 'half-open';
    failureCount: number;
    lastFailureTime: number;
    nextAttemptTime: number;
  }>();
  
  private defaultStrategy: ErrorRecoveryStrategy = {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 30000
  };

  /**
   * Execute an operation with error recovery
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    strategy: Partial<ErrorRecoveryStrategy> = {}
  ): Promise<RecoveryResult<T>> {
    const finalStrategy = { ...this.defaultStrategy, ...strategy };
    const operationKey = context.operation;
    
    // Check circuit breaker
    if (this.isCircuitOpen(operationKey, finalStrategy)) {
      return {
        success: false,
        error: new Error(`Circuit breaker is open for operation: ${operationKey}`),
        retryAttempt: 0,
        recoveryStrategy: 'circuit-breaker-open'
      };
    }

    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= finalStrategy.maxRetries; attempt++) {
      const operationId = `${context.operation}_recovery_${attempt}_${Date.now()}`;
      
      try {
        performanceMonitor.startTiming(operationId, context.operation);
        
        const result = await operation();
        
        performanceMonitor.endTiming(operationId, context.operation, true, {
          recoveryAttempt: attempt,
          ...context.metadata
        });
        
        // Reset circuit breaker on success
        this.resetCircuitBreaker(operationKey);
        
        return {
          success: true,
          result,
          retryAttempt: attempt,
          recoveryStrategy: attempt === 0 ? 'no-recovery' : 'retry-success'
        };
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        performanceMonitor.endTiming(operationId, context.operation, false, {
          recoveryAttempt: attempt,
          error: lastError.message,
          ...context.metadata
        });
        
        // Update circuit breaker
        this.recordFailure(operationKey, finalStrategy);
        
        // Log error with context
        this.logError(lastError, { 
          ...context, 
          metadata: { ...context.metadata, retryAttempt: attempt }
        });
        
        // If this is not the last attempt, wait before retrying
        if (attempt < finalStrategy.maxRetries) {
          const delay = this.calculateDelay(attempt, finalStrategy);
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      retryAttempt: finalStrategy.maxRetries,
      recoveryStrategy: 'max-retries-exceeded'
    };
  }

  /**
   * Execute with fallback strategy
   */
  async executeWithFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    context: ErrorContext,
    strategy: Partial<ErrorRecoveryStrategy> = {}
  ): Promise<RecoveryResult<T>> {
    // Try primary operation first
    const primaryResult = await this.executeWithRecovery(
      primaryOperation,
      { ...context, operation: `${context.operation}_primary` },
      strategy
    );

    if (primaryResult.success) {
      return {
        ...primaryResult,
        recoveryStrategy: 'primary-success'
      };
    }

    // Fall back to fallback operation
    const fallbackResult = await this.executeWithRecovery(
      fallbackOperation,
      { ...context, operation: `${context.operation}_fallback` },
      { ...strategy, maxRetries: 1 } // Fewer retries for fallback
    );

    return {
      ...fallbackResult,
      recoveryStrategy: fallbackResult.success ? 'fallback-success' : 'all-failed'
    };
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitOpen(operationKey: string, strategy: ErrorRecoveryStrategy): boolean {
    const breaker = this.circuitBreakers.get(operationKey);
    
    if (!breaker) {
      return false;
    }

    const now = Date.now();
    
    if (breaker.state === 'open') {
      if (now >= breaker.nextAttemptTime) {
        // Transition to half-open
        breaker.state = 'half-open';
        return false;
      }
      return true;
    }
    
    return false;
  }

  /**
   * Record a failure for circuit breaker
   */
  private recordFailure(operationKey: string, strategy: ErrorRecoveryStrategy): void {
    let breaker = this.circuitBreakers.get(operationKey);
    
    if (!breaker) {
      breaker = {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0
      };
      this.circuitBreakers.set(operationKey, breaker);
    }

    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();

    if (breaker.failureCount >= strategy.circuitBreakerThreshold) {
      breaker.state = 'open';
      breaker.nextAttemptTime = Date.now() + strategy.circuitBreakerTimeout;
    }
  }

  /**
   * Reset circuit breaker on success
   */
  private resetCircuitBreaker(operationKey: string): void {
    const breaker = this.circuitBreakers.get(operationKey);
    if (breaker) {
      breaker.state = 'closed';
      breaker.failureCount = 0;
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateDelay(attempt: number, strategy: ErrorRecoveryStrategy): number {
    if (!strategy.exponentialBackoff) {
      return strategy.retryDelay;
    }
    
    // Exponential backoff with jitter
    const exponentialDelay = strategy.retryDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log error with context
   */
  private logError(error: Error, context: ErrorContext): void {
    const logEntry = {
      timestamp: context.timestamp,
      operation: context.operation,
      message: error.message,
      stack: error.stack,
      context: {
        userId: context.userId,
        sessionId: context.sessionId,
        requestId: context.requestId,
        retryAttempt: context.metadata?.retryAttempt,
        metadata: context.metadata
      }
    };

    // In production, this would go to a proper logging service
    console.error('Operation failed:', JSON.stringify(logEntry, null, 2));
    
    // Track error count
    const errorKey = `${context.operation}_${error.message}`;
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByOperation: Record<string, number>;
    circuitBreakerStatus: Record<string, { state: string; failureCount: number }>;
    topErrors: Array<{ error: string; count: number }>;
  } {
    const errorsByOperation: Record<string, number> = {};
    let totalErrors = 0;

    for (const [errorKey, count] of this.errorCounts.entries()) {
      const operation = errorKey.split('_')[0];
      errorsByOperation[operation] = (errorsByOperation[operation] || 0) + count;
      totalErrors += count;
    }

    const circuitBreakerStatus: Record<string, any> = {};
    for (const [key, breaker] of this.circuitBreakers.entries()) {
      circuitBreakerStatus[key] = {
        state: breaker.state,
        failureCount: breaker.failureCount
      };
    }

    const topErrors = Array.from(this.errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors,
      errorsByOperation,
      circuitBreakerStatus,
      topErrors
    };
  }

  /**
   * Generate error recovery report
   */
  generateReport(): {
    errorStats: {
      totalErrors: number;
      errorsByOperation: Record<string, number>;
      circuitBreakerStatus: Record<string, { state: string; failureCount: number }>;
      topErrors: Array<{ error: string; count: number }>;
    };
    recommendations: string[];
    healthStatus: 'healthy' | 'degraded' | 'critical';
  } {
    const errorStats = this.getErrorStats();
    const recommendations: string[] = [];
    let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';

    // Analyze circuit breakers
    const openCircuits = Object.values(errorStats.circuitBreakerStatus)
      .filter(status => status.state === 'open').length;
    
    if (openCircuits > 0) {
      healthStatus = 'critical';
      recommendations.push(`${openCircuits} circuit breaker(s) are open - investigate failing operations`);
    }

    // Analyze error rates
    const highErrorOperations = Object.entries(errorStats.errorsByOperation)
      .filter(([, count]) => count > 10)
      .map(([operation]) => operation);

    if (highErrorOperations.length > 0) {
      if (healthStatus === 'healthy') healthStatus = 'degraded';
      recommendations.push(`High error rates detected for: ${highErrorOperations.join(', ')}`);
    }

    // Check for error spikes
    if (errorStats.totalErrors > 100) {
      healthStatus = 'critical';
      recommendations.push('Very high total error count - investigate system stability');
    } else if (errorStats.totalErrors > 50) {
      if (healthStatus === 'healthy') healthStatus = 'degraded';
      recommendations.push('Elevated error count - monitor closely');
    }

    // Analyze top errors
    const criticalErrors = errorStats.topErrors.filter(error => error.count > 20);
    if (criticalErrors.length > 0) {
      recommendations.push(`Critical errors (>20 occurrences): ${criticalErrors.map(e => e.error).join(', ')}`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Error recovery system is operating normally');
    }

    return {
      errorStats,
      recommendations,
      healthStatus
    };
  }

  /**
   * Clear old error statistics
   */
  clearOldStats(): void {
    this.errorCounts.clear();
    
    // Reset closed circuit breakers
    for (const [key, breaker] of this.circuitBreakers.entries()) {
      if (breaker.state === 'closed' && breaker.failureCount === 0) {
        this.circuitBreakers.delete(key);
      }
    }
  }
}

/**
 * Global error handler for unhandled promise rejections
 */
export class GlobalErrorHandler {
  private errorRecovery: ErrorRecoveryService;
  private errorLog: Array<{ timestamp: number; error: Error; context?: any }> = [];

  constructor(errorRecovery: ErrorRecoveryService) {
    this.errorRecovery = errorRecovery;
    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers(): void {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.handleGlobalError(error, {
        type: 'unhandledRejection',
        promise: promise.toString()
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.handleGlobalError(error, {
        type: 'uncaughtException'
      });
      
      // Log and exit gracefully
      console.error('Uncaught exception - exiting process');
      process.exit(1);
    });
  }

  private handleGlobalError(error: Error, context: any): void {
    this.errorLog.push({
      timestamp: Date.now(),
      error,
      context
    });

    // Log the error
    console.error('Global error handler:', {
      message: error.message,
      stack: error.stack,
      context
    });

    // Trim error log to prevent memory leaks
    if (this.errorLog.length > 1000) {
      this.errorLog = this.errorLog.slice(-500);
    }
  }

  getGlobalErrorStats(): {
    recentErrors: Array<{ timestamp: number; message: string; type: string }>;
    errorCount: number;
  } {
    const recentErrors = this.errorLog
      .slice(-50)
      .map(entry => ({
        timestamp: entry.timestamp,
        message: entry.error.message,
        type: entry.context?.type || 'unknown'
      }));

    return {
      recentErrors,
      errorCount: this.errorLog.length
    };
  }
}

// Singleton instances
export const errorRecoveryService = new ErrorRecoveryService();
export const globalErrorHandler = new GlobalErrorHandler(errorRecoveryService);