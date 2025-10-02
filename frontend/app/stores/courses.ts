import { defineStore } from 'pinia'
import { coursesApi } from '../../services/api'
import type { Course } from './index'

// Simple validation for the legacy Course type
interface ValidationResult {
  valid: boolean
  errors: Array<{ field: string; message: string }>
}

function validateCourse(courseData: Omit<Course, 'id'>): ValidationResult {
  const errors: Array<{ field: string; message: string }> = []
  
  if (!courseData.name || courseData.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required' })
  }
  
  if (!courseData.subjectId || courseData.subjectId.trim().length === 0) {
    errors.push({ field: 'subjectId', message: 'Subject is required' })
  }
  
  if (courseData.lessonsPerWeek < 1 || courseData.lessonsPerWeek > 10) {
    errors.push({ field: 'lessonsPerWeek', message: 'Lessons per week must be between 1 and 10' })
  }
  
  if (courseData.duration < 30 || courseData.duration > 180) {
    errors.push({ field: 'duration', message: 'Duration must be between 30 and 180 minutes' })
  }
  
  if (!courseData.groupIds || courseData.groupIds.length === 0) {
    errors.push({ field: 'groupIds', message: 'At least one group is required' })
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

interface CoursesState {
  courses: Course[]
  selectedCourse: Course | null
  isLoading: boolean
  error: string | null
  selectedIds: string[]
  searchQuery: string
}

export const useCoursesStore = defineStore('courses', {
  state: (): CoursesState => ({
    courses: [],
    selectedCourse: null,
    isLoading: false,
    error: null,
    selectedIds: [],
    searchQuery: ''
  }),

  getters: {
    filteredCourses: (state) => {
      if (!state.searchQuery) return state.courses
      
      const query = state.searchQuery.toLowerCase()
      return state.courses.filter(course => 
        course.name.toLowerCase().includes(query)
      )
    },

    selectedCoursesCount: (state) => state.selectedIds.length,

    getCourseById: (state) => (id: string) => 
      state.courses.find(course => course.id === id),

    coursesBySubject: (state) => (subjectId: string) => {
      return state.courses.filter(course => course.subjectId === subjectId)
    },

    coursesByGroup: (state) => (groupId: string) => {
      return state.courses.filter(course => course.groupIds.includes(groupId))
    }
  },

  actions: {
    async loadCourses() {
      this.isLoading = true
      this.error = null
      try {
        const response = await coursesApi.getAll()
        // Handle paginated response structure - response is the paginated object directly
        this.courses = response.courses || []
      } catch (error: any) {
        this.error = error.message || 'Failed to load courses'
        console.error('Failed to load courses:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async createCourse(courseData: Omit<Course, 'id'>) {
      const validation = validateCourse(courseData)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
      }

      try {
        const response = await coursesApi.create(courseData)
        this.courses.unshift(response.data)
        return response.data
      } catch (error: any) {
        this.error = error.message || 'Failed to create course'
        console.error('Failed to create course:', error)
        throw error
      }
    },

    async updateCourse(course: Course) {
      const validation = validateCourse(course)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
      }

      try {
        const response = await coursesApi.update(course.id, course)
        const index = this.courses.findIndex(c => c.id === course.id)
        if (index !== -1) {
          this.courses[index] = response.data
        }
        return response.data
      } catch (error: any) {
        this.error = error.message || 'Failed to update course'
        console.error('Failed to update course:', error)
        throw error
      }
    },

    async deleteCourse(courseId: string) {
      try {
        await coursesApi.delete(courseId)
        this.courses = this.courses.filter(c => c.id !== courseId)
      } catch (error: any) {
        this.error = error.message || 'Failed to delete course'
        console.error('Failed to delete course:', error)
        throw error
      }
    },

    async bulkCreate(courses: Omit<Course, 'id'>[]) {
      const results = []
      for (const courseData of courses) {
        try {
          const result = await this.createCourse(courseData)
          results.push({ success: true, data: result })
        } catch (error: any) {
          results.push({ success: false, error: error.message, data: courseData })
        }
      }
      return results
    },

    async bulkDelete(courseIds: string[]) {
      const results = []
      for (const id of courseIds) {
        try {
          await this.deleteCourse(id)
          results.push({ success: true, id })
        } catch (error: any) {
          results.push({ success: false, error: error.message, id })
        }
      }
      return results
    },

    setSelectedCourse(course: Course | null) {
      this.selectedCourse = course
    },

    setSearchQuery(query: string) {
      this.searchQuery = query
    },

    toggleSelection(courseId: string) {
      const index = this.selectedIds.indexOf(courseId)
      if (index === -1) {
        this.selectedIds.push(courseId)
      } else {
        this.selectedIds.splice(index, 1)
      }
    },

    clearSelection() {
      this.selectedIds = []
    }
  }
})