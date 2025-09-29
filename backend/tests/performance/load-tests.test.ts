import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { performance } from 'perf_hooks'

interface LoadTestMetrics {
  concurrentUsers: number
  requestsPerSecond: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  errorRate: number
  throughput: number
  memoryUsage: number
  cpuUtilization: number
  networkPayloadSize: number
}

interface LoadTestResult {
  testName: string
  duration: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  metrics: LoadTestMetrics
  bottlenecks: string[]
}

class LoadTestRunner {
  private results: LoadTestResult[] = []
  private activeRequests: Set<Promise<any>> = new Set()
  private requestMetrics: Array<{ duration: number; success: boolean; payload?: number }> = []

  async simulateConcurrentUsers(
    userCount: number,
    testDuration: number,
    requestFunction: () => Promise<any>
  ): Promise<LoadTestMetrics> {
    const startTime = performance.now()
    const endTime = startTime + testDuration
    const userPromises: Promise<void>[] = []

    // Reset metrics
    this.requestMetrics = []

    // Start concurrent users
    for (let i = 0; i < userCount; i++) {
      userPromises.push(this.simulateUser(endTime, requestFunction))
    }

    // Wait for test completion
    await Promise.all(userPromises)

    // Calculate metrics
    return this.calculateMetrics(testDuration / 1000, userCount)
  }

  private async simulateUser(
    endTime: number,
    requestFunction: () => Promise<any>
  ): Promise<void> {
    while (performance.now() < endTime) {
      try {
        const requestStart = performance.now()
        const response = await requestFunction()
        const requestDuration = performance.now() - requestStart

        this.requestMetrics.push({
          duration: requestDuration,
          success: true,
          payload: this.calculatePayloadSize(response)
        })

        // Simulate user think time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))
      } catch (error) {
        this.requestMetrics.push({
          duration: 0,
          success: false
        })
      }
    }
  }

  private calculatePayloadSize(response: any): number {
    try {
      return JSON.stringify(response).length
    } catch {
      return 0
    }
  }

