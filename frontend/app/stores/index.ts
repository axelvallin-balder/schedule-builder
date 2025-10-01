import { defineStore } from 'pinia'
import { 
  schedulesApi, 
  rulesApi, 
  coursesApi, 
  teachersApi, 
  groupsApi, 
  subjectsApi,
  type ScheduleGenerationRequest 
} from '../../services/api'

// Types
export interface Lesson {
  id: string
  courseId: string
  teacherId: string
  groupIds: string[]
  startTime: string // HH:mm format
  endTime: string   // HH:mm format
  dayOfWeek: number // 1-5 (Monday-Friday)
  classroom?: string
}

export interface Schedule {
  id: string
  name: string
  lessons: Lesson[]
  createdAt: string
  updatedAt: string
  status: 'draft' | 'published' | 'archived'
  generatedBy: string
  version: number
}

export interface Rule {
  id: string
  name: string
  type: 'constraint' | 'preference'
  description: string
  priority: number
  conditions: RuleCondition[]
  enabled: boolean
}

export interface RuleCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than'
  value: string | number | boolean
}

export interface Course {
  id: string
  name: string
  subjectId: string
  lessonsPerWeek: number
  duration: number // minutes
  groupIds: string[]
}

export interface Teacher {
  id: string
  name: string
  email: string
  subjectIds: string[]
  availability: {
    dayOfWeek: number
    startTime: string
    endTime: string
  }[]
}

export interface Group {
  id: string
  name: string
  year: number
  studentCount: number
}

export interface Subject {
  id: string
  name: string
  code: string
  color: string
}

