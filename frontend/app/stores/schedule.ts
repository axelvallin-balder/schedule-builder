import { defineStore } from 'pinia'
import { schedulesApi, type ScheduleGenerationRequest } from '../../services/api'

export interface Lesson {
  id: string
  courseId: string
  teacherId: string
  groupIds: string[]
  startTime: string // HH:mm format
  endTime: string   // HH:mm format
  dayOfWeek: number // 1-5 (Monday-Friday)
  subjectId: string
  duration: number // in minutes
  conflicts?: string[]
}

export interface Schedule {
  id: string
  name: string
  description?: string
  weekNumber: number
  year: number
  status: 'draft' | 'active' | 'archived'
  lessons: Lesson[]
  constraints: any[]
  metadata?: {
    generationTime?: number
    algorithm?: string
    conflicts?: number
  }
  createdAt: string
  updatedAt: string
}

export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    schedules: [] as Schedule[],
    currentSchedule: null as Schedule | null,
    isGenerating: false,
    generationProgress: 0,
    lastGenerated: null as string | null,
    selectedLessonId: null as string | null,
    viewMode: 'desktop' as 'desktop' | 'mobile',
    currentWeek: new Date(),
    filters: {
      showConflicts: false,
      showEmptySlots: true,
      selectedTeachers: [] as string[],
      selectedGroups: [] as string[],
      selectedSubjects: [] as string[]
    }
  }),

  getters: {
    currentLessons: (state): Lesson[] => {
      return state.currentSchedule?.lessons || []
    },

    selectedLesson: (state): Lesson | null => {
      if (!state.selectedLessonId || !state.currentSchedule) return null
      return state.currentSchedule.lessons.find(l => l.id === state.selectedLessonId) || null
    },

    lessonsByDay: (state) => (day: number): Lesson[] => {
      if (!state.currentSchedule) return []
      return state.currentSchedule.lessons
        .filter(lesson => lesson.dayOfWeek === day)
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    },

    conflictingLessons: (state): Lesson[] => {
      if (!state.currentSchedule) return []
      
      const lessons = state.currentSchedule.lessons
      const conflicts: Lesson[] = []

      for (let i = 0; i < lessons.length; i++) {
        for (let j = i + 1; j < lessons.length; j++) {
          const lesson1 = lessons[i]
          const lesson2 = lessons[j]

          if (lesson1 && lesson2 && lesson1.dayOfWeek === lesson2.dayOfWeek) {
            const start1 = timeToMinutes(lesson1.startTime)
            const end1 = timeToMinutes(lesson1.endTime)
            const start2 = timeToMinutes(lesson2.startTime)
            const end2 = timeToMinutes(lesson2.endTime)

            if ((start1 < end2 && end1 > start2) && 
                (lesson1.teacherId === lesson2.teacherId || 
                 lesson1.groupIds.some(id => lesson2.groupIds.includes(id)))) {
              if (!conflicts.includes(lesson1)) conflicts.push(lesson1)
              if (!conflicts.includes(lesson2)) conflicts.push(lesson2)
            }
          }
        }
      }

      return conflicts
    },

    scheduleStatistics: (state) => {
      if (!state.currentSchedule) return { totalLessons: 0, totalHours: 0, conflicts: 0, coverage: 0 }

      const lessons = state.currentSchedule.lessons
      const conflicts: Lesson[] = []

      for (let i = 0; i < lessons.length; i++) {
        for (let j = i + 1; j < lessons.length; j++) {
          const lesson1 = lessons[i]
          const lesson2 = lessons[j]

          if (lesson1 && lesson2 && lesson1.dayOfWeek === lesson2.dayOfWeek) {
            const start1 = timeToMinutes(lesson1.startTime)
            const end1 = timeToMinutes(lesson1.endTime)
            const start2 = timeToMinutes(lesson2.startTime)
            const end2 = timeToMinutes(lesson2.endTime)

            if ((start1 < end2 && end1 > start2) && 
                (lesson1.teacherId === lesson2.teacherId || 
                 lesson1.groupIds.some(id => lesson2.groupIds.includes(id)))) {
              if (!conflicts.includes(lesson1)) {
                conflicts.push(lesson1)
              }
              if (!conflicts.includes(lesson2)) {
                conflicts.push(lesson2)
              }
            }
          }
        }
      }

      const totalHours = lessons.reduce((total, lesson) => {
        const start = timeToMinutes(lesson.startTime)
        const end = timeToMinutes(lesson.endTime)
        return total + (end - start) / 60
      }, 0)

      return {
        totalLessons: lessons.length,
        totalHours: Math.round(totalHours * 10) / 10,
        conflicts: conflicts.length,
        coverage: lessons.length > 0 ? Math.round((1 - conflicts.length / lessons.length) * 100) : 0
      }
    }
  },

  actions: {
    async loadSchedules() {
      try {
        const response = await schedulesApi.getAll()
        this.schedules = response.data
      } catch (error) {
        console.error('Failed to load schedules:', error)
        throw error
      }
    },

    async loadSchedule(scheduleId: string) {
      try {
        const response = await schedulesApi.getById(scheduleId)
        this.currentSchedule = response.data
        return response.data
      } catch (error) {
        console.error('Failed to load schedule:', error)
        throw error
      }
    },

    async generateSchedule(options: ScheduleGenerationRequest) {
      this.isGenerating = true
      this.generationProgress = 0

      try {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          this.generationProgress += 10
          if (this.generationProgress >= 90) {
            clearInterval(progressInterval)
          }
        }, 200)

        const response = await schedulesApi.generate(options)
        const schedule = response.data.schedule
        
        this.currentSchedule = schedule
        this.lastGenerated = new Date().toISOString()
        this.generationProgress = 100

        // Add to schedules list if not already there
        if (!this.schedules.find(s => s.id === schedule.id)) {
          this.schedules.unshift(schedule)
        }

        clearInterval(progressInterval)
        return response.data
      } catch (error) {
        console.error('Failed to generate schedule:', error)
        throw error
      } finally {
        this.isGenerating = false
        setTimeout(() => {
          this.generationProgress = 0
        }, 1000)
      }
    },

    async saveSchedule(schedule: Partial<Schedule>) {
      try {
        const response = schedule.id 
          ? await schedulesApi.update(schedule.id, schedule)
          : await schedulesApi.create(schedule as Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>)

        const savedSchedule = response.data
        
        if (schedule.id) {
          // Update existing
          const index = this.schedules.findIndex(s => s.id === schedule.id)
          if (index !== -1) {
            this.schedules[index] = savedSchedule
          }
        } else {
          // Add new
          this.schedules.unshift(savedSchedule)
        }

        if (this.currentSchedule?.id === savedSchedule.id) {
          this.currentSchedule = savedSchedule
        }

        return savedSchedule
      } catch (error) {
        console.error('Failed to save schedule:', error)
        throw error
      }
    },

    async deleteSchedule(scheduleId: string) {
      try {
        await schedulesApi.delete(scheduleId)
        this.schedules = this.schedules.filter(s => s.id !== scheduleId)
        
        if (this.currentSchedule?.id === scheduleId) {
          this.currentSchedule = null
        }
      } catch (error) {
        console.error('Failed to delete schedule:', error)
        throw error
      }
    },

    selectLesson(lessonId: string | null) {
      this.selectedLessonId = lessonId
    },

    setViewMode(mode: 'desktop' | 'mobile') {
      this.viewMode = mode
    },

    setCurrentWeek(date: Date) {
      this.currentWeek = date
    },

    updateFilters(filters: Partial<typeof this.filters>) {
      this.filters = { ...this.filters, ...filters }
    },

    clearFilters() {
      this.filters = {
        showConflicts: false,
        showEmptySlots: true,
        selectedTeachers: [],
        selectedGroups: [],
        selectedSubjects: []
      }
    }
  }
})

// Utility function
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}