// Calendar Store - Pinia Store for Calendar Schedule Display
// Manages calendar state, data loading, and UI interactions

import { defineStore } from 'pinia'
import { schedulesApi, groupsApi } from '../../services/api'
import { calendarService } from '../../services/calendarService'
import type { 
  CalendarState, 
  CalendarWeek, 
  ScheduleOption, 
  ClassOption 
} from '../../types/calendar'

export const useCalendarStore = defineStore('calendar', {
  state: (): CalendarState => ({
    selectedScheduleId: null,
    selectedClassId: null,
    availableSchedules: [],
    availableClasses: [],
    currentCalendarWeek: null,
    isLoading: false,
    error: null,
    // UI state
    viewMode: 'week',
    selectedDay: 1, // Monday default
  }),

  getters: {
    hasScheduleSelected: (state) => !!state.selectedScheduleId,
    hasClassSelected: (state) => !!state.selectedClassId,
    canDisplayCalendar: (state) => !!(state.selectedScheduleId && state.selectedClassId),
    
    selectedSchedule: (state) => 
      state.availableSchedules.find((s: ScheduleOption) => s.id === state.selectedScheduleId) || null,
    
    selectedClass: (state) => 
      state.availableClasses.find((c: ClassOption) => c.id === state.selectedClassId) || null,
    
    defaultSchedule: (state) => 
      state.availableSchedules.find((s: ScheduleOption) => s.isDefault) || state.availableSchedules[0] || null,
    
    isLoadingData: (state) => state.isLoading,
    hasError: (state) => !!state.error,
    
    // Calendar display getters
    currentDayLessons: (state) => {
      if (!state.currentCalendarWeek) return []
      const day = state.currentCalendarWeek.days.find((d) => d.dayOfWeek === state.selectedDay)
      return day?.lessons || []
    },
    
    isEmpty: (state) => state.currentCalendarWeek?.isEmpty ?? true,
  },

  actions: {
    // Schedule management
    async loadScheduleOptions() {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await schedulesApi.getAll({ status: 'published', pageSize: 50 })
        this.availableSchedules = response.data.map((schedule: any) => ({
          id: schedule.id,
          name: schedule.name,
          status: schedule.status as 'draft' | 'active' | 'archived',
          weekNumber: 1, // Default weekNumber since not in Schedule interface
          year: new Date().getFullYear(), // Default year since not in Schedule interface
          isDefault: schedule.status === 'published'
        }))
        
        // Auto-select default schedule if none selected
        if (!this.selectedScheduleId && this.defaultSchedule) {
          this.selectedScheduleId = this.defaultSchedule.id
        }
      } catch (error) {
        this.error = `Failed to load schedules: ${error}`
        console.error('Error loading schedules:', error)
      } finally {
        this.isLoading = false
      }
    },

    async loadClassOptions() {
      this.isLoading = true
      this.error = null
      
      try {
        // Note: Using groupsApi since classes aren't directly available
        // Will need to derive class information from groups
        const groupsResponse = await groupsApi.getAll()
        
        // Group by year to create class options (using year as class identifier)
        const classMap = new Map<string, { name: string; groupCount: number }>()
        
        groupsResponse.data.forEach((group: any) => {
          const classId = `Year ${group.year}` // Using year as class identifier
          const existing = classMap.get(classId)
          if (existing) {
            existing.groupCount++
          } else {
            classMap.set(classId, {
              name: classId,
              groupCount: 1
            })
          }
        })
        
        this.availableClasses = Array.from(classMap.entries()).map(([id, data]) => ({
          id,
          name: data.name,
          groupCount: data.groupCount,
          searchText: data.name.toLowerCase()
        }))
      } catch (error) {
        this.error = `Failed to load classes: ${error}`
        console.error('Error loading classes:', error)
      } finally {
        this.isLoading = false
      }
    },

    selectSchedule(scheduleId: string) {
      this.selectedScheduleId = scheduleId
      this.currentCalendarWeek = null // Clear current calendar
      
      // Reload calendar if class is also selected
      if (this.selectedClassId) {
        this.generateCalendarWeek()
      }
    },

    selectClass(classId: string) {
      this.selectedClassId = classId
      this.currentCalendarWeek = null // Clear current calendar
      
      // Reload calendar if schedule is also selected
      if (this.selectedScheduleId) {
        this.generateCalendarWeek()
      }
    },

    // Calendar generation
    async generateCalendarWeek() {
      if (!this.canDisplayCalendar) {
        console.warn('Cannot generate calendar: missing schedule or class selection')
        return
      }

      this.isLoading = true
      this.error = null

      try {
        const calendarData = await calendarService.loadCalendarData(
          this.selectedScheduleId!,
          this.selectedClassId!
        )
        this.currentCalendarWeek = calendarData
      } catch (error) {
        this.error = `Failed to load calendar: ${error}`
        console.error('Error generating calendar:', error)
        
        // Fallback to empty calendar
        this.currentCalendarWeek = {
          scheduleId: this.selectedScheduleId!,
          scheduleName: this.selectedSchedule?.name || 'Unknown Schedule',
          className: this.selectedClass?.name || 'Unknown Class',
          timeSlots: [],
          days: [],
          isEmpty: true
        }
      } finally {
        this.isLoading = false
      }
    },

    // UI state management
    setViewMode(mode: 'week' | 'day') {
      this.viewMode = mode
    },

    setSelectedDay(dayOfWeek: number) {
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        this.selectedDay = dayOfWeek
      }
    },

    // Error handling
    clearError() {
      this.error = null
    },

    // Initialization
    async initialize() {
      await Promise.all([
        this.loadScheduleOptions(),
        this.loadClassOptions()
      ])
    },

    // Reset state
    reset() {
      this.selectedScheduleId = null
      this.selectedClassId = null
      this.currentCalendarWeek = null
      this.error = null
      this.viewMode = 'week'
      this.selectedDay = 1
    }
  }
})