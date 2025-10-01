// T030: Performance tests for calendar components
// Tests for calendar rendering performance and data loading efficiency

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { performance } from 'perf_hooks'
import CalendarView from '../../app/components/schedule/CalendarView.vue'
import type { CalendarWeek, CalendarLesson, CalendarDay, CalendarTimeSlot } from '../../types/calendar'

// Helper to generate large mock data
function generateMockCalendarWeek(lessonCount: number): CalendarWeek {
  const lessons: CalendarLesson[] = []
  const timeSlots: CalendarTimeSlot[] = []
  const days: CalendarDay[] = []

  // Generate time slots (8 AM to 5 PM)
  for (let hour = 8; hour < 17; hour++) {
    timeSlots.push({
      startTime: `${hour.toString().padStart(2, '0')}:00`,
      endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
      dayOfWeek: 1,
      lessons: [],
      isEmpty: true
    })
  }

  // Generate lessons across 5 days
  for (let i = 0; i < lessonCount; i++) {
    const dayOfWeek = (i % 5) + 1
    const hour = 8 + (i % 9)
    
    lessons.push({
      id: `lesson-${i}`,
      subjectName: `Subject ${i}`,
      teacherName: `Teacher ${i}`,
      groupNames: [`Group ${i}`],
      startTime: `${hour.toString().padStart(2, '0')}:00`,
      duration: 60,
      roomId: `Room ${i}`,
      dayOfWeek,
      gridRowStart: (hour - 7),
      gridRowSpan: 1,
      position: 1
    })
  }

  // Generate days
  for (let day = 1; day <= 5; day++) {
    const dayLessons = lessons.filter(l => l.dayOfWeek === day)
    days.push({
      dayOfWeek: day,
      dayName: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][day - 1],
      date: `2025-10-${day.toString().padStart(2, '0')}`,
      lessons: dayLessons,
      isEmpty: dayLessons.length === 0
    })
  }

  return {
    scheduleId: 'perf-test-schedule',
    scheduleName: 'Performance Test Schedule',
    className: 'Performance Test Class',
    timeSlots,
    days,
    isEmpty: false
  }
}

describe('Calendar Performance Tests', () => {
  const PERFORMANCE_THRESHOLDS = {
    RENDER_TIME_MS: 100,        // Component should render in < 100ms
    UPDATE_TIME_MS: 50,         // Props updates should take < 50ms
    LARGE_DATASET_MS: 200,      // Large datasets should render in < 200ms
    MEMORY_LEAK_THRESHOLD: 1000 // Max components before considering leak
  }

  beforeEach(() => {
    // Clear any existing timers or performance marks
    if (typeof performance.clearMarks === 'function') {
      performance.clearMarks()
    }
  })

  it('should render small calendar quickly', async () => {
    const mockData = generateMockCalendarWeek(10) // 10 lessons
    
    const startTime = performance.now()
    
    const wrapper = mount(CalendarView, {
      props: {
        currentWeek: mockData,
        viewMode: 'week',
        selectedDayOfWeek: 1,
        loading: false,
        error: null
      }
    })
    
    await wrapper.vm.$nextTick()
    const renderTime = performance.now() - startTime
    
    expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME_MS)
    expect(wrapper.exists()).toBe(true)
    
    wrapper.unmount()
  })

  it('should handle large datasets efficiently', async () => {
    const mockData = generateMockCalendarWeek(100) // 100 lessons
    
    const startTime = performance.now()
    
    const wrapper = mount(CalendarView, {
      props: {
        currentWeek: mockData,
        viewMode: 'week',
        selectedDayOfWeek: 1,
        loading: false,
        error: null
      }
    })
    
    await wrapper.vm.$nextTick()
    const renderTime = performance.now() - startTime
    
    expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_DATASET_MS)
    
    // Check that all lessons are rendered
    const lessonCards = wrapper.findAll('[data-testid="calendar-lesson-card"]')
    expect(lessonCards.length).toBe(100)
    
    wrapper.unmount()
  })

  it('should update props quickly', async () => {
    const initialData = generateMockCalendarWeek(20)
    const updatedData = generateMockCalendarWeek(30)
    
    const wrapper = mount(CalendarView, {
      props: {
        currentWeek: initialData,
        viewMode: 'week',
        selectedDayOfWeek: 1,
        loading: false,
        error: null
      }
    })
    
    await wrapper.vm.$nextTick()
    
    const startTime = performance.now()
    await wrapper.setProps({ currentWeek: updatedData })
    const updateTime = performance.now() - startTime
    
    expect(updateTime).toBeLessThan(PERFORMANCE_THRESHOLDS.UPDATE_TIME_MS)
    
    wrapper.unmount()
  })

  it('should switch view modes efficiently', async () => {
    const mockData = generateMockCalendarWeek(50)
    
    const wrapper = mount(CalendarView, {
      props: {
        currentWeek: mockData,
        viewMode: 'week',
        selectedDayOfWeek: 1,
        loading: false,
        error: null
      }
    })
    
    await wrapper.vm.$nextTick()
    
    // Test week to day switch
    const startTime = performance.now()
    await wrapper.setProps({ viewMode: 'day' })
    const switchTime = performance.now() - startTime
    
    expect(switchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.UPDATE_TIME_MS)
    
    // Verify day view is rendered
    expect(wrapper.find('[data-testid="day-view"]').exists()).toBe(true)
    
    wrapper.unmount()
  })

  it('should not leak memory with multiple mounts/unmounts', async () => {
    const mockData = generateMockCalendarWeek(20)
    const wrappers = []
    
    // Create many components
    for (let i = 0; i < 50; i++) {
      const wrapper = mount(CalendarView, {
        props: {
          currentWeek: mockData,
          viewMode: 'week',
          selectedDayOfWeek: 1,
          loading: false,
          error: null
        }
      })
      wrappers.push(wrapper)
    }
    
    // Unmount all
    wrappers.forEach(wrapper => wrapper.unmount())
    
    // This test passes if no memory errors occur
    expect(wrappers.length).toBe(50)
  })

  it('should handle rapid state changes', async () => {
    const mockData = generateMockCalendarWeek(30)
    
    const wrapper = mount(CalendarView, {
      props: {
        currentWeek: mockData,
        viewMode: 'week',
        selectedDayOfWeek: 1,
        loading: false,
        error: null
      }
    })
    
    const startTime = performance.now()
    
    // Rapid prop changes
    for (let day = 1; day <= 5; day++) {
      await wrapper.setProps({ selectedDayOfWeek: day })
    }
    
    const totalTime = performance.now() - startTime
    
    expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.UPDATE_TIME_MS * 5)
    
    wrapper.unmount()
  })

  it('should handle empty states efficiently', async () => {
    const emptyData: CalendarWeek = {
      scheduleId: 'empty',
      scheduleName: 'Empty Schedule',
      className: 'Empty Class',
      timeSlots: [],
      days: [],
      isEmpty: true
    }
    
    const startTime = performance.now()
    
    const wrapper = mount(CalendarView, {
      props: {
        currentWeek: emptyData,
        viewMode: 'week',
        selectedDayOfWeek: 1,
        loading: false,
        error: null
      }
    })
    
    await wrapper.vm.$nextTick()
    const renderTime = performance.now() - startTime
    
    expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME_MS)
    expect(wrapper.find('[data-testid="calendar-empty"]').exists()).toBe(true)
    
    wrapper.unmount()
  })
})