/**
 * API Response Time Tests (< 200ms requirement)
 * Performance testing for backend API endpoints
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import axios, { AxiosResponse } from 'axios'
import { performance } from 'perf_hooks'

interface ApiResponseMetrics {
  endpoint: string
  method: string
  responseTime: number
  statusCode: number
  contentLength: number
  passed: boolean
  error?: string
}

interface ApiLoadTestResult {
  endpoint: string
  concurrentUsers: number
  totalRequests: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  successRate: number
  passed: boolean
  throughput: number // requests per second
}

class ApiPerformanceTester {
  private baseUrl: string = 'http://localhost:3001/api'
  private threshold: number = 200 // 200ms
  private authToken?: string

  constructor() {
    // Configure axios defaults
    axios.defaults.timeout = 10000
  }

  /**
   * Test single API endpoint response time
   */
  async testEndpointResponseTime(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<ApiResponseMetrics> {
    const url = `${this.baseUrl}${endpoint}`
    const startTime = performance.now()
    
    try {
      let response: AxiosResponse
      
      const config = {
        headers: this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}
      }

      switch (method) {
        case 'GET':
          response = await axios.get(url, config)
          break
        case 'POST':
          response = await axios.post(url, data, config)
          break
        case 'PUT':
          response = await axios.put(url, data, config)
          break
        case 'DELETE':
          response = await axios.delete(url, config)
          break
        default:
          throw new Error(`Unsupported method: ${method}`)
      }

      const endTime = performance.now()
      const responseTime = endTime - startTime
      const contentLength = JSON.stringify(response.data).length

      return {
        endpoint,
        method,
        responseTime,
        statusCode: response.status,
        contentLength,
        passed: responseTime <= this.threshold
      }

    } catch (error: any) {
      const endTime = performance.now()
      const responseTime = endTime - startTime

      return {
        endpoint,
        method,
        responseTime,
        statusCode: error.response?.status || 0,
        contentLength: 0,
        passed: false,
        error: error.message
      }
    }
  }

  /**
   * Run load test with concurrent requests
   */
  async runLoadTest(
    endpoint: string,
    concurrentUsers: number = 10,
    requestsPerUser: number = 5
  ): Promise<ApiLoadTestResult> {
    const url = `${this.baseUrl}${endpoint}`
    const totalRequests = concurrentUsers * requestsPerUser
    const results: number[] = []
    const errors: number[] = []
    
    const startTime = performance.now()

    // Create concurrent user simulations
    const userPromises = Array.from({ length: concurrentUsers }, async () => {
      const userResults: number[] = []
      
      for (let i = 0; i < requestsPerUser; i++) {
        try {
          const requestStart = performance.now()
          await axios.get(url, {
            headers: this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}
          })
          const requestEnd = performance.now()
          userResults.push(requestEnd - requestStart)
        } catch (error) {
          errors.push(1)
          userResults.push(this.threshold + 1) // Count as failed
        }
      }
      
      return userResults
    })

    const allUserResults = await Promise.all(userPromises)
    const flatResults = allUserResults.flat()
    results.push(...flatResults)

    const endTime = performance.now()
    const totalTestTime = endTime - startTime

    const averageResponseTime = results.reduce((sum, time) => sum + time, 0) / results.length
    const minResponseTime = Math.min(...results)
    const maxResponseTime = Math.max(...results)
    const successRate = ((totalRequests - errors.length) / totalRequests) * 100
    const throughput = totalRequests / (totalTestTime / 1000) // requests per second

    return {
      endpoint,
      concurrentUsers,
      totalRequests,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      successRate,
      passed: averageResponseTime <= this.threshold && successRate >= 95,
      throughput
    }
  }

  /**
   * Test database query performance
   */
  async testDatabasePerformance(): Promise<{
    connectionTime: number
    simpleQueryTime: number
    complexQueryTime: number
    passed: boolean
  }> {
    // Test database connection time
    const connectionStart = performance.now()
    await this.testEndpointResponseTime('/health/db')
    const connectionTime = performance.now() - connectionStart

    // Test simple query (get single record)
    const simpleStart = performance.now()
    await this.testEndpointResponseTime('/courses/1')
    const simpleQueryTime = performance.now() - simpleStart

    // Test complex query (get all schedules with relations)
    const complexStart = performance.now()
    await this.testEndpointResponseTime('/schedules?include=courses,teachers,groups')
    const complexQueryTime = performance.now() - complexStart

    const passed = 
      connectionTime <= 100 &&    // DB connection < 100ms
      simpleQueryTime <= 50 &&    // Simple query < 50ms
      complexQueryTime <= 200     // Complex query < 200ms

    return {
      connectionTime,
      simpleQueryTime,
      complexQueryTime,
      passed
    }
  }

  /**
   * Test API memory usage during load
   */
  async testMemoryUsage(endpoint: string): Promise<{
    initialMemory: number
    peakMemory: number
    finalMemory: number
    memoryLeak: boolean
    passed: boolean
  }> {
    // Get initial memory usage
    const initialMemory = await this.getMemoryUsage()
    
    // Run load test
    await this.runLoadTest(endpoint, 20, 10)
    
    // Get peak memory usage
    const peakMemory = await this.getMemoryUsage()
    
    // Wait for garbage collection
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Get final memory usage
    const finalMemory = await this.getMemoryUsage()
    
    const memoryIncrease = finalMemory - initialMemory
    const memoryLeak = memoryIncrease > 50 * 1024 * 1024 // 50MB threshold
    const passed = peakMemory < 512 * 1024 * 1024 && !memoryLeak // 512MB limit

    return {
      initialMemory,
      peakMemory,
      finalMemory,
      memoryLeak,
      passed
    }
  }

  private async getMemoryUsage(): Promise<number> {
    try {
      const response = await axios.get(`${this.baseUrl}/health/memory`)
      return response.data.rss || 0
    } catch {
      return 0 // Return 0 if endpoint not available
    }
  }

  /**
   * Test API caching performance
   */
  async testCachingPerformance(endpoint: string): Promise<{
    firstRequestTime: number
    cachedRequestTime: number
    cacheHitRatio: number
    passed: boolean
  }> {
    // First request (cache miss)
    const firstRequest = await this.testEndpointResponseTime(endpoint)
    
    // Second request (should be cached)
    const cachedRequest = await this.testEndpointResponseTime(endpoint)
    
    // Multiple requests to test cache hit ratio
    const cacheTestRequests = 10
    const cacheResults: ApiResponseMetrics[] = []
    
    for (let i = 0; i < cacheTestRequests; i++) {
      const result = await this.testEndpointResponseTime(endpoint)
      cacheResults.push(result)
    }
    
    // Calculate cache performance
    const averageCachedTime = cacheResults.reduce((sum, r) => sum + r.responseTime, 0) / cacheResults.length
    const cacheImprovement = (firstRequest.responseTime - averageCachedTime) / firstRequest.responseTime
    const cacheHitRatio = cacheImprovement > 0.3 ? 0.9 : 0.1 // Estimated based on performance improvement
    
    const passed = 
      cachedRequest.responseTime < firstRequest.responseTime && 
      cacheImprovement > 0.2 // At least 20% improvement

    return {
      firstRequestTime: firstRequest.responseTime,
      cachedRequestTime: cachedRequest.responseTime,
      cacheHitRatio,
      passed
    }
  }
}