  private calculateMetrics(durationSeconds: number, userCount: number): LoadTestMetrics {
    const successfulRequests = this.requestMetrics.filter(r => r.success)
    const failedRequests = this.requestMetrics.filter(r => !r.success)
    
    const responseTimes = successfulRequests.map(r => r.duration).sort((a, b) => a - b)
    const payloadSizes = successfulRequests
      .map(r => r.payload || 0)
      .filter(p => p > 0)

    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0

    const p95Index = Math.floor(responseTimes.length * 0.95)
    const p99Index = Math.floor(responseTimes.length * 0.99)

    const averagePayload = payloadSizes.length > 0
      ? payloadSizes.reduce((sum, size) => sum + size, 0) / payloadSizes.length
      : 0

    return {
      concurrentUsers: userCount,
      requestsPerSecond: this.requestMetrics.length / durationSeconds,
      averageResponseTime,
      p95ResponseTime: responseTimes[p95Index] || 0,
      p99ResponseTime: responseTimes[p99Index] || 0,
      errorRate: (failedRequests.length / this.requestMetrics.length) * 100,
      throughput: successfulRequests.length / durationSeconds,
      memoryUsage: this.getCurrentMemoryUsage(),
      cpuUtilization: 0, // Will be measured separately
      networkPayloadSize: averagePayload
    }
  }

  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024 // MB
    }
    return 0
  }

  async measureDatabaseQueryPerformance(
    queryFunction: () => Promise<any>,
    iterations: number = 100
  ): Promise<{ averageTime: number; p95Time: number; queriesPerSecond: number }> {
    const queryTimes: number[] = []

    const startTime = performance.now()

    for (let i = 0; i < iterations; i++) {
      const queryStart = performance.now()
      await queryFunction()
      const queryTime = performance.now() - queryStart
      queryTimes.push(queryTime)
    }

    const totalTime = performance.now() - startTime
    queryTimes.sort((a, b) => a - b)

    const averageTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length
    const p95Index = Math.floor(queryTimes.length * 0.95)

    return {
      averageTime,
      p95Time: queryTimes[p95Index],
      queriesPerSecond: (iterations / totalTime) * 1000
    }
  }

  async measureWebSocketConnectionLimits(
    connectionFactory: () => Promise<any>,
    maxConnections: number = 100
  ): Promise<{ maxConcurrentConnections: number; connectionTime: number; memoryPerConnection: number }> {
    const connections: any[] = []
    const connectionTimes: number[] = []
    let maxReached = 0

    const initialMemory = this.getCurrentMemoryUsage()

    try {
      for (let i = 0; i < maxConnections; i++) {
        const startTime = performance.now()
        
        try {
          const connection = await connectionFactory()
          const connectionTime = performance.now() - startTime
          
          connections.push(connection)
          connectionTimes.push(connectionTime)
          maxReached = i + 1

          // Small delay to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 10))
        } catch (error) {
          console.warn(`Failed to create connection ${i + 1}:`, error instanceof Error ? error.message : String(error))
          break
        }
      }
    } finally {
      // Clean up connections
      for (const connection of connections) {
        try {
          if (connection.close) connection.close()
          if (connection.disconnect) connection.disconnect()
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }

    const finalMemory = this.getCurrentMemoryUsage()
    const averageConnectionTime = connectionTimes.length > 0 
      ? connectionTimes.reduce((sum, time) => sum + time, 0) / connectionTimes.length 
      : 0

    const memoryPerConnection = maxReached > 0 
      ? (finalMemory - initialMemory) / maxReached 
      : 0

    return {
      maxConcurrentConnections: maxReached,
      connectionTime: averageConnectionTime,
      memoryPerConnection
    }
  }
}

// Mock implementations for load testing
const mockApiEndpoints = {
  async getCourses(): Promise<any> {
    // Simulate database query and response
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10))
    
    return {
      data: Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Course ${i + 1}`,
        teacher: `Teacher ${(i % 10) + 1}`,
        schedule: Array.from({ length: 5 }, (_, day) => ({
          day,
          lessons: Math.floor(Math.random() * 3)
        }))
      })),
      total: 50,
      page: 1,
      limit: 50
    }
  },

  async createSchedule(data: any): Promise<any> {
    // Simulate more intensive schedule generation
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100))
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
      lessons: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        courseId: Math.floor(Math.random() * 50) + 1,
        dayOfWeek: Math.floor(Math.random() * 5),
        startTime: `${8 + Math.floor(Math.random() * 8)}:00`,
        duration: 45
      })),
      createdAt: new Date().toISOString()
    }
  },

  async updateSchedule(id: string, data: any): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 20))
    
    return {
      id,
      ...data,
      updatedAt: new Date().toISOString()
    }
  }
}

const mockWebSocketConnection = {
  async create(): Promise<any> {
    // Simulate WebSocket connection establishment
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50))
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      connected: true,
      close: vi.fn(),
      disconnect: vi.fn()
    }
  }
}

const mockDatabaseQueries = {
  async findCourses(): Promise<any> {
    // Simulate database query
    await new Promise(resolve => setTimeout(resolve, Math.random() * 30 + 5))
    
    return Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: `Course ${i + 1}`
    }))
  },

  async complexJoinQuery(): Promise<any> {
    // Simulate complex database query with joins
    await new Promise(resolve => setTimeout(resolve, Math.random() * 80 + 20))
    
    return {
      schedules: 5,
      totalLessons: 100,
      conflicts: 2
    }
  }
}

describe('Load Tests and Scalability Metrics', () => {
  let loadTestRunner: LoadTestRunner

  beforeEach(() => {
    loadTestRunner = new LoadTestRunner()
  })

  describe('Concurrent User Simulation', () => {
    it('should handle 10 concurrent users making course requests', async () => {
      const metrics = await loadTestRunner.simulateConcurrentUsers(
        10,
        5000, // 5 second test
        mockApiEndpoints.getCourses
      )

      expect(metrics.concurrentUsers).toBe(10)
      expect(metrics.errorRate).toBeLessThan(5) // < 5% error rate
      expect(metrics.averageResponseTime).toBeLessThan(200) // < 200ms average
      expect(metrics.p95ResponseTime).toBeLessThan(500) // < 500ms p95
      expect(metrics.requestsPerSecond).toBeGreaterThan(5) // > 5 RPS

      console.log('10 Concurrent Users Metrics:', {
        RPS: metrics.requestsPerSecond.toFixed(2),
        AvgResponse: `${metrics.averageResponseTime.toFixed(2)}ms`,
        P95Response: `${metrics.p95ResponseTime.toFixed(2)}ms`,
        ErrorRate: `${metrics.errorRate.toFixed(2)}%`,
        Memory: `${metrics.memoryUsage.toFixed(2)}MB`
      })
    })

    it('should handle 25 concurrent users for schedule creation', async () => {
      const metrics = await loadTestRunner.simulateConcurrentUsers(
        25,
        10000, // 10 second test
        () => mockApiEndpoints.createSchedule({
          name: 'Test Schedule',
          courses: ['course-1', 'course-2']
        })
      )

      expect(metrics.concurrentUsers).toBe(25)
      expect(metrics.errorRate).toBeLessThan(10) // < 10% error rate for intensive operations
      expect(metrics.averageResponseTime).toBeLessThan(500) // < 500ms average for creation
      expect(metrics.throughput).toBeGreaterThan(2) // > 2 successful operations per second

      console.log('25 Concurrent Users (Schedule Creation) Metrics:', {
        Throughput: `${metrics.throughput.toFixed(2)} ops/sec`,
        AvgResponse: `${metrics.averageResponseTime.toFixed(2)}ms`,
        P99Response: `${metrics.p99ResponseTime.toFixed(2)}ms`,
        ErrorRate: `${metrics.errorRate.toFixed(2)}%`,
        PayloadSize: `${metrics.networkPayloadSize.toFixed(0)} bytes`
      })
    })

    it('should test maximum concurrent user limit (50 users)', async () => {
      const metrics = await loadTestRunner.simulateConcurrentUsers(
        50, // Maximum per spec
        15000, // 15 second test
        mockApiEndpoints.getCourses
      )

      expect(metrics.concurrentUsers).toBe(50)
      expect(metrics.errorRate).toBeLessThan(15) // Allow higher error rate at max capacity
      expect(metrics.memoryUsage).toBeLessThan(512) // < 512MB server memory limit
      
      // System should still be responsive even at max load
      expect(metrics.p95ResponseTime).toBeLessThan(1000) // < 1s p95 at max load

      console.log('50 Concurrent Users (Max Load) Metrics:', {
        RPS: metrics.requestsPerSecond.toFixed(2),
        P95Response: `${metrics.p95ResponseTime.toFixed(2)}ms`,
        ErrorRate: `${metrics.errorRate.toFixed(2)}%`,
        Memory: `${metrics.memoryUsage.toFixed(2)}MB`,
        PayloadSize: `${metrics.networkPayloadSize.toFixed(0)} bytes`
      })
    })
  })

  describe('Database Query Performance', () => {
    it('should measure simple query performance', async () => {
      const queryMetrics = await loadTestRunner.measureDatabaseQueryPerformance(
        mockDatabaseQueries.findCourses,
        200
      )

      expect(queryMetrics.averageTime).toBeLessThan(100) // < 100ms per spec
      expect(queryMetrics.p95Time).toBeLessThan(150) // < 150ms p95
      expect(queryMetrics.queriesPerSecond).toBeGreaterThan(10) // > 10 QPS

      console.log('Simple Database Query Metrics:', {
        AvgTime: `${queryMetrics.averageTime.toFixed(2)}ms`,
        P95Time: `${queryMetrics.p95Time.toFixed(2)}ms`,
        QPS: queryMetrics.queriesPerSecond.toFixed(2)
      })
    })

    it('should measure complex query performance', async () => {
      const queryMetrics = await loadTestRunner.measureDatabaseQueryPerformance(
        mockDatabaseQueries.complexJoinQuery,
        100
      )

      expect(queryMetrics.averageTime).toBeLessThan(100) // < 100ms per spec
      expect(queryMetrics.p95Time).toBeLessThan(200) // < 200ms p95 for complex queries

      console.log('Complex Database Query Metrics:', {
        AvgTime: `${queryMetrics.averageTime.toFixed(2)}ms`,
        P95Time: `${queryMetrics.p95Time.toFixed(2)}ms`,
        QPS: queryMetrics.queriesPerSecond.toFixed(2)
      })
    })
  })

  describe('WebSocket Connection Limits', () => {
    it('should measure WebSocket connection capacity', async () => {
      const connectionMetrics = await loadTestRunner.measureWebSocketConnectionLimits(
        mockWebSocketConnection.create,
        60 // Test up to 60 connections (above the 50 user limit)
      )

      expect(connectionMetrics.maxConcurrentConnections).toBeGreaterThanOrEqual(50)
      expect(connectionMetrics.connectionTime).toBeLessThan(200) // < 200ms to establish
      expect(connectionMetrics.memoryPerConnection).toBeLessThan(5) // < 5MB per connection

      console.log('WebSocket Connection Metrics:', {
        MaxConnections: connectionMetrics.maxConcurrentConnections,
        ConnectionTime: `${connectionMetrics.connectionTime.toFixed(2)}ms`,
        MemoryPerConnection: `${connectionMetrics.memoryPerConnection.toFixed(2)}MB`
      })
    })
  })

  describe('Network Payload Analysis', () => {
    it('should analyze API response payload sizes', async () => {
      const metrics = await loadTestRunner.simulateConcurrentUsers(
        5,
        3000,
        mockApiEndpoints.getCourses
      )

      // Network payload should be reasonable (< 500KB per spec)
      expect(metrics.networkPayloadSize).toBeLessThan(500000) // 500KB
      
      console.log('Network Payload Analysis:', {
        AvgPayloadSize: `${(metrics.networkPayloadSize / 1024).toFixed(2)}KB`,
        PayloadLimit: '500KB'
      })
    })

    it('should analyze schedule creation payload sizes', async () => {
      const metrics = await loadTestRunner.simulateConcurrentUsers(
        3,
        5000,
        () => mockApiEndpoints.createSchedule({
          name: 'Large Schedule',
          courses: Array.from({ length: 50 }, (_, i) => `course-${i}`)
        })
      )

      // Schedule creation payloads will be larger but should still be reasonable
      expect(metrics.networkPayloadSize).toBeLessThan(1000000) // 1MB
      
      console.log('Schedule Creation Payload Analysis:', {
        AvgPayloadSize: `${(metrics.networkPayloadSize / 1024).toFixed(2)}KB`,
        PayloadLimit: '1MB'
      })
    })
  })

  describe('Resource Utilization Under Load', () => {
    it('should monitor memory usage under sustained load', async () => {
      const initialMemory = loadTestRunner['getCurrentMemoryUsage']()
      
      // Run sustained load test
      const metrics = await loadTestRunner.simulateConcurrentUsers(
        20,
        30000, // 30 second sustained test
        mockApiEndpoints.getCourses
      )

      const memoryIncrease = metrics.memoryUsage - initialMemory
      
      // Memory should not increase dramatically under sustained load
      expect(memoryIncrease).toBeLessThan(100) // < 100MB increase
      expect(metrics.memoryUsage).toBeLessThan(512) // < 512MB total per spec

      console.log('Sustained Load Memory Analysis:', {
        InitialMemory: `${initialMemory.toFixed(2)}MB`,
        FinalMemory: `${metrics.memoryUsage.toFixed(2)}MB`,
        MemoryIncrease: `${memoryIncrease.toFixed(2)}MB`,
        MemoryLimit: '512MB'
      })
    })

    it('should validate performance under mixed workload', async () => {
      // Simulate mixed workload: reads and writes
      const readMetrics = await loadTestRunner.simulateConcurrentUsers(
        15,
        5000,
        mockApiEndpoints.getCourses
      )

      const writeMetrics = await loadTestRunner.simulateConcurrentUsers(
        10,
        5000,
        () => mockApiEndpoints.createSchedule({ name: 'Mixed Workload Schedule' })
      )

      // Both read and write operations should perform well
      expect(readMetrics.averageResponseTime).toBeLessThan(200)
      expect(writeMetrics.averageResponseTime).toBeLessThan(500)
      expect(readMetrics.errorRate + writeMetrics.errorRate).toBeLessThan(10)

      console.log('Mixed Workload Results:', {
        ReadAvgTime: `${readMetrics.averageResponseTime.toFixed(2)}ms`,
        WriteAvgTime: `${writeMetrics.averageResponseTime.toFixed(2)}ms`,
        CombinedErrorRate: `${((readMetrics.errorRate + writeMetrics.errorRate) / 2).toFixed(2)}%`
      })
    })
  })

  describe('Scalability Validation', () => {
    it('should validate scalability requirements', async () => {
      const scalabilityTests = [
        { users: 10, expectedRPS: 20 },
        { users: 25, expectedRPS: 40 },
        { users: 50, expectedRPS: 60 }
      ]

      const results = []

      for (const test of scalabilityTests) {
        const metrics = await loadTestRunner.simulateConcurrentUsers(
          test.users,
          10000,
          mockApiEndpoints.getCourses
        )

        results.push({
          users: test.users,
          actualRPS: metrics.requestsPerSecond,
          responseTime: metrics.averageResponseTime,
          errorRate: metrics.errorRate
        })

        // Performance should degrade gracefully
        expect(metrics.errorRate).toBeLessThan(20) // Allow up to 20% error rate at high load
        expect(metrics.averageResponseTime).toBeLessThan(1000) // Response should stay under 1s
      }

      console.log('Scalability Test Results:')
      results.forEach(result => {
        console.log(`  ${result.users} users: ${result.actualRPS.toFixed(2)} RPS, ${result.responseTime.toFixed(2)}ms avg, ${result.errorRate.toFixed(2)}% errors`)
      })

      // Verify scalability curve is reasonable
      const performanceDegradation = results[2].responseTime / results[0].responseTime
      expect(performanceDegradation).toBeLessThan(10) // No more than 10x degradation from 10 to 50 users
    })
  })
})

export { LoadTestRunner, type LoadTestMetrics, type LoadTestResult }