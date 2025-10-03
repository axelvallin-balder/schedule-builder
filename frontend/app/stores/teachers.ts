import { defineStore } from 'pinia'
import { teachersApi } from '../../services/api'
import type { Teacher } from './index'

// Simple validation for the legacy Teacher type
interface ValidationResult {
  valid: boolean
  errors: Array<{ field: string; message: string }>
}

function validateTeacher(teacherData: Omit<Teacher, 'id'>): ValidationResult {
  const errors: Array<{ field: string; message: string }> = []
  
  if (!teacherData.name || teacherData.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required' })
  }
  
  if (!teacherData.email || !teacherData.email.includes('@')) {
    errors.push({ field: 'email', message: 'Valid email is required' })
  }
  
  if (!teacherData.subjectIds || teacherData.subjectIds.length === 0) {
    errors.push({ field: 'subjectIds', message: 'At least one subject is required' })
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

interface TeachersState {
  teachers: Teacher[]
  selectedTeacher: Teacher | null
  isLoading: boolean
  error: string | null
  selectedIds: string[]
  searchQuery: string
}

export const useTeachersStore = defineStore('teachers', {
  state: (): TeachersState => ({
    teachers: [],
    selectedTeacher: null,
    isLoading: false,
    error: null,
    selectedIds: [],
    searchQuery: ''
  }),

  getters: {
    filteredTeachers: (state) => {
      if (!state.searchQuery) return state.teachers
      
      const query = state.searchQuery.toLowerCase()
      return state.teachers.filter(teacher => 
        teacher.name.toLowerCase().includes(query) ||
        teacher.email.toLowerCase().includes(query)
      )
    },

    selectedTeachersCount: (state) => state.selectedIds.length,

    getTeacherById: (state) => (id: string) => 
      state.teachers.find(teacher => teacher.id === id),

    teachersBySubject: (state) => (subjectId: string) => {
      return state.teachers.filter(teacher => 
        teacher.subjectIds.includes(subjectId)
      )
    }
  },

  actions: {
    async loadTeachers() {
      this.isLoading = true
      this.error = null
      try {
        const response = await teachersApi.getAll()
        console.log(response)
        // Handle paginated response structure - response is the paginated object directly
        this.teachers = response.teachers || []
      } catch (error: any) {
        this.error = error.message || 'Failed to load teachers'
        console.error('Failed to load teachers:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async createTeacher(teacherData: Omit<Teacher, 'id'>) {
      const validation = validateTeacher(teacherData)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
      }

      try {
        const response = await teachersApi.create(teacherData)
        // Backend returns { teacher }
        const newTeacher = response.teacher
        this.teachers.unshift(newTeacher)
        return newTeacher
      } catch (error: any) {
        this.error = error.message || 'Failed to create teacher'
        console.error('Failed to create teacher:', error)
        throw error
      }
    },

    async updateTeacher(teacher: Teacher) {
      const validation = validateTeacher(teacher)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
      }

      try {
        const response = await teachersApi.update(teacher.id, teacher)
        // Backend returns { teacher }
        const updatedTeacher = response.teacher
        const index = this.teachers.findIndex(t => t.id === teacher.id)
        if (index !== -1) {
          this.teachers[index] = updatedTeacher
        }
        return updatedTeacher
      } catch (error: any) {
        this.error = error.message || 'Failed to update teacher'
        console.error('Failed to update teacher:', error)
        throw error
      }
    },

    async deleteTeacher(teacherId: string) {
      try {
        await teachersApi.delete(teacherId)
        this.teachers = this.teachers.filter(t => t.id !== teacherId)
      } catch (error: any) {
        this.error = error.message || 'Failed to delete teacher'
        console.error('Failed to delete teacher:', error)
        throw error
      }
    },

    async bulkCreate(teachers: Omit<Teacher, 'id'>[]) {
      const results = []
      for (const teacherData of teachers) {
        try {
          const result = await this.createTeacher(teacherData)
          results.push({ success: true, data: result })
        } catch (error: any) {
          results.push({ success: false, error: error.message, data: teacherData })
        }
      }
      return results
    },

    async bulkDelete(teacherIds: string[]) {
      const results = []
      for (const id of teacherIds) {
        try {
          await this.deleteTeacher(id)
          results.push({ success: true, id })
        } catch (error: any) {
          results.push({ success: false, error: error.message, id })
        }
      }
      return results
    },

    setSelectedTeacher(teacher: Teacher | null) {
      this.selectedTeacher = teacher
    },

    setSearchQuery(query: string) {
      this.searchQuery = query
    },

    toggleSelection(teacherId: string) {
      const index = this.selectedIds.indexOf(teacherId)
      if (index === -1) {
        this.selectedIds.push(teacherId)
      } else {
        this.selectedIds.splice(index, 1)
      }
    },

    clearSelection() {
      this.selectedIds = []
    }
  }
})