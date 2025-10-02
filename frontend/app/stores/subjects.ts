import { defineStore } from 'pinia'
import { subjectsApi } from '../../services/api'
import type { Subject } from './index'

// Simple validation for the legacy Subject type
interface ValidationResult {
  valid: boolean
  errors: Array<{ field: string; message: string }>
}

function validateSubject(subjectData: Omit<Subject, 'id'>): ValidationResult {
  const errors: Array<{ field: string; message: string }> = []
  
  if (!subjectData.name || subjectData.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required' })
  }
  
  if (!subjectData.code || subjectData.code.trim().length === 0) {
    errors.push({ field: 'code', message: 'Code is required' })
  }
  
  if (!subjectData.color || !subjectData.color.match(/^#[0-9A-Fa-f]{6}$/)) {
    errors.push({ field: 'color', message: 'Valid hex color is required' })
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

interface SubjectsState {
  subjects: Subject[]
  selectedSubject: Subject | null
  isLoading: boolean
  error: string | null
  selectedIds: string[]
  searchQuery: string
}

export const useSubjectsStore = defineStore('subjects', {
  state: (): SubjectsState => ({
    subjects: [],
    selectedSubject: null,
    isLoading: false,
    error: null,
    selectedIds: [],
    searchQuery: ''
  }),

  getters: {
    filteredSubjects: (state) => {
      if (!state.searchQuery) return state.subjects
      
      const query = state.searchQuery.toLowerCase()
      return state.subjects.filter(subject => 
        subject.name.toLowerCase().includes(query) ||
        subject.code.toLowerCase().includes(query)
      )
    },

    selectedSubjectsCount: (state) => state.selectedIds.length,

    getSubjectById: (state) => (id: string) => 
      state.subjects.find(subject => subject.id === id),

    getSubjectByCode: (state) => (code: string) => 
      state.subjects.find(subject => subject.code === code)
  },

  actions: {
    async loadSubjects() {
      this.isLoading = true
      this.error = null
      try {
        const response = await subjectsApi.getAll()
        this.subjects = response.data
      } catch (error: any) {
        this.error = error.message || 'Failed to load subjects'
        console.error('Failed to load subjects:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async createSubject(subjectData: Omit<Subject, 'id'>) {
      const validation = validateSubject(subjectData)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
      }

      try {
        const response = await subjectsApi.create(subjectData)
        this.subjects.unshift(response.data)
        return response.data
      } catch (error: any) {
        this.error = error.message || 'Failed to create subject'
        console.error('Failed to create subject:', error)
        throw error
      }
    },

    async updateSubject(subject: Subject) {
      const validation = validateSubject(subject)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
      }

      try {
        const response = await subjectsApi.update(subject.id, subject)
        const index = this.subjects.findIndex(s => s.id === subject.id)
        if (index !== -1) {
          this.subjects[index] = response.data
        }
        return response.data
      } catch (error: any) {
        this.error = error.message || 'Failed to update subject'
        console.error('Failed to update subject:', error)
        throw error
      }
    },

    async deleteSubject(subjectId: string) {
      try {
        await subjectsApi.delete(subjectId)
        this.subjects = this.subjects.filter(s => s.id !== subjectId)
      } catch (error: any) {
        this.error = error.message || 'Failed to delete subject'
        console.error('Failed to delete subject:', error)
        throw error
      }
    },

    async bulkCreate(subjects: Omit<Subject, 'id'>[]) {
      const results = []
      for (const subjectData of subjects) {
        try {
          const result = await this.createSubject(subjectData)
          results.push({ success: true, data: result })
        } catch (error: any) {
          results.push({ success: false, error: error.message, data: subjectData })
        }
      }
      return results
    },

    async bulkDelete(subjectIds: string[]) {
      const results = []
      for (const id of subjectIds) {
        try {
          await this.deleteSubject(id)
          results.push({ success: true, id })
        } catch (error: any) {
          results.push({ success: false, error: error.message, id })
        }
      }
      return results
    },

    setSelectedSubject(subject: Subject | null) {
      this.selectedSubject = subject
    },

    setSearchQuery(query: string) {
      this.searchQuery = query
    },

    toggleSelection(subjectId: string) {
      const index = this.selectedIds.indexOf(subjectId)
      if (index === -1) {
        this.selectedIds.push(subjectId)
      } else {
        this.selectedIds.splice(index, 1)
      }
    },

    clearSelection() {
      this.selectedIds = []
    }
  }
})