// Schedule Store
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

    conflictingLessons: (state): Lesson[] => {
      if (!state.currentSchedule) return []
      
      const conflicts: Lesson[] = []
      const lessons = state.currentSchedule.lessons

      for (let i = 0; i < lessons.length; i++) {
        for (let j = i + 1; j < lessons.length; j++) {
          const lesson1 = lessons[i]
          const lesson2 = lessons[j]

          // Check for time conflicts
          if (lesson1.dayOfWeek === lesson2.dayOfWeek) {
            const start1 = timeToMinutes(lesson1.startTime)
            const end1 = timeToMinutes(lesson1.endTime)
            const start2 = timeToMinutes(lesson2.startTime)
            const end2 = timeToMinutes(lesson2.endTime)

            if ((start1 < end2 && end1 > start2)) {
              // Check for resource conflicts (teacher or group)
              if (lesson1.teacherId === lesson2.teacherId ||
                  lesson1.groupIds.some(id => lesson2.groupIds.includes(id))) {
                if (!conflicts.find(l => l.id === lesson1.id)) {
                  conflicts.push(lesson1)
                }
                if (!conflicts.find(l => l.id === lesson2.id)) {
                  conflicts.push(lesson2)
                }
              }
            }
          }
        }
      }

      return conflicts
    },

    filteredLessons: (state): Lesson[] => {
      let lessons = state.currentSchedule?.lessons || []

      if (state.filters.selectedTeachers.length > 0) {
        lessons = lessons.filter(lesson => 
          state.filters.selectedTeachers.includes(lesson.teacherId)
        )
      }

      if (state.filters.selectedGroups.length > 0) {
        lessons = lessons.filter(lesson => 
          lesson.groupIds.some(id => state.filters.selectedGroups.includes(id))
        )
      }

      return lessons
    },

    scheduleStats: (state) => {
      if (!state.currentSchedule) {
        return {
          totalLessons: 0,
          totalHours: 0,
          conflicts: 0,
          coverage: 0
        }
      }

      const lessons = state.currentSchedule.lessons
      
      // Calculate conflicts inline
      const conflicts: Lesson[] = []
      for (let i = 0; i < lessons.length; i++) {
        for (let j = i + 1; j < lessons.length; j++) {
          const lesson1 = lessons[i]
          const lesson2 = lessons[j]

          // Check for time conflicts
          if (lesson1.dayOfWeek === lesson2.dayOfWeek) {
            const start1 = timeToMinutes(lesson1.startTime)
            const end1 = timeToMinutes(lesson1.endTime)
            const start2 = timeToMinutes(lesson2.startTime)
            const end2 = timeToMinutes(lesson2.endTime)

            if ((start1 < end2 && end1 > start2)) {
              // Check for resource conflicts (teacher or group)
              if (lesson1.teacherId === lesson2.teacherId ||
                  lesson1.groupIds.some(id => lesson2.groupIds.includes(id))) {
                if (!conflicts.find(l => l.id === lesson1.id)) {
                  conflicts.push(lesson1)
                }
                if (!conflicts.find(l => l.id === lesson2.id)) {
                  conflicts.push(lesson2)
                }
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

// Rules Store
export const useRulesStore = defineStore('rules', {
  state: () => ({
    rules: [] as Rule[],
    isLoading: false,
    editingRule: null as Rule | null
  }),

  getters: {
    enabledRules: (state): Rule[] => {
      return state.rules.filter(rule => rule.enabled)
    },

    constraintRules: (state): Rule[] => {
      return state.rules.filter(rule => rule.type === 'constraint' && rule.enabled)
    },

    preferenceRules: (state): Rule[] => {
      return state.rules.filter(rule => rule.type === 'preference' && rule.enabled)
    },

    rulesByPriority: (state): Rule[] => {
      return [...state.rules].sort((a, b) => b.priority - a.priority)
    }
  },

  actions: {
    async loadRules() {
      this.isLoading = true
      try {
        const response = await rulesApi.getAll()
        this.rules = response.data
      } catch (error) {
        console.error('Failed to load rules:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async createRule(ruleData: Omit<Rule, 'id'>) {
      try {
        const response = await rulesApi.create(ruleData)
        this.rules.unshift(response.data)
        return response.data
      } catch (error) {
        console.error('Failed to create rule:', error)
        throw error
      }
    },

    async updateRule(rule: Rule) {
      try {
        const response = await rulesApi.update(rule.id, rule)
        const index = this.rules.findIndex(r => r.id === rule.id)
        if (index !== -1) {
          this.rules[index] = response.data
        }
        return response.data
      } catch (error) {
        console.error('Failed to update rule:', error)
        throw error
      }
    },

    async deleteRule(ruleId: string) {
      try {
        await rulesApi.delete(ruleId)
        this.rules = this.rules.filter(r => r.id !== ruleId)
      } catch (error) {
        console.error('Failed to delete rule:', error)
        throw error
      }
    },

    async toggleRule(ruleId: string, enabled: boolean) {
      try {
        const response = await rulesApi.toggle(ruleId, enabled)
        const index = this.rules.findIndex(r => r.id === ruleId)
        if (index !== -1) {
          this.rules[index] = response.data
        }
      } catch (error) {
        console.error('Failed to toggle rule:', error)
        throw error
      }
    },

    setEditingRule(rule: Rule | null) {
      this.editingRule = rule
    }
  }
})

// Entities Store (for managing base data)
export const useEntitiesStore = defineStore('entities', {
  state: () => ({
    courses: [] as Course[],
    teachers: [] as Teacher[],
    groups: [] as Group[],
    subjects: [] as Subject[],
    isLoading: false
  }),

  getters: {
    getTeacherById: (state) => (id: string): Teacher | undefined => {
      return state.teachers.find(teacher => teacher.id === id)
    },

    getCourseById: (state) => (id: string): Course | undefined => {
      return state.courses.find(course => course.id === id)
    },

    getGroupById: (state) => (id: string): Group | undefined => {
      return state.groups.find(group => group.id === id)
    },

    getSubjectById: (state) => (id: string): Subject | undefined => {
      return state.subjects.find(subject => subject.id === id)
    },

    teachersBySubject: (state) => (subjectId: string): Teacher[] => {
      return state.teachers.filter(teacher => teacher.subjectIds.includes(subjectId))
    },

    coursesByTeacher: (state) => (teacherId: string): Course[] => {
      const teacher = state.teachers.find(t => t.id === teacherId)
      if (!teacher) return []
      
      return state.courses.filter(course => 
        teacher.subjectIds.includes(course.subjectId)
      )
    }
  },

  actions: {
    async loadAllEntities() {
      this.isLoading = true
      try {
        await Promise.all([
          this.loadCourses(),
          this.loadTeachers(),
          this.loadGroups(),
          this.loadSubjects()
        ])
      } catch (error) {
        console.error('Failed to load entities:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async loadCourses() {
      try {
        const response = await coursesApi.getAll()
        this.courses = response.data
      } catch (error) {
        console.error('Failed to load courses:', error)
        throw error
      }
    },

    async loadTeachers() {
      try {
        const response = await teachersApi.getAll()
        this.teachers = response.data
      } catch (error) {
        console.error('Failed to load teachers:', error)
        throw error
      }
    },

    async loadGroups() {
      try {
        const response = await groupsApi.getAll()
        this.groups = response.data
      } catch (error) {
        console.error('Failed to load groups:', error)
        throw error
      }
    },

    async loadSubjects() {
      try {
        const response = await subjectsApi.getAll()
        this.subjects = response.data
      } catch (error) {
        console.error('Failed to load subjects:', error)
        throw error
      }
    }
  }
})

// Utility function
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}