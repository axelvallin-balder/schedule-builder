// Calendar Service - Data transformation and loading logic
// Handles API integration and view model transformation

import { 
  schedulesApi, 
  groupsApi, 
  coursesApi, 
  teachersApi, 
  subjectsApi 
} from './api'
import type { 
  CalendarWeek,
  CalendarLesson,
  CalendarTimeSlot,
  CalendarDay,
  ScheduleOption,
  ClassOption,
  LessonEnrichmentData,
  TimeRange,
  CalendarConfiguration
} from '../types/calendar'

// Default calendar configuration
const DEFAULT_CONFIG: CalendarConfiguration = {
  timeSlotDuration: 15, // 15-minute intervals
  displayTimeRange: { start: '08:00', end: '16:00' },
  workingDays: [1, 2, 3, 4, 5], // Monday to Friday
  gridSlotHeight: 20 // 20px per 15-minute slot
}

export class CalendarService {
  private config: CalendarConfiguration

  constructor(config: Partial<CalendarConfiguration> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Load complete calendar data for a schedule/class combination
   */
  async loadCalendarData(scheduleId: string, classId: string): Promise<CalendarWeek> {
    try {
      // Load primary data in parallel
      const [scheduleResponse, groupsResponse] = await Promise.all([
        this.fetchSchedule(scheduleId),
        this.fetchGroups(classId)
      ])

      const schedule = scheduleResponse
      const groups = groupsResponse

      // Load related data for lesson enrichment
      const [coursesResponse, teachersResponse, subjectsResponse] = await Promise.all([
        this.fetchCourses(groups.map(g => g.id)),
        this.fetchTeachers(),
        this.fetchSubjects()
      ])

      // Transform to calendar view model
      return this.transformToCalendarWeek(
        schedule, 
        groups, 
        coursesResponse, 
        teachersResponse, 
        subjectsResponse
      )
    } catch (error) {
      console.error('Error loading calendar data:', error)
      throw new Error(`Failed to load calendar data: ${error}`)
    }
  }

  /**
   * Transform raw API data to CalendarWeek view model
   */
  private transformToCalendarWeek(
    schedule: any,
    groups: any[],
    courses: any[],
    teachers: any[],
    subjects: any[]
  ): CalendarWeek {
    // Create lookup maps for efficient data access
    const courseMap = new Map(courses.map(c => [c.id, c]))
    const teacherMap = new Map(teachers.map(t => [t.id, t]))
    const subjectMap = new Map(subjects.map(s => [s.id, s]))
    const groupMap = new Map(groups.map(g => [g.id, g]))

    // Transform lessons to CalendarLesson view models
    const calendarLessons: CalendarLesson[] = schedule.lessons
      .filter(this.isValidLesson.bind(this))
      .map((lesson: any) => this.enrichLesson(lesson, {
        course: courseMap.get(lesson.courseId),
        teacher: teacherMap.get(lesson.teacherId),
        subject: subjectMap.get(courseMap.get(lesson.courseId)?.subjectId),
        groups: courseMap.get(lesson.courseId)?.groupIds?.map((gId: string) => groupMap.get(gId)) || []
      }))

    // Generate time slots and days
    const timeSlots = this.generateTimeSlots(calendarLessons)
    const days = this.generateCalendarDays(calendarLessons)

    return {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      className: groups[0]?.name || 'Unknown Class',
      timeSlots,
      days,
      isEmpty: calendarLessons.length === 0
    }
  }

  /**
   * Enrich a lesson with display information
   */
  private enrichLesson(lesson: any, data: Partial<LessonEnrichmentData>): CalendarLesson {
    const { course, teacher, subject, groups = [] } = data

    // Calculate grid positioning
    const gridPosition = this.calculateGridPosition(lesson.startTime, lesson.duration)

    return {
      id: lesson.id,
      subjectName: subject?.name || 'Unknown Subject',
      teacherName: teacher?.name || 'Unknown Teacher',
      groupNames: groups.map(g => g?.name).filter(Boolean),
      startTime: lesson.startTime,
      duration: lesson.duration,
      roomId: lesson.roomId,
      dayOfWeek: lesson.dayOfWeek,
      gridRowStart: gridPosition.rowStart,
      gridRowSpan: gridPosition.rowSpan,
      position: 0 // Will be calculated during time slot generation
    }
  }

  /**
   * Calculate CSS grid position for a lesson
   */
  private calculateGridPosition(startTime: string, duration: number): { rowStart: number; rowSpan: number } {
    const startMinutes = this.timeToMinutes(startTime)
    const displayStartMinutes = this.timeToMinutes(this.config.displayTimeRange.start)
    
    // Calculate row start (1-based for CSS grid)
    const rowStart = Math.floor((startMinutes - displayStartMinutes) / this.config.timeSlotDuration) + 1
    
    // Calculate row span
    const rowSpan = Math.ceil(duration / this.config.timeSlotDuration)
    
    return { rowStart, rowSpan }
  }

  /**
   * Generate time slots for calendar grid
   */
  private generateTimeSlots(lessons: CalendarLesson[]): CalendarTimeSlot[] {
    const slots: CalendarTimeSlot[] = []
    const startMinutes = this.timeToMinutes(this.config.displayTimeRange.start)
    const endMinutes = this.timeToMinutes(this.config.displayTimeRange.end)

    for (let minutes = startMinutes; minutes < endMinutes; minutes += this.config.timeSlotDuration) {
      const startTime = this.minutesToTime(minutes)
      const endTime = this.minutesToTime(minutes + this.config.timeSlotDuration)

      for (const dayOfWeek of this.config.workingDays) {
        const slotLessons = lessons.filter(lesson => 
          lesson.dayOfWeek === dayOfWeek &&
          this.lessonOverlapsTimeSlot(lesson, startTime, endTime)
        )

        // Assign horizontal positions for overlapping lessons
        slotLessons.forEach((lesson, index) => {
          lesson.position = index
        })

        slots.push({
          startTime,
          endTime,
          dayOfWeek,
          lessons: slotLessons,
          isEmpty: slotLessons.length === 0
        })
      }
    }

    return slots
  }

  /**
   * Generate calendar days for mobile view
   */
  private generateCalendarDays(lessons: CalendarLesson[]): CalendarDay[] {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    
    return this.config.workingDays.map(dayOfWeek => {
      const dayLessons = lessons.filter(lesson => lesson.dayOfWeek === dayOfWeek)
      
      return {
        dayOfWeek,
        dayName: dayNames[dayOfWeek - 1],
        date: new Date().toISOString().split('T')[0], // TODO: Calculate actual date based on schedule week
        lessons: dayLessons,
        isEmpty: dayLessons.length === 0
      }
    })
  }

  /**
   * Check if lesson is valid for calendar display
   */
  private isValidLesson(lesson: any): boolean {
    return (
      lesson.dayOfWeek >= 1 && lesson.dayOfWeek <= 5 && // Monday-Friday only
      lesson.startTime >= this.config.displayTimeRange.start &&
      lesson.startTime <= this.config.displayTimeRange.end &&
      lesson.duration >= 15 // Minimum duration
    )
  }

  /**
   * Check if lesson overlaps with time slot
   */
  private lessonOverlapsTimeSlot(lesson: CalendarLesson, slotStart: string, slotEnd: string): boolean {
    const lessonStart = this.timeToMinutes(lesson.startTime)
    const lessonEnd = lessonStart + lesson.duration
    const slotStartMinutes = this.timeToMinutes(slotStart)
    const slotEndMinutes = this.timeToMinutes(slotEnd)

    return lessonStart < slotEndMinutes && lessonEnd > slotStartMinutes
  }

  /**
   * Convert HH:mm time to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  /**
   * Convert minutes since midnight to HH:mm format
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  // API methods (implementing actual API calls)
  private async fetchSchedule(scheduleId: string): Promise<any> {
    const response = await schedulesApi.getById(scheduleId)
    return response.data
  }

  private async fetchGroups(classId: string): Promise<any[]> {
    const response = await groupsApi.getAll()
    // Filter groups by classId
    return response.data.filter((group: any) => group.classId === classId)
  }

  private async fetchCourses(groupIds: string[]): Promise<any[]> {
    const response = await coursesApi.getAll()
    // Filter courses that belong to any of the specified groups
    return response.data.filter((course: any) => 
      course.groupIds.some((groupId: string) => groupIds.includes(groupId))
    )
  }

  private async fetchTeachers(): Promise<any[]> {
    const response = await teachersApi.getAll()
    return response.data
  }

  private async fetchSubjects(): Promise<any[]> {
    const response = await subjectsApi.getAll()
    return response.data
  }
}

// Export singleton instance
export const calendarService = new CalendarService()