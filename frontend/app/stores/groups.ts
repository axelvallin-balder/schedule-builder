import { defineStore } from 'pinia'
import { groupsApi } from '../../services/api'
import type { Group } from './index'

// Simple validation for the legacy Group type
interface ValidationResult {
  valid: boolean
  errors: Array<{ field: string; message: string }>
}

function validateGroup(groupData: Omit<Group, 'id'>): ValidationResult {
  const errors: Array<{ field: string; message: string }> = []
  
  if (!groupData.name || groupData.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required' })
  }
  
  if (groupData.year < 1 || groupData.year > 12) {
    errors.push({ field: 'year', message: 'Year must be between 1 and 12' })
  }
  
  if (groupData.studentCount < 1 || groupData.studentCount > 100) {
    errors.push({ field: 'studentCount', message: 'Student count must be between 1 and 100' })
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

interface GroupsState {
  groups: Group[]
  selectedGroup: Group | null
  isLoading: boolean
  error: string | null
  selectedIds: string[]
  searchQuery: string
}

export const useGroupsStore = defineStore('groups', {
  state: (): GroupsState => ({
    groups: [],
    selectedGroup: null,
    isLoading: false,
    error: null,
    selectedIds: [],
    searchQuery: ''
  }),

  getters: {
    filteredGroups: (state) => {
      if (!state.searchQuery) return state.groups
      
      const query = state.searchQuery.toLowerCase()
      return state.groups.filter(group => 
        group.name.toLowerCase().includes(query) ||
        group.year.toString().includes(query)
      )
    },

    selectedGroupsCount: (state) => state.selectedIds.length,

    getGroupById: (state) => (id: string) => 
      state.groups.find(group => group.id === id),

    groupsByYear: (state) => {
      const grouped: Record<number, Group[]> = {}
      state.groups.forEach(group => {
        if (!grouped[group.year]) {
          grouped[group.year] = []
        }
        grouped[group.year]!.push(group)
      })
      return grouped
    },

    totalStudents: (state) => {
      return state.groups.reduce((total, group) => total + group.studentCount, 0)
    }
  },

  actions: {
    async loadGroups() {
      this.isLoading = true
      this.error = null
      try {
        const response = await groupsApi.getAll()
        this.groups = response.data
      } catch (error: any) {
        this.error = error.message || 'Failed to load groups'
        console.error('Failed to load groups:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async createGroup(groupData: Omit<Group, 'id'>) {
      const validation = validateGroup(groupData)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
      }

      try {
        const response = await groupsApi.create(groupData)
        this.groups.unshift(response.data)
        return response.data
      } catch (error: any) {
        this.error = error.message || 'Failed to create group'
        console.error('Failed to create group:', error)
        throw error
      }
    },

    async updateGroup(group: Group) {
      const validation = validateGroup(group)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
      }

      try {
        const response = await groupsApi.update(group.id, group)
        const index = this.groups.findIndex(g => g.id === group.id)
        if (index !== -1) {
          this.groups[index] = response.data
        }
        return response.data
      } catch (error: any) {
        this.error = error.message || 'Failed to update group'
        console.error('Failed to update group:', error)
        throw error
      }
    },

    async deleteGroup(groupId: string) {
      try {
        await groupsApi.delete(groupId)
        this.groups = this.groups.filter(g => g.id !== groupId)
      } catch (error: any) {
        this.error = error.message || 'Failed to delete group'
        console.error('Failed to delete group:', error)
        throw error
      }
    },

    async bulkCreate(groups: Omit<Group, 'id'>[]) {
      const results = []
      for (const groupData of groups) {
        try {
          const result = await this.createGroup(groupData)
          results.push({ success: true, data: result })
        } catch (error: any) {
          results.push({ success: false, error: error.message, data: groupData })
        }
      }
      return results
    },

    async bulkDelete(groupIds: string[]) {
      const results = []
      for (const id of groupIds) {
        try {
          await this.deleteGroup(id)
          results.push({ success: true, id })
        } catch (error: any) {
          results.push({ success: false, error: error.message, id })
        }
      }
      return results
    },

    setSelectedGroup(group: Group | null) {
      this.selectedGroup = group
    },

    setSearchQuery(query: string) {
      this.searchQuery = query
    },

    toggleSelection(groupId: string) {
      const index = this.selectedIds.indexOf(groupId)
      if (index === -1) {
        this.selectedIds.push(groupId)
      } else {
        this.selectedIds.splice(index, 1)
      }
    },

    clearSelection() {
      this.selectedIds = []
    }
  }
})