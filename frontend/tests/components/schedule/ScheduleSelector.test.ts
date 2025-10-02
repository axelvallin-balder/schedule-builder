// T029: Unit tests for ScheduleSelector component
// Updated tests for implemented component

import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { ScheduleOption } from '../../../types/calendar'
import ScheduleSelector from '../../../app/components/schedule/ScheduleSelector.vue'

describe('ScheduleSelector Component', () => {
  let wrapper: any

  const mockSchedules: ScheduleOption[] = [
    {
      id: 'schedule-1',
      name: 'Week 40, 2025',
      status: 'active',
      weekNumber: 40,
      year: 2025,
      isDefault: true
    },
    {
      id: 'schedule-2', 
      name: 'Week 39, 2025',
      status: 'archived',
      weekNumber: 39,
      year: 2025,
      isDefault: false
    }
  ]

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

  it('should render dropdown with schedule options', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('select').exists()).toBe(true)
    const options = wrapper.findAll('option')
    expect(options.length).toBeGreaterThan(0)
  })

  it('should display schedule names correctly', () => {
    const options = wrapper.findAll('option')
    const optionTexts = options.map((option: any) => option.text())
    expect(optionTexts.some((text: string) => text.includes('Week 40, 2025'))).toBe(true)
  })

  it('should show loading state', async () => {
    await wrapper.setProps({ loading: true })
    expect(wrapper.find('[data-testid="schedule-loading"]').exists()).toBe(true)
    expect(wrapper.find('select').attributes('disabled')).toBe('')
  })

  it('should emit schedule-selected event on change', async () => {
    const select = wrapper.find('select')
    await select.setValue('schedule-1')
    
    expect(wrapper.emitted('schedule-selected')).toBeTruthy()
  })

  it('should show empty state when no schedules', async () => {
    await wrapper.setProps({ schedules: [] })
    expect(wrapper.find('.empty-schedules').exists()).toBe(true)
    expect(wrapper.find('.empty-schedules').text()).toContain('No schedules available')
  })

  it('should show error message when error prop is set', async () => {
    const errorMessage = 'Failed to load schedules'
    await wrapper.setProps({ error: errorMessage })
    expect(wrapper.find('[data-testid="error-message"]').text()).toBe(errorMessage)
  })

  it('should handle external selectedScheduleId changes', async () => {
    await wrapper.setProps({ selectedScheduleId: 'schedule-2' })
    const select = wrapper.find('select')
    expect(select.element.value).toBe('schedule-2')
  })
})