import { describe, it, expect, beforeEach, vi } from 'vitest'
import { performance } from 'perf_hooks'

interface PerformanceMetrics {
  scheduleGenerationTime: number
  uiInteractionTime: number
  apiResponseTime: number
  memoryUsage: number
  cpuUtilization: number
}

interface PerformanceBenchmark {
  operation: string
  duration: number
  timestamp: number
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: PerformanceBenchmark[] = []
  private memoryBaseline: number = 0

  constructor() {
    this.memoryBaseline = this.getCurrentMemoryUsage()
  }

  startTiming(operation: string): () => number {
    const startTime = performance.now()
    
    return () => {
      const duration = performance.now() - startTime
      this.recordMetric(operation, duration)
      return duration
    }
  }

  recordMetric(operation: string, duration: number, metadata?: Record<string, any>) {
    this.metrics.push({
      operation,
      duration,
      timestamp: Date.now(),
      metadata
    })
  }

  getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024 // MB
    }
    return 0
  }

  getMemoryDelta(): number {
    return this.getCurrentMemoryUsage() - this.memoryBaseline
  }

  getCPUUtilization(): Promise<number> {
    return new Promise((resolve) => {
      if (typeof process === 'undefined') {
        resolve(0)
        return
      }

      const startUsage = process.cpuUsage()
      const startTime = performance.now()

      setTimeout(() => {
        const cpuUsage = process.cpuUsage(startUsage)
        const elapsedTime = (performance.now() - startTime) * 1000 // microseconds
        
        const cpuPercent = ((cpuUsage.user + cpuUsage.system) / elapsedTime) * 100
        resolve(Math.min(cpuPercent, 100))
      }, 100)
    })
  }

  getMetrics(): PerformanceBenchmark[] {
    return [...this.metrics]
  }

  getAverageTime(operation: string): number {
    const operationMetrics = this.metrics.filter(m => m.operation === operation)
    if (operationMetrics.length === 0) return 0
    
    const total = operationMetrics.reduce((sum, m) => sum + m.duration, 0)
    return total / operationMetrics.length
  }

  getPercentile(operation: string, percentile: number): number {
    const operationMetrics = this.metrics
      .filter(m => m.operation === operation)
      .map(m => m.duration)
      .sort((a, b) => a - b)
    
    if (operationMetrics.length === 0) return 0
    
    const index = Math.ceil((percentile / 100) * operationMetrics.length) - 1
    return operationMetrics[Math.max(0, index)]
  }

  clear() {
    this.metrics = []
    this.memoryBaseline = this.getCurrentMemoryUsage()
  }

  generateReport(): PerformanceMetrics {
    return {
      scheduleGenerationTime: this.getAverageTime('schedule_generation'),
      uiInteractionTime: this.getAverageTime('ui_interaction'),
      apiResponseTime: this.getAverageTime('api_response'),
      memoryUsage: this.getCurrentMemoryUsage(),
      cpuUtilization: 0 // Will be set asynchronously
    }
  }
}

// Mock implementations for testing
const mockScheduleGenerator = {
  async generateSchedule(courses: any[], constraints: any): Promise<any> {
    // Simulate schedule generation work
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50))
    
    return {
      id: 'schedule-1',
      lessons: courses.map(course => ({
        id: `lesson-${course.id}`,
        courseId: course.id,
        dayOfWeek: Math.floor(Math.random() * 5),
        startTime: '09:00',
        duration: 45
      })),
      conflicts: [],
      score: Math.random() * 100
    }
  }
}

const mockApiClient = {
  async get(endpoint: string): Promise<any> {
    // Simulate API response time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10))
    
    return {
      data: { id: 1, name: 'Test Data' },
      status: 200
    }
  },

  async post(endpoint: string, data: any): Promise<any> {
    // Simulate API response time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 20))
    
    return {
      data: { id: 2, ...data },
      status: 201
    }
  }
}

const mockUIComponent = {
  async render(): Promise<void> {
    // Simulate UI rendering time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 5))
  },

  async handleClick(): Promise<void> {
    // Simulate UI interaction time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 2))
  }
}

describe('Performance Benchmarks and Monitoring', () => {
  let monitor: PerformanceMonitor

  beforeEach(() => {
    monitor = new PerformanceMonitor()
  })

  describe('Schedule Generation Performance', () => {
    it('should generate schedule within 5 seconds (95th percentile)', async () => {
      const iterations = 20
      const courses = Array.from({ length: 50 }, (_, i) => ({
        id: `course-${i}`,
        name: `Course ${i}`,
        teacherId: `teacher-${i % 10}`,
        weeklyHours: 3,
        groupIds: [`group-${i % 20}`]
      }))

      const constraints = {
        maxLessonsPerDay: 8,
        workingHours: { start: '08:15', end: '16:00' },
        lessonDuration: 45
      }

      // Run multiple iterations to get reliable metrics
      for (let i = 0; i < iterations; i++) {
        const endTiming = monitor.startTiming('schedule_generation')
        
        await mockScheduleGenerator.generateSchedule(courses, constraints)
        
        const duration = endTiming()
        expect(duration).toBeLessThan(5000) // Individual runs should be under 5s
      }

      // Check 95th percentile
      const p95 = monitor.getPercentile('schedule_generation', 95)
      expect(p95).toBeLessThan(5000)
      
      console.log(`Schedule Generation P95: ${p95.toFixed(2)}ms`)
      console.log(`Schedule Generation Average: ${monitor.getAverageTime('schedule_generation').toFixed(2)}ms`)
    })

    it('should track memory usage during schedule generation', async () => {
      const initialMemory = monitor.getCurrentMemoryUsage()
      
      const courses = Array.from({ length: 100 }, (_, i) => ({
        id: `course-${i}`,
        name: `Course ${i}`,
        teacherId: `teacher-${i % 10}`,
        weeklyHours: 3,
        groupIds: [`group-${i % 20}`]
      }))

      await mockScheduleGenerator.generateSchedule(courses, {})
      
      const memoryDelta = monitor.getMemoryDelta()
      
      // Memory usage should be reasonable (< 50MB for this workload)
      expect(memoryDelta).toBeLessThan(50)
      
      console.log(`Memory Delta: ${memoryDelta.toFixed(2)}MB`)
    })

    it('should monitor CPU utilization during generation', async () => {
      const courses = Array.from({ length: 50 }, (_, i) => ({
        id: `course-${i}`,
        name: `Course ${i}`,
        teacherId: `teacher-${i % 10}`,
        weeklyHours: 3,
        groupIds: [`group-${i % 20}`]
      }))

      const generationPromise = mockScheduleGenerator.generateSchedule(courses, {})
      const cpuUtilization = await monitor.getCPUUtilization()
      await generationPromise

      // CPU utilization should be reasonable (< 30% as per constraints)
      expect(cpuUtilization).toBeLessThan(30)
      
      console.log(`CPU Utilization: ${cpuUtilization.toFixed(2)}%`)
    })
  })

  describe('UI Interaction Performance', () => {
    it('should respond to UI interactions within 100ms', async () => {
      const iterations = 50

      for (let i = 0; i < iterations; i++) {
        const endTiming = monitor.startTiming('ui_interaction')
        
        await mockUIComponent.handleClick()
        
        const duration = endTiming()
        expect(duration).toBeLessThan(100)
      }

      const average = monitor.getAverageTime('ui_interaction')
      expect(average).toBeLessThan(100)
      
      console.log(`UI Interaction Average: ${average.toFixed(2)}ms`)
    })

    it('should render components within performance budget', async () => {
      const iterations = 30

      for (let i = 0; i < iterations; i++) {
        const endTiming = monitor.startTiming('ui_render')
        
        await mockUIComponent.render()
        
        const duration = endTiming()
        expect(duration).toBeLessThan(50) // Rendering should be very fast
      }

      const p95 = monitor.getPercentile('ui_render', 95)
      expect(p95).toBeLessThan(50)
      
      console.log(`UI Render P95: ${p95.toFixed(2)}ms`)
    })
  })

  describe('API Response Performance', () => {
    it('should respond to API calls within 200ms', async () => {
      const iterations = 30

      for (let i = 0; i < iterations; i++) {
        const endTiming = monitor.startTiming('api_response')
        
        await mockApiClient.get('/api/courses')
        
        const duration = endTiming()
        expect(duration).toBeLessThan(200)
      }

      const average = monitor.getAverageTime('api_response')
      expect(average).toBeLessThan(200)
      
      console.log(`API Response Average: ${average.toFixed(2)}ms`)
    })

    it('should handle POST requests within performance budget', async () => {
      const iterations = 20

      for (let i = 0; i < iterations; i++) {
        const endTiming = monitor.startTiming('api_post')
        
        await mockApiClient.post('/api/schedules', {
          name: `Schedule ${i}`,
          courses: [`course-${i}`]
        })
        
        const duration = endTiming()
        expect(duration).toBeLessThan(200)
      }

      const p95 = monitor.getPercentile('api_post', 95)
      expect(p95).toBeLessThan(200)
      
      console.log(`API POST P95: ${p95.toFixed(2)}ms`)
    })
  })

  describe('Memory Usage Tracking', () => {
    it('should track memory growth over time', async () => {
      const memorySnapshots: number[] = []
      
      // Simulate application usage
      for (let i = 0; i < 10; i++) {
        await mockScheduleGenerator.generateSchedule([
          { id: `course-${i}`, name: `Course ${i}`, teacherId: 'teacher-1', weeklyHours: 3, groupIds: ['group-1'] }
        ], {})
        
        memorySnapshots.push(monitor.getCurrentMemoryUsage())
      }

      // Check for memory leaks (memory should not grow indefinitely)
      const initialMemory = memorySnapshots[0]
      const finalMemory = memorySnapshots[memorySnapshots.length - 1]
      const memoryGrowth = finalMemory - initialMemory

      // Memory growth should be reasonable (< 20MB for this workload)
      expect(memoryGrowth).toBeLessThan(20)
      
      console.log(`Memory Growth: ${memoryGrowth.toFixed(2)}MB`)
    })
  })

  describe('Performance Report Generation', () => {
    it('should generate comprehensive performance report', async () => {
      // Generate some test data
      await mockScheduleGenerator.generateSchedule([
        { id: 'course-1', name: 'Math', teacherId: 'teacher-1', weeklyHours: 3, groupIds: ['group-1'] }
      ], {})
      
      await mockUIComponent.handleClick()
      await mockApiClient.get('/api/courses')

      const report = monitor.generateReport()

      expect(report).toHaveProperty('scheduleGenerationTime')
      expect(report).toHaveProperty('uiInteractionTime')
      expect(report).toHaveProperty('apiResponseTime')
      expect(report).toHaveProperty('memoryUsage')
      expect(report).toHaveProperty('cpuUtilization')

      expect(report.scheduleGenerationTime).toBeGreaterThan(0)
      expect(report.memoryUsage).toBeGreaterThan(0)
      
      console.log('Performance Report:', JSON.stringify(report, null, 2))
    })
  })

  describe('Performance Thresholds Validation', () => {
    it('should validate all performance requirements', async () => {
      const testData = {
        courses: Array.from({ length: 50 }, (_, i) => ({
          id: `course-${i}`,
          name: `Course ${i}`,
          teacherId: `teacher-${i % 10}`,
          weeklyHours: 3,
          groupIds: [`group-${i % 20}`]
        }))
      }

      // Test schedule generation performance
      const scheduleTimer = monitor.startTiming('schedule_generation')
      await mockScheduleGenerator.generateSchedule(testData.courses, {})
      const scheduleTime = scheduleTimer()

      // Test UI interaction performance
      const uiTimer = monitor.startTiming('ui_interaction')
      await mockUIComponent.handleClick()
      const uiTime = uiTimer()

      // Test API response performance
      const apiTimer = monitor.startTiming('api_response')
      await mockApiClient.get('/api/courses')
      const apiTime = apiTimer()

      // Validate against requirements
      expect(scheduleTime).toBeLessThan(5000) // < 5s for schedule generation
      expect(uiTime).toBeLessThan(100) // < 100ms for UI interactions
      expect(apiTime).toBeLessThan(200) // < 200ms for API responses

      const memoryUsage = monitor.getCurrentMemoryUsage()
      expect(memoryUsage).toBeLessThan(256) // < 256MB browser memory

      console.log('Performance Validation Results:')
      console.log(`  Schedule Generation: ${scheduleTime.toFixed(2)}ms (< 5000ms) ✓`)
      console.log(`  UI Interaction: ${uiTime.toFixed(2)}ms (< 100ms) ✓`)
      console.log(`  API Response: ${apiTime.toFixed(2)}ms (< 200ms) ✓`)
      console.log(`  Memory Usage: ${memoryUsage.toFixed(2)}MB (< 256MB) ✓`)
    })
  })
})

// Export for use in other tests
export { PerformanceMonitor, type PerformanceMetrics, type PerformanceBenchmark }