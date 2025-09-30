import { defineStore } from 'pinia'
import { groupsApi } from '../../services/api'

export interface Group {
  id: string
  name: string
  size: number
  level: string
  specialization?: string
  timetableConstraints: {
    maxHoursPerDay: number
    preferredDays: number[]
    unavailableSlots: string[]
  }
}

export const useGroupStore = defineStore('groups', {
  state: () => ({
    groups: [] as Group[],
    isLoading: false,
    selectedGroup: null as Group | null
  }),

  getters: {
    getGroupById: (state) => (id: string): Group | undefined => {
      return state.groups.find(group => group.id === id)
    },

    groupsByLevel: (state) => (level: string): Group[] => {
      return state.groups.filter(group => group.level === level)
    },

    groupsBySpecialization: (state) => (specialization: string): Group[] => {
      return state.groups.filter(group => group.specialization === specialization)
    },

    totalStudents: (state): number => {
      return state.groups.reduce((total, group) => total + group.size, 0)
    }
  },

  actions: {
    async loadGroups() {
      this.isLoading = true
      try {
        const response = await groupsApi.getAll()
        this.groups = response.data
      } catch (error) {
        console.error('Failed to load groups:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async createGroup(groupData: Omit<Group, 'id'>) {
      try {
        const response = await groupsApi.create(groupData)
        this.groups.unshift(response.data)
        return response.data
      } catch (error) {
        console.error('Failed to create group:', error)
        throw error
      }
    },

    async updateGroup(group: Group) {
      try {
        const response = await groupsApi.update(group.id, group)
        const index = this.groups.findIndex(g => g.id === group.id)
        if (index !== -1) {
          this.groups[index] = response.data
        }
        return response.data
      } catch (error) {
        console.error('Failed to update group:', error)
        throw error
      }
    },

    async deleteGroup(groupId: string) {
      try {
        await groupsApi.delete(groupId)
        this.groups = this.groups.filter(g => g.id !== groupId)
      } catch (error) {
        console.error('Failed to delete group:', error)
        throw error
      }
    },

    setSelectedGroup(group: Group | null) {
      this.selectedGroup = group
    }
  }
})