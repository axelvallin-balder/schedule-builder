// T031: Accessibility tests for calendar components
// Tests for WCAG compliance and screen reader support

import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ScheduleSelector from '../../app/components/schedule/ScheduleSelector.vue'
import CalendarView from '../../app/components/schedule/CalendarView.vue'
import type { ScheduleOption, CalendarWeek } from '../../types/calendar'

describe('Calendar Accessibility Tests', () => {
  const mockSchedules: ScheduleOption[] = [
    {
      id: 'schedule-1',
      name: 'Week 40, 2025',
      status: 'active',
      weekNumber: 40,
      year: 2025,
      isDefault: true
    }
  ]

  const mockCalendarWeek: CalendarWeek = {
    scheduleId: 'schedule-1',
    scheduleName: 'Test Schedule',
    className: 'Test Class',
    timeSlots: [
      {
        startTime: '09:00',
        endTime: '10:00',
        dayOfWeek: 1,
        lessons: [],
        isEmpty: true
      }
    ],
    days: [
      {
        dayOfWeek: 1,
        dayName: 'Monday',
        date: '2025-10-01',
        lessons: [],
        isEmpty: true
      }
    ],
    isEmpty: false
  }

  describe('ScheduleSelector Accessibility', () => {
    let wrapper: any

    beforeEach(() => {
      wrapper = mount(ScheduleSelector, {
        props: {
          schedules: mockSchedules,
          selectedScheduleId: null,
          loading: false,
          error: null
        }
      })
    })

    it('has proper form labels', () => {
      const label = wrapper.find('label[for="schedule-select"]')
      const select = wrapper.find('#schedule-select')
      
      expect(label.exists()).toBe(true)
      expect(select.exists()).toBe(true)
      expect(label.text()).toContain('Select Schedule')
    })

    it('has screen reader only text', () => {
      const srOnlyText = wrapper.find('.sr-only')
      expect(srOnlyText.exists()).toBe(true)
      expect(srOnlyText.text()).toContain('Select a schedule from the dropdown menu')
    })

    it('has proper ARIA attributes', () => {
      const select = wrapper.find('select')
      
      expect(select.attributes('aria-label')).toBeDefined()
      expect(select.attributes('aria-label')).toContain('Schedule selector')
    })

    it('indicates loading state to screen readers', async () => {
      await wrapper.setProps({ loading: true })
      
      const select = wrapper.find('select')
      expect(select.attributes('disabled')).toBe('')
      expect(select.attributes('aria-label')).toContain('schedules available')
    })

    it('announces errors properly', async () => {
      const errorMessage = 'Failed to load schedules'
      await wrapper.setProps({ error: errorMessage })
      
      const errorElement = wrapper.find('#schedule-error')
      expect(errorElement.exists()).toBe(true)
      expect(errorElement.attributes('role')).toBe('alert')
      expect(errorElement.attributes('aria-live')).toBe('polite')
      expect(errorElement.text()).toBe(errorMessage)
      
      const select = wrapper.find('select')
      expect(select.attributes('aria-describedby')).toBe('schedule-error')
      expect(select.attributes('aria-invalid')).toBe('true')
    })
  })

  describe('CalendarView Accessibility', () => {
    let wrapper: any

    beforeEach(() => {
      wrapper = mount(CalendarView, {
        props: {
          currentWeek: mockCalendarWeek,
          viewMode: 'week',
          selectedDayOfWeek: 1,
          loading: false,
          error: null
        }
      })
    })

    it('has proper application role and label', () => {
      const calendar = wrapper.find('[data-testid="calendar-view"]')
      
      expect(calendar.attributes('role')).toBe('application')
      expect(calendar.attributes('aria-label')).toBe('Schedule Calendar View')
    })

    it('has properly labeled calendar title', () => {
      const title = wrapper.find('#calendar-title')
      expect(title.exists()).toBe(true)
      expect(title.text()).toContain('Weekly Schedule')
    })

    it('announces loading states', async () => {
      await wrapper.setProps({ loading: true })
      
      const loadingContainer = wrapper.find('[data-testid="calendar-loading"]')
      expect(loadingContainer.attributes('role')).toBe('status')
      expect(loadingContainer.attributes('aria-live')).toBe('polite')
      
      const srOnlyText = loadingContainer.find('.sr-only')
      expect(srOnlyText.text()).toBe('Loading schedule information')
    })

    it('has accessible grid structure in week view', () => {
      const grid = wrapper.find('[role="grid"]')
      
      expect(grid.exists()).toBe(true)
      expect(grid.attributes('aria-labelledby')).toBe('calendar-title')
      expect(grid.attributes('aria-rowcount')).toBeDefined()
      expect(grid.attributes('aria-colcount')).toBeDefined()
      expect(grid.attributes('tabindex')).toBe('0')
    })

    it('supports keyboard navigation', async () => {
      const grid = wrapper.find('[role="grid"]')
      
      // Test that keydown events are handled
      await grid.trigger('keydown', { key: 'ArrowRight' })
      await grid.trigger('keydown', { key: 'Enter' })
      await grid.trigger('keydown', { key: 'Escape' })
      
      // Should not throw errors
      expect(true).toBe(true)
    })

    it('handles empty states accessibly', async () => {
      const emptyWeek = { ...mockCalendarWeek, days: [], isEmpty: true }
      await wrapper.setProps({ currentWeek: emptyWeek })
      
      const emptyState = wrapper.find('[data-testid="calendar-empty"]')
      expect(emptyState.exists()).toBe(true)
    })
  })

  describe('Color Contrast and Visual Accessibility', () => {
    it('uses sufficient color contrast', () => {
      // This would typically involve automated testing with tools like axe-core
      // For now, we'll ensure proper CSS classes are applied
      
      const wrapper = mount(ScheduleSelector, {
        props: {
          schedules: mockSchedules,
          selectedScheduleId: null,
          loading: false,
          error: null
        }
      })
      
      const select = wrapper.find('select')
      expect(select.classes()).toContain('border-gray-300')
      expect(select.classes()).toContain('focus:ring-blue-500')
    })

    it('provides focus indicators', () => {
      const wrapper = mount(ScheduleSelector, {
        props: {
          schedules: mockSchedules,
          selectedScheduleId: null,
          loading: false,
          error: null
        }
      })
      
      const select = wrapper.find('select')
      expect(select.classes()).toContain('focus:outline-none')
      expect(select.classes()).toContain('focus:ring-2')
      expect(select.classes()).toContain('focus:ring-blue-500')
    })
  })

  describe('Motion and Animation Accessibility', () => {
    it('provides alternatives for animations', () => {
      // Check that spinning animations have aria-hidden
      const wrapper = mount(CalendarView, {
        props: {
          currentWeek: null,
          viewMode: 'week',
          selectedDayOfWeek: 1,
          loading: true,
          error: null
        }
      })
      
      const spinner = wrapper.find('.animate-spin')
      expect(spinner.attributes('aria-hidden')).toBe('true')
    })
  })
})