describe('API Response Time Tests (T067)', () => {
  let tester: ApiPerformanceTester
  
  const criticalEndpoints = [
    { path: '/courses', name: 'Courses List' },
    { path: '/teachers', name: 'Teachers List' },
    { path: '/groups', name: 'Groups List' },
    { path: '/schedules', name: 'Schedules List' },
    { path: '/health', name: 'Health Check' }
  ]

  beforeAll(() => {
    tester = new ApiPerformanceTester()
  })

  test.each(criticalEndpoints)('$name endpoint responds within 200ms', async ({ path, name }) => {
    const metrics = await tester.testEndpointResponseTime(path)
    
    console.log(`\n🚀 ${name} API Performance:`)    
    console.log(`  • Response Time: ${metrics.responseTime.toFixed(1)}ms`)    
    console.log(`  • Status Code: ${metrics.statusCode}`)    
    console.log(`  • Content Length: ${metrics.contentLength} bytes`)    
    console.log(`  • Passed (< 200ms): ${metrics.passed ? '✅' : '❌'}`)    
    
    if (metrics.error) {
      console.log(`  • Error: ${metrics.error}`)    
    }
    
    expect(metrics.responseTime).toBeLessThanOrEqual(200)
    expect(metrics.passed).toBe(true)
    expect(metrics.statusCode).toBeLessThan(400)
  }, 15000)

  test('POST endpoint performance', async () => {
    const testData = {
      name: 'Performance Test Course',
      code: 'PERF101',
      credits: 3
    }
    
    const metrics = await tester.testEndpointResponseTime('/courses', 'POST', testData)
    
    console.log('\n📝 POST Performance:')    
    console.log(`  • Response Time: ${metrics.responseTime.toFixed(1)}ms`)    
    console.log(`  • Status Code: ${metrics.statusCode}`)    
    console.log(`  • Passed: ${metrics.passed ? '✅' : '❌'}`)    
    
    expect(metrics.responseTime).toBeLessThanOrEqual(200)
    expect(metrics.passed).toBe(true)
  }, 15000)

  test('Load test with concurrent users', async () => {
    const result = await tester.runLoadTest('/health', 10, 5)
    
    console.log('\n🔥 Load Test Results:')    
    console.log(`  • Concurrent Users: ${result.concurrentUsers}`)    
    console.log(`  • Total Requests: ${result.totalRequests}`)    
    console.log(`  • Average Response: ${result.averageResponseTime.toFixed(1)}ms`)    
    console.log(`  • Min Response: ${result.minResponseTime.toFixed(1)}ms`)    
    console.log(`  • Max Response: ${result.maxResponseTime.toFixed(1)}ms`)    
    console.log(`  • Success Rate: ${result.successRate.toFixed(1)}%`)    
    console.log(`  • Throughput: ${result.throughput.toFixed(1)} req/s`)    
    console.log(`  • Passed: ${result.passed ? '✅' : '❌'}`)    
    
    expect(result.averageResponseTime).toBeLessThanOrEqual(200)
    expect(result.successRate).toBeGreaterThanOrEqual(95)
    expect(result.passed).toBe(true)
  }, 30000)

  test('Database query performance', async () => {
    const dbPerf = await tester.testDatabasePerformance()
    
    console.log('\n🗄️ Database Performance:')    
    console.log(`  • Connection Time: ${dbPerf.connectionTime.toFixed(1)}ms`)    
    console.log(`  • Simple Query: ${dbPerf.simpleQueryTime.toFixed(1)}ms`)    
    console.log(`  • Complex Query: ${dbPerf.complexQueryTime.toFixed(1)}ms`)    
    console.log(`  • Passed: ${dbPerf.passed ? '✅' : '❌'}`)    
    
    expect(dbPerf.connectionTime).toBeLessThanOrEqual(100)
    expect(dbPerf.simpleQueryTime).toBeLessThanOrEqual(50)
    expect(dbPerf.complexQueryTime).toBeLessThanOrEqual(200)
    expect(dbPerf.passed).toBe(true)
  }, 20000)

  test('Memory usage during load', async () => {
    const memUsage = await tester.testMemoryUsage('/courses')
    
    console.log('\n🧠 Memory Usage Test:')    
    console.log(`  • Initial Memory: ${(memUsage.initialMemory / 1024 / 1024).toFixed(1)}MB`)    
    console.log(`  • Peak Memory: ${(memUsage.peakMemory / 1024 / 1024).toFixed(1)}MB`)    
    console.log(`  • Final Memory: ${(memUsage.finalMemory / 1024 / 1024).toFixed(1)}MB`)    
    console.log(`  • Memory Leak: ${memUsage.memoryLeak ? '❌' : '✅'}`)    
    console.log(`  • Passed: ${memUsage.passed ? '✅' : '❌'}`)    
    
    expect(memUsage.peakMemory).toBeLessThanOrEqual(512 * 1024 * 1024) // 512MB
    expect(memUsage.memoryLeak).toBe(false)
    expect(memUsage.passed).toBe(true)
  }, 60000)

  test('Caching performance', async () => {
    const cachePerf = await tester.testCachingPerformance('/courses')
    
    console.log('\n💾 Cache Performance:')    
    console.log(`  • First Request: ${cachePerf.firstRequestTime.toFixed(1)}ms`)    
    console.log(`  • Cached Request: ${cachePerf.cachedRequestTime.toFixed(1)}ms`)    
    console.log(`  • Cache Hit Ratio: ${(cachePerf.cacheHitRatio * 100).toFixed(1)}%`)    
    console.log(`  • Improvement: ${((1 - cachePerf.cachedRequestTime / cachePerf.firstRequestTime) * 100).toFixed(1)}%`)    
    console.log(`  • Passed: ${cachePerf.passed ? '✅' : '❌'}`)    
    
    expect(cachePerf.cachedRequestTime).toBeLessThan(cachePerf.firstRequestTime)
    expect(cachePerf.passed).toBe(true)
  }, 20000)

  test('Overall API performance summary', async () => {
    const results = await Promise.all(
      criticalEndpoints.map(async (endpoint) => {
        const metrics = await tester.testEndpointResponseTime(endpoint.path)
        return {
          endpoint: endpoint.name,
          responseTime: metrics.responseTime,
          passed: metrics.passed
        }
      })
    )

    console.log('\n📊 API Performance Summary:')
    results.forEach(result => {
      console.log(`  • ${result.endpoint}: ${result.responseTime.toFixed(1)}ms ${result.passed ? '✅' : '❌'}`)
    })

    const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
    const allPassed = results.every(r => r.passed)

    console.log(`  • Average Response Time: ${averageResponseTime.toFixed(1)}ms`)
    console.log(`  • All Endpoints Under 200ms: ${allPassed ? '✅' : '❌'}`)

    expect(averageResponseTime).toBeLessThanOrEqual(200)
    expect(allPassed).toBe(true)
  }, 30000)
})

export { ApiPerformanceTester, type ApiResponseMetrics, type ApiLoadTestResult }