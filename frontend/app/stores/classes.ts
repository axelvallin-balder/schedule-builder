import { defineStore } from 'pinia'
import { classesApi } from '../../services/api'
import type { Class } from '../types/entities'

// Simple validation for the Class type
interface ValidationResult {
  valid: boolean
  errors: Array<{ field: string; message: string }>
}

function validateClass(classData: Omit<Class, 'id' | 'createdAt' | 'updatedAt'>): ValidationResult {
  const errors: Array<{ field: string; message: string }> = []
  
  if (!classData.name || classData.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required' })
  }
  
  if (!classData.lunchDuration || classData.lunchDuration < 0) {
    errors.push({ field: 'lunchDuration', message: 'Lunch duration must be a positive number' })
  }
  
  if (classData.academicYear && typeof classData.academicYear !== 'string') {
    errors.push({ field: 'academicYear', message: 'Academic year must be a string' })
  }
  
  if (classData.level && typeof classData.level !== 'string') {
    errors.push({ field: 'level', message: 'Level must be a string' })
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

interface ClassesState {
  classes: Class[]
  selectedClass: Class | null
  isLoading: boolean
  error: string | null
  selectedIds: string[]
  searchQuery: string
}

export const useClassesStore = defineStore('classes', {
  state: (): ClassesState => ({
    classes: [],
    selectedClass: null,
    isLoading: false,
    error: null,
    selectedIds: [],
    searchQuery: ''
  }),

  getters: {
    filteredClasses: (state) => {
      if (!state.searchQuery) return state.classes
      
      const query = state.searchQuery.toLowerCase()
      return state.classes.filter(classItem => 
        classItem.name.toLowerCase().includes(query) ||
        classItem.academicYear?.toLowerCase().includes(query) ||
        classItem.level?.toLowerCase().includes(query)
      )
    },

    selectedClassesCount: (state) => state.selectedIds.length,

    getClassById: (state) => (id: string) => 
      state.classes.find(classItem => classItem.id === id),

    getClassesByAcademicYear: (state) => (academicYear: string) => 
      state.classes.filter(classItem => classItem.academicYear === academicYear),

    getClassesByLevel: (state) => (level: string) => 
      state.classes.filter(classItem => classItem.level === level)
  },

  actions: {
    async loadClasses() {
      this.isLoading = true
      this.error = null
      try {
        const response = await classesApi.getAll()
        console.log(response)
        // Classes API returns direct array, not wrapped
        this.classes = response || []
        console.log(this.classes)
      } catch (error: any) {
        this.error = error.message || 'Failed to load classes'
        console.error('Failed to load classes:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async createClass(classData: Omit<Class, 'id' | 'createdAt' | 'updatedAt'>) {
      const validation = validateClass(classData)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
      }

      try {
        const response = await classesApi.create(classData)
        this.classes.unshift(response.data)
        return response.data
      } catch (error: any) {
        this.error = error.message || 'Failed to create class'
        console.error('Failed to create class:', error)
        throw error
      }
    },

    async updateClass(classItem: Class) {
      const validation = validateClass(classItem)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
      }

      try {
        const response = await classesApi.update(classItem.id, classItem)
        const index = this.classes.findIndex(c => c.id === classItem.id)
        if (index !== -1) {
          this.classes[index] = response.data
        }
        return response.data
      } catch (error: any) {
        this.error = error.message || 'Failed to update class'
        console.error('Failed to update class:', error)
        throw error
      }
    },

    async deleteClass(classId: string) {
      try {
        await classesApi.delete(classId)
        this.classes = this.classes.filter(c => c.id !== classId)
      } catch (error: any) {
        this.error = error.message || 'Failed to delete class'
        console.error('Failed to delete class:', error)
        throw error
      }
    },

    async bulkCreate(classes: Omit<Class, 'id' | 'createdAt' | 'updatedAt'>[]) {
      const results = []
      for (const classData of classes) {
        try {
          const result = await this.createClass(classData)
          results.push({ success: true, data: result })
        } catch (error: any) {
          results.push({ success: false, error: error.message, data: classData })
        }
      }
      return results
    },

    async bulkDelete(classIds: string[]) {
      const results = []
      for (const id of classIds) {
        try {
          await this.deleteClass(id)
          results.push({ success: true, id })
        } catch (error: any) {
          results.push({ success: false, error: error.message, id })
        }
      }
      return results
    },

    setSelectedClass(classItem: Class | null) {
      this.selectedClass = classItem
    },

    setSearchQuery(query: string) {
      this.searchQuery = query
    },

    toggleSelection(classId: string) {
      const index = this.selectedIds.indexOf(classId)
      if (index === -1) {
        this.selectedIds.push(classId)
      } else {
        this.selectedIds.splice(index, 1)
      }
    },

    clearSelection() {
      this.selectedIds = []
    }
  }
})