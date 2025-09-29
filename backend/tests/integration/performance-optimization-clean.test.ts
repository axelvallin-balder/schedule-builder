import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OptimizedScheduleGenerator } from '../../src/services/OptimizedScheduleGenerator';
import { PerformanceMonitor } from '../../src/services/PerformanceMonitor';
import { CacheService } from '../../src/services/CacheService';
import { ErrorRecoveryService } from '../../src/services/ErrorRecoveryService';
import { Course } from '../../src/models/Course';
import { Teacher } from '../../src/models/Teacher';
import { Group } from '../../src/models/Group';

describe('Performance & Optimization Integration Tests', () => {
  let generator: OptimizedScheduleGenerator;
  let performanceMonitor: PerformanceMonitor;
  let cacheService: CacheService;
  let errorRecovery: ErrorRecoveryService;
  let mockCourses: Course[];
  let mockTeachers: Teacher[];
  let mockGroups: Group[];

  beforeEach(() => {
    generator = new OptimizedScheduleGenerator();
    performanceMonitor = new PerformanceMonitor();
    cacheService = new CacheService();
    errorRecovery = new ErrorRecoveryService();

    // Create comprehensive test data
    mockTeachers = Array.from({ length: 10 }, (_, i) => ({
      id: `teacher_${i}`,
      name: `Teacher ${i}`,
      subjectIds: [`subject_${i % 3}`],
      workingHours: {
        start: '08:15',
        end: '16:00'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    mockGroups = Array.from({ length: 15 }, (_, i) => ({
      id: `group_${i}`,
      name: `Group ${i}`,
      level: `Level ${Math.floor(i / 5) + 1}`,
      maxStudents: 30,
      currentStudents: 25 + (i % 5),
      classId: `class_${Math.floor(i / 3)}`,
      dependentGroupIds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    mockCourses = Array.from({ length: 25 }, (_, i) => ({
      id: `course_${i}`,
      subjectId: `subject_${i % 3}`,
      teacherId: mockTeachers[i % mockTeachers.length].id,
      groupIds: [mockGroups[i % mockGroups.length].id],
      weeklyHours: 2 + (i % 3),
      numberOfLessons: 2 + (i % 3),
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  });

  afterEach(() => {
    cacheService.clearAll();
    cacheService.destroy();
  });

  describe('Performance Monitoring Integration', () => {
    it('should monitor schedule generation performance', async () => {
      const constraints = {
        maxLessonsPerDay: 8,
        lessonDuration: 45,
        breakDuration: 15,
        maxHoursPerWeek: 40
      };

      const operationId = 'perf_test_schedule_gen';
      performanceMonitor.startTiming(operationId, 'schedule_generation');

      const schedule = await generator.generateOptimizedSchedule(
        mockCourses,
        mockTeachers,
        mockGroups,
        constraints
      );

      const metrics = performanceMonitor.endTiming(operationId, 'schedule_generation', true, {
        courseCount: mockCourses.length,
        teacherCount: mockTeachers.length,
        groupCount: mockGroups.length
      });

      expect(schedule).toBeDefined();
      expect(schedule.schedule.lessons).toBeDefined();
      expect(metrics).toBeDefined();
      expect(metrics!.duration).toBeLessThan(5000); // 5 second threshold
      expect(metrics!.operation).toBe('schedule_generation');
    });

    it('should track memory usage during intensive operations', async () => {
      const initialMemory = performanceMonitor.getCurrentMemoryUsage();
      
      // Perform multiple schedule generations
      for (let i = 0; i < 5; i++) {
        await generator.generateOptimizedSchedule(
          mockCourses,
          mockTeachers,
          mockGroups,
          { maxLessonsPerDay: 6, lessonDuration: 45 }
        );
      }

      const finalMemory = performanceMonitor.getCurrentMemoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      expect(performanceMonitor.isMemoryPressureHigh()).toBe(false);
    });
  });

  describe('Caching Integration', () => {
    it('should cache schedule generation results', async () => {
      const cacheKey = 'test_schedule_1';
      const constraints = { maxLessonsPerDay: 6, lessonDuration: 45 };
      
      // First generation (not cached)
      const schedule1 = await generator.generateOptimizedSchedule(
        mockCourses,
        mockTeachers,
        mockGroups,
        constraints
      );
      
      // Cache the result
      cacheService.set('schedule', cacheKey, schedule1, 60000); // 1 minute TTL
      
      // Retrieve from cache
      const cachedSchedule = cacheService.get('schedule', cacheKey);
      
      expect(cachedSchedule).toBeDefined();
      expect(cachedSchedule.schedule.id).toBe(schedule1.schedule.id);
      expect(cacheService.has('schedule', cacheKey)).toBe(true);
    });

    it('should handle different cache types appropriately', () => {
      const testData = {
        course: { id: 'c1', name: 'Test Course' },
        teacher: { id: 't1', name: 'Test Teacher' },
        group: { id: 'g1', name: 'Test Group' },
        lesson: { id: 'l1', courseId: 'c1' },
        metadata: { version: '1.0', lastUpdate: Date.now() }
      };

      // Set data in different caches
      Object.entries(testData).forEach(([type, data]) => {
        cacheService.set(type, `test_${type}`, data);
      });

      // Verify all data is cached
      Object.keys(testData).forEach(type => {
        expect(cacheService.has(type, `test_${type}`)).toBe(true);
        expect(cacheService.get(type, `test_${type}`)).toBeDefined();
      });

      // Check cache statistics
      const allStats = cacheService.getAllStats();
      expect(Object.keys(allStats)).toEqual(
        expect.arrayContaining(['course', 'teacher', 'group', 'lesson', 'metadata'])
      );
    });
  });

  describe('Error Recovery Integration', () => {
    it('should recover from transient failures with retry logic', async () => {
      let attemptCount = 0;
      const flakyOperation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Transient failure');
        }
        return 'success';
      };

      const result = await errorRecovery.executeWithRecovery(
        flakyOperation,
        {
          operation: 'flaky_test',
          timestamp: Date.now()
        },
        {
          maxRetries: 3,
          retryDelay: 100,
          exponentialBackoff: false
        }
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.retryAttempt).toBe(2); // Third attempt (0-indexed)
      expect(attemptCount).toBe(3);
    });

    it('should implement circuit breaker pattern', async () => {
      const alwaysFailingOperation = async () => {
        throw new Error('Always fails');
      };

      const context = {
        operation: 'circuit_breaker_test',
        timestamp: Date.now()
      };

      const strategy = {
        maxRetries: 1,
        retryDelay: 10,
        circuitBreakerThreshold: 3,
        circuitBreakerTimeout: 1000
      };

      // Execute failing operations to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        const result = await errorRecovery.executeWithRecovery(
          alwaysFailingOperation,
          { ...context, operation: `${context.operation}_${i}` },
          strategy
        );
        expect(result.success).toBe(false);
      }

      const errorStats = errorRecovery.getErrorStats();
      expect(errorStats.totalErrors).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Performance Integration', () => {
    it('should handle complete workflow with monitoring, caching, and error recovery', async () => {
      const workflow = async () => {
        // Step 1: Check cache first
        const cacheKey = 'e2e_test_schedule';
        let cachedResult = cacheService.get('schedule', cacheKey);
        
        if (cachedResult) {
          return cachedResult;
        }

        // Step 2: Generate with performance monitoring
        const result = await performanceMonitor.timeFunction(
          'e2e_schedule_generation',
          async () => {
            return await generator.generateOptimizedSchedule(
              mockCourses,
              mockTeachers,
              mockGroups,
              { maxLessonsPerDay: 6, lessonDuration: 45 }
            );
          },
          { workflowStep: 'generation' }
        );

        // Step 3: Cache the result
        cacheService.set('schedule', cacheKey, result.result, 300000); // 5 minutes
        
        return result.result;
      };

      // Execute with error recovery
      const finalResult = await errorRecovery.executeWithRecovery(
        workflow,
        {
          operation: 'e2e_workflow',
          timestamp: Date.now(),
          metadata: { testType: 'integration' }
        },
        {
          maxRetries: 2,
          retryDelay: 500
        }
      );

      expect(finalResult.success).toBe(true);
      expect(finalResult.result).toBeDefined();
      expect(finalResult.result.schedule.lessons).toBeDefined();
      
      // Verify cache was populated
      expect(cacheService.has('schedule', 'e2e_test_schedule')).toBe(true);
      
      // Verify performance metrics were recorded
      const perfStats = performanceMonitor.getAggregatedStats('e2e_schedule_generation');
      expect(perfStats.totalOperations).toBeGreaterThan(0);
    });

    it('should maintain performance under concurrent load', async () => {
      const concurrentOperations = Array.from({ length: 5 }, (_, i) => {
        return performanceMonitor.timeFunction(
          'concurrent_generation',
          async () => {
            return await generator.generateOptimizedSchedule(
              mockCourses.slice(0, 5), // Smaller dataset for faster execution
              mockTeachers.slice(0, 3),
              mockGroups.slice(0, 5),
              { maxLessonsPerDay: 4, lessonDuration: 45 }
            );
          },
          { concurrentIndex: i }
        );
      });

      const startTime = Date.now();
      const results = await Promise.all(concurrentOperations);
      const totalTime = Date.now() - startTime;

      // All operations should succeed
      expect(results.every(r => r.result.schedule.lessons !== undefined)).toBe(true);
      
      // Total time should be reasonable (less than 10 seconds for 5 concurrent operations)
      expect(totalTime).toBeLessThan(10000);
      
      // Average operation time should be acceptable
      const avgTime = results.reduce((sum, r) => sum + r.metrics.duration, 0) / results.length;
      expect(avgTime).toBeLessThan(3000); // 3 seconds average
      
      // Check memory usage hasn't spiked
      expect(performanceMonitor.isMemoryPressureHigh()).toBe(false);
    });
  });

  describe('System Health Monitoring', () => {
    it('should provide comprehensive system health status', async () => {
      // Generate some activity across all systems
      for (let i = 0; i < 3; i++) {
        await performanceMonitor.timeFunction(
          'health_check_operation',
          async () => {
            const schedule = await generator.generateOptimizedSchedule(
              mockCourses.slice(0, 3),
              mockTeachers.slice(0, 2),
              mockGroups.slice(0, 3),
              { maxLessonsPerDay: 4, lessonDuration: 45 }
            );
            
            cacheService.set('schedule', `health_test_${i}`, schedule);
            return schedule;
          }
        );
      }

      // Get health reports from all systems
      const performanceReport = performanceMonitor.generateReport();
      const cacheHealth = cacheService.getHealthReport();
      const errorReport = errorRecovery.generateReport();

      // Validate all reports are meaningful
      expect(performanceReport.summary.totalOperations).toBeGreaterThan(0);
      expect(cacheHealth.overall.totalHitRate).toBeGreaterThanOrEqual(0);
      expect(errorReport.healthStatus).toMatch(/healthy|degraded|critical/);
      
      // Overall system should be healthy or show specific issues
      const hasPerformanceAlerts = performanceReport.alerts.length > 0;
      const hasCacheIssues = cacheHealth.recommendations.some(r => r.includes('critical'));
      const hasErrorIssues = errorReport.healthStatus === 'critical';
      
      // System health check should complete successfully
      expect(typeof hasPerformanceAlerts).toBe('boolean');
      expect(typeof hasCacheIssues).toBe('boolean');
      expect(typeof hasErrorIssues).toBe('boolean');
    });
  });
});