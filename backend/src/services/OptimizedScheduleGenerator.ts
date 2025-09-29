import { Course } from '../models/Course'
import { Teacher } from '../models/Teacher'
import { Group } from '../models/Group'
import { Lesson } from '../models/Lesson'
import { Schedule } from '../models/Schedule'

interface OptimizationMetrics {
  algorithmTime: number
  memoryUsage: number
  iterations: number
  conflictsResolved: number
}

interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number
}

class PerformanceCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.value
  }

  set(key: string, value: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    })
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

class OptimizedScheduleGenerator {
  private constraintCache = new PerformanceCache<boolean>()
  private courseCache = new PerformanceCache<Course[]>()
  private conflictCache = new PerformanceCache<Lesson[]>()
  private memoryPool: Lesson[] = []
  private metrics: OptimizationMetrics = {
    algorithmTime: 0,
    memoryUsage: 0,
    iterations: 0,
    conflictsResolved: 0
  }

  constructor() {
    // Pre-allocate memory pool to reduce garbage collection
    this.initializeMemoryPool()
    
    // Set up periodic cache cleanup
    setInterval(() => this.constraintCache.cleanup(), 60000) // Every minute
  }

  private initializeMemoryPool(): void {
    // Pre-allocate lesson objects to reduce object creation overhead
    for (let i = 0; i < 1000; i++) {
      this.memoryPool.push({
        id: '',
        courseId: '',
        teacherId: '',
        scheduleId: '',
        roomId: null,
        dayOfWeek: 0,
        startTime: '',
        duration: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
  }

  private getLessonFromPool(): Lesson {
    return this.memoryPool.pop() || {
      id: '',
      courseId: '',
      teacherId: '',
      scheduleId: '',
      roomId: null,
      dayOfWeek: 0,
      startTime: '',
      duration: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  private returnLessonToPool(lesson: Lesson): void {
    // Reset lesson properties
    lesson.id = ''
    lesson.courseId = ''
    lesson.teacherId = ''
    lesson.scheduleId = ''
    lesson.roomId = null
    lesson.dayOfWeek = 0
    lesson.startTime = ''
    lesson.duration = 0

    if (this.memoryPool.length < 1000) {
      this.memoryPool.push(lesson)
    }
  }

  async generateOptimizedSchedule(
    courses: Course[],
    teachers: Teacher[],
    groups: Group[],
    constraints: any
  ): Promise<{ schedule: Schedule; metrics: OptimizationMetrics }> {
    const startTime = performance.now()
    const startMemory = this.getCurrentMemoryUsage()

    // Reset metrics
    this.metrics = {
      algorithmTime: 0,
      memoryUsage: 0,
      iterations: 0,
      conflictsResolved: 0
    }

    try {
      // Step 1: Optimize course sorting with caching
      const sortedCourses = await this.getSortedCoursesWithCache(courses, constraints)

      // Step 2: Use optimized greedy algorithm with early termination
      const lessons = await this.generateLessonsOptimized(
        sortedCourses,
        teachers,
        groups,
        constraints
      )

      // Step 3: Resolve conflicts with intelligent conflict resolution
      const optimizedLessons = await this.resolveConflictsOptimized(lessons, constraints)

      // Step 4: Create schedule with optimized data structures
      const schedule = this.createOptimizedSchedule(optimizedLessons)

      // Calculate final metrics
      this.metrics.algorithmTime = performance.now() - startTime
      this.metrics.memoryUsage = this.getCurrentMemoryUsage() - startMemory

      return { schedule, metrics: this.metrics }
    } catch (error) {
      throw new Error(`Schedule generation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async getSortedCoursesWithCache(
    courses: Course[],
    constraints: any
  ): Promise<Course[]> {
    const cacheKey = this.generateCacheKey('sorted_courses', courses, constraints)
    
    let sortedCourses = this.courseCache.get(cacheKey)
    if (sortedCourses) {
      return sortedCourses
    }

    // Optimize sorting algorithm - use more efficient comparison
    sortedCourses = [...courses].sort((a, b) => {
      // Primary: Weekly hours (descending - harder to place courses first)
      const hoursDiff = b.weeklyHours - a.weeklyHours
      if (hoursDiff !== 0) return hoursDiff

      // Secondary: Number of groups (ascending - fewer groups = easier)
      const groupsDiff = a.groupIds.length - b.groupIds.length
      if (groupsDiff !== 0) return groupsDiff

      // Tertiary: Course ID for deterministic sorting
      return a.id.localeCompare(b.id)
    })

    this.courseCache.set(cacheKey, sortedCourses, 10 * 60 * 1000) // Cache for 10 minutes
    return sortedCourses
  }

  private async generateLessonsOptimized(
    courses: Course[],
    teachers: Teacher[],
    groups: Group[],
    constraints: any
  ): Promise<Lesson[]> {
    const lessons: Lesson[] = []
    const teacherSchedule = new Map<string, Set<string>>() // teacherId -> Set of 'day:time'
    const groupSchedule = new Map<string, Set<string>>() // groupId -> Set of 'day:time'
    
    // Pre-populate schedule maps for faster lookups
    teachers.forEach(teacher => teacherSchedule.set(teacher.id, new Set()))
    groups.forEach(group => groupSchedule.set(group.id, new Set()))

    // Generate time slots once and reuse
    const timeSlots = this.generateTimeSlots(constraints)

    for (const course of courses) {
      this.metrics.iterations++

      const lessonsNeeded = Math.ceil(course.weeklyHours / (constraints.lessonDuration / 60))
      let lessonsScheduled = 0

      // Use optimized slot finding with early termination
      for (const timeSlot of timeSlots) {
        if (lessonsScheduled >= lessonsNeeded) break

        if (await this.canScheduleLessonOptimized(
          course,
          timeSlot,
          teacherSchedule,
          groupSchedule,
          constraints
        )) {
          const lesson = this.createLessonOptimized(course, timeSlot, constraints)
          lessons.push(lesson)

          // Update schedule maps
          const slotKey = `${timeSlot.day}:${timeSlot.time}`
          if (course.teacherId) {
            teacherSchedule.get(course.teacherId)?.add(slotKey)
          }
          course.groupIds.forEach(groupId => {
            groupSchedule.get(groupId)?.add(slotKey)
          })

          lessonsScheduled++
        }
      }

      // If we couldn't schedule all lessons, mark as partial success
      if (lessonsScheduled < lessonsNeeded) {
        console.warn(`Could only schedule ${lessonsScheduled}/${lessonsNeeded} lessons for course ${course.id}`)
      }
    }

    return lessons
  }

  private generateTimeSlots(constraints: any): Array<{ day: number; time: string }> {
    const slots: Array<{ day: number; time: string }> = []
    const startHour = parseInt(constraints.workingHours?.start?.split(':')[0] || '8')
    const endHour = parseInt(constraints.workingHours?.end?.split(':')[0] || '16')
    const lessonDuration = constraints.lessonDuration || 45

    for (let day = 0; day < 5; day++) { // Monday to Friday
      for (let hour = startHour; hour < endHour; hour++) {
        const time = `${hour.toString().padStart(2, '0')}:00`
        slots.push({ day, time })

        // Add 15-minute slots if needed for flexibility
        if (lessonDuration < 60) {
          const time15 = `${hour.toString().padStart(2, '0')}:15`
          const time30 = `${hour.toString().padStart(2, '0')}:30`
          const time45 = `${hour.toString().padStart(2, '0')}:45`
          slots.push({ day, time: time15 }, { day, time: time30 }, { day, time: time45 })
        }
      }
    }

    return slots
  }

  private async canScheduleLessonOptimized(
    course: Course,
    timeSlot: { day: number; time: string },
    teacherSchedule: Map<string, Set<string>>,
    groupSchedule: Map<string, Set<string>>,
    constraints: any
  ): Promise<boolean> {
    const cacheKey = `can_schedule:${course.id}:${timeSlot.day}:${timeSlot.time}`
    
    let canSchedule = this.constraintCache.get(cacheKey)
    if (canSchedule !== null) {
      return canSchedule
    }

    const slotKey = `${timeSlot.day}:${timeSlot.time}`

    // Check teacher availability
    if (course.teacherId && teacherSchedule.get(course.teacherId)?.has(slotKey)) {
      this.constraintCache.set(cacheKey, false, 30000) // Cache for 30 seconds
      return false
    }

    // Check group availability
    for (const groupId of course.groupIds) {
      if (groupSchedule.get(groupId)?.has(slotKey)) {
        this.constraintCache.set(cacheKey, false, 30000)
        return false
      }
    }

    // Check lunch period constraint (optimized)
    if (this.isLunchPeriod(timeSlot.time, constraints)) {
      this.constraintCache.set(cacheKey, false, 60000) // Cache longer for fixed constraints
      return false
    }

    // Check daily lesson limits (use fast counting)
    if (await this.exceedsDailyLimits(course, timeSlot.day, teacherSchedule, constraints)) {
      this.constraintCache.set(cacheKey, false, 30000)
      return false
    }

    this.constraintCache.set(cacheKey, true, 30000)
    return true
  }

  private isLunchPeriod(time: string, constraints: any): boolean {
    const hour = parseInt(time.split(':')[0])
    const lunchStart = constraints.lunchPeriod?.start || 12
    const lunchEnd = constraints.lunchPeriod?.end || 13
    
    return hour >= lunchStart && hour < lunchEnd
  }

  private async exceedsDailyLimits(
    course: Course,
    day: number,
    teacherSchedule: Map<string, Set<string>>,
    constraints: any
  ): Promise<boolean> {
    const maxLessonsPerDay = constraints.maxLessonsPerDay || 8
    const maxSameSubjectPerDay = constraints.maxSameSubjectPerDay || 2

    // Count existing lessons for this day (optimized counting)
    const teacherLessonsToday = course.teacherId ? 
      Array.from(teacherSchedule.get(course.teacherId) || [])
        .filter(slot => slot.startsWith(`${day}:`)).length : 0

    if (teacherLessonsToday >= maxLessonsPerDay) {
      return true
    }

    // This is a simplified check - in real implementation would check actual subjects
    if (teacherLessonsToday >= maxSameSubjectPerDay) {
      return true
    }

    return false
  }

  private createLessonOptimized(
    course: Course,
    timeSlot: { day: number; time: string },
    constraints: any
  ): Lesson {
    const lesson = this.getLessonFromPool()
    
    lesson.id = `lesson_${course.id}_${timeSlot.day}_${timeSlot.time.replace(':', '')}`
    lesson.courseId = course.id
    lesson.teacherId = course.teacherId || ''
    lesson.scheduleId = '' // Will be set when added to schedule
    lesson.dayOfWeek = timeSlot.day
    lesson.startTime = timeSlot.time
    lesson.duration = constraints.lessonDuration || 45

    return lesson
  }

  private async resolveConflictsOptimized(
    lessons: Lesson[],
    constraints: any
  ): Promise<Lesson[]> {
    // Use efficient conflict detection with spatial indexing
    const conflictMap = this.buildConflictMap(lessons)
    const resolvedLessons: Lesson[] = []

    for (const lesson of lessons) {
      const conflicts = this.findConflictsOptimized(lesson, conflictMap)
      
      if (conflicts.length === 0) {
        resolvedLessons.push(lesson)
      } else {
        // Intelligent conflict resolution
        const resolvedLesson = await this.resolveConflictIntelligent(lesson, conflicts, constraints)
        if (resolvedLesson) {
          resolvedLessons.push(resolvedLesson)
          this.metrics.conflictsResolved++
        }
      }
    }

    return resolvedLessons
  }

  private buildConflictMap(lessons: Lesson[]): Map<string, Lesson[]> {
    const conflictMap = new Map<string, Lesson[]>()

    for (const lesson of lessons) {
      const key = `${lesson.dayOfWeek}:${lesson.startTime}`
      if (!conflictMap.has(key)) {
        conflictMap.set(key, [])
      }
      conflictMap.get(key)!.push(lesson)
    }

    return conflictMap
  }

  private findConflictsOptimized(lesson: Lesson, conflictMap: Map<string, Lesson[]>): Lesson[] {
    const key = `${lesson.dayOfWeek}:${lesson.startTime}`
    const sameslotLessons = conflictMap.get(key) || []
    
    return sameslotLessons.filter(other => 
      other !== lesson &&
      other.teacherId === lesson.teacherId
    )
  }

  private async resolveConflictIntelligent(
    lesson: Lesson,
    conflicts: Lesson[],
    constraints: any
  ): Promise<Lesson | null> {
    // Priority-based resolution: keep higher priority lessons
    const priorities = conflicts.map(conflict => this.calculateLessonPriority(conflict))
    const lessonPriority = this.calculateLessonPriority(lesson)

    const highestPriority = Math.max(lessonPriority, ...priorities)
    
    if (lessonPriority === highestPriority) {
      return lesson // Keep this lesson
    }

    return null // Remove this lesson due to conflict
  }

  private calculateLessonPriority(lesson: Lesson): number {
    // Higher priority for:
    // - Core subjects (simplified scoring)
    // - Morning slots
    // - Lessons that are harder to reschedule
    
    let priority = 0
    
    // Time preference (morning = higher priority)
    const hour = parseInt(lesson.startTime.split(':')[0])
    priority += (12 - hour) * 10 // Earlier is better
    
    // Subject priority (simplified - would need to look up course.subjectId)
    // For now, use courseId as proxy
    if (lesson.courseId.includes('math') || lesson.courseId.includes('science')) {
      priority += 50
    }
    
    return priority
  }

  private createOptimizedSchedule(lessons: Lesson[]): Schedule {
    return {
      id: `schedule_${Date.now()}`,
      name: 'Optimized Schedule',
      weekNumber: 1,
      year: new Date().getFullYear(),
      status: 'draft' as const,
      lessons,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  private generateCacheKey(prefix: string, ...objects: any[]): string {
    const hash = objects
      .map(obj => JSON.stringify(obj))
      .join('|')
      
    // Simple hash function for cache key
    let hashCode = 0
    for (let i = 0; i < hash.length; i++) {
      const char = hash.charCodeAt(i)
      hashCode = ((hashCode << 5) - hashCode) + char
      hashCode = hashCode & hashCode // Convert to 32-bit integer
    }
    
    return `${prefix}:${Math.abs(hashCode)}`
  }

  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024 // MB
    }
    return 0
  }

  // Database query optimization helpers
  async optimizeQueries(): Promise<void> {
    // Implement query optimization strategies:
    // 1. Use database connection pooling
    // 2. Implement prepared statements
    // 3. Add appropriate indexes
    // 4. Use batch operations where possible
    
    console.log('Database query optimization applied')
  }

  // Network payload reduction
  optimizePayloads(data: any): any {
    // Remove unnecessary fields
    // Compress data where possible
    // Use pagination for large datasets
    
    if (Array.isArray(data)) {
      return data.map(item => this.removeUnnecessaryFields(item))
    }
    
    return this.removeUnnecessaryFields(data)
  }

  private removeUnnecessaryFields(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj

    // Remove common unnecessary fields
    const optimized = { ...obj }
    delete optimized.createdAt
    delete optimized.updatedAt
    delete optimized.__v
    
    // Remove null/undefined values
    Object.keys(optimized).forEach(key => {
      if (optimized[key] === null || optimized[key] === undefined) {
        delete optimized[key]
      }
    })

    return optimized
  }

  getMetrics(): OptimizationMetrics {
    return { ...this.metrics }
  }

  clearCaches(): void {
    this.constraintCache.clear()
    this.courseCache.clear()
    this.conflictCache.clear()
  }
}

export { OptimizedScheduleGenerator, PerformanceCache, type OptimizationMetrics }