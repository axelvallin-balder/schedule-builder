import { defineStore } from 'pinia'
import { rulesApi } from '../../services/api'

export interface Rule {
  id: string
  name: string
  description: string
  type: 'constraint' | 'preference'
  priority: number
  enabled: boolean
  conditions: any[]
  actions: any[]
  metadata?: {
    createdBy?: string
    lastModified?: string
    category?: string
  }
}

export const useRuleStore = defineStore('rules', {
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