import { defineStore } from 'pinia'
import { teachersApi } from '../../services/api'

export interface Teacher {
  id: string
  name: string
  email: string
  subjectIds: string[]
  maxHoursPerWeek: number
  availableHours: { [day: string]: string[] }
  preferences: {
    preferredDays?: number[]
    preferredTimes?: string[]
    maxConsecutiveHours?: number
  }
}

export const useTeacherStore = defineStore('teachers', {
  state: () => ({
    teachers: [] as Teacher[],
    isLoading: false,
    selectedTeacher: null as Teacher | null
  }),

  getters: {
    getTeacherById: (state) => (id: string): Teacher | undefined => {
      return state.teachers.find(teacher => teacher.id === id)
    },

    teachersBySubject: (state) => (subjectId: string): Teacher[] => {
      return state.teachers.filter(teacher => teacher.subjectIds.includes(subjectId))
    },

    availableTeachers: (state): Teacher[] => {
      return state.teachers.filter(teacher => teacher.maxHoursPerWeek > 0)
    }
  },

  actions: {
    async loadTeachers() {
      this.isLoading = true
      try {
        const response = await teachersApi.getAll()
        this.teachers = response.data
      } catch (error) {
        console.error('Failed to load teachers:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async createTeacher(teacherData: Omit<Teacher, 'id'>) {
      try {
        const response = await teachersApi.create(teacherData)
        this.teachers.unshift(response.data)
        return response.data
      } catch (error) {
        console.error('Failed to create teacher:', error)
        throw error
      }
    },

    async updateTeacher(teacher: Teacher) {
      try {
        const response = await teachersApi.update(teacher.id, teacher)
        const index = this.teachers.findIndex(t => t.id === teacher.id)
        if (index !== -1) {
          this.teachers[index] = response.data
        }
        return response.data
      } catch (error) {
        console.error('Failed to update teacher:', error)
        throw error
      }
    },

    async deleteTeacher(teacherId: string) {
      try {
        await teachersApi.delete(teacherId)
        this.teachers = this.teachers.filter(t => t.id !== teacherId)
      } catch (error) {
        console.error('Failed to delete teacher:', error)
        throw error
      }
    },

    setSelectedTeacher(teacher: Teacher | null) {
      this.selectedTeacher = teacher
    }
  }
})