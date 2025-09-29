import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
// @ts-ignore
import WeeklySchedule from '../../../components/schedule/WeeklySchedule.vue';

// Mock data types based on our data model
interface Lesson {
  id: string;
  courseId: string;
  teacherId: string;
  groupIds: string[];
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  dayOfWeek: number; // 1-5 (Monday-Friday)
  classroom?: string;
}

interface Schedule {
  id: string;
  name: string;
  weekNumber: number;
  year: number;
  status: 'draft' | 'active' | 'archived';
  lessons: Lesson[];
}

const mockSchedule: Schedule = {
  id: 'schedule-1',
  name: 'Week 1 Schedule',
  weekNumber: 1,
  year: 2025,
  status: 'active',
  lessons: [
    {
      id: 'lesson-1',
      courseId: 'course-1',
      teacherId: 'teacher-1',
      groupIds: ['group-1'],
      startTime: '09:00',
      endTime: '09:45',
      dayOfWeek: 1, // Monday
      classroom: 'Room 101'
    },
    {
      id: 'lesson-2',
      courseId: 'course-2',
      teacherId: 'teacher-2',
      groupIds: ['group-1'],
      startTime: '10:00',
      endTime: '10:45',
      dayOfWeek: 1, // Monday
      classroom: 'Room 102'
    },
    {
      id: 'lesson-3',
      courseId: 'course-1',
      teacherId: 'teacher-1',
      groupIds: ['group-2'],
      startTime: '09:00',
      endTime: '09:45',
      dayOfWeek: 2, // Tuesday
      classroom: 'Room 101'
    }
  ]
};

describe('WeeklySchedule', () => {
  beforeEach(() => {
    // Reset any global state before each test
  });

  describe('Component Rendering', () => {
    it('should render the weekly schedule grid', () => {
      const wrapper = mount(WeeklySchedule, {
        props: {
          schedule: mockSchedule
        }
      });

      expect(wrapper.find('[data-testid="weekly-schedule-grid"]').exists()).toBe(true);
    });

    it('should render all weekdays (Monday-Friday)', () => {
      const wrapper = mount(WeeklySchedule, {
        props: {
          schedule: mockSchedule
        }
      });

      const dayHeaders = wrapper.findAll('[data-testid="day-header"]');
      expect(dayHeaders).toHaveLength(5);
      
      const expectedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      dayHeaders.forEach((header, index) => {
        expect(header.text()).toContain(expectedDays[index]);
      });
    });

    it('should render time slots from 08:15 to 16:00', () => {
      const wrapper = mount(WeeklySchedule, {
        props: {
          schedule: mockSchedule
        }
      });

      const timeSlots = wrapper.findAll('[data-testid="time-slot"]');
      expect(timeSlots.length).toBeGreaterThan(0);
      
      // Check first and last time slots
      expect(wrapper.find('[data-testid="time-slot"][data-time="08:15"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="time-slot"][data-time="16:00"]').exists()).toBe(true);
    });
  });

  describe('Lesson Display', () => {
    it('should display lessons in correct time slots', () => {
      const wrapper = mount(WeeklySchedule, {
        props: {
          schedule: mockSchedule
        }
      });

      // Check Monday 09:00 lesson
      const mondayLessons = wrapper.findAll('[data-testid="lesson-card"][data-day="1"]');
      expect(mondayLessons.length).toBe(2); // Two lessons on Monday
    });

    it('should display lesson details correctly', () => {
      const wrapper = mount(WeeklySchedule, {
        props: {
          schedule: mockSchedule
        }
      });

      const firstLesson = wrapper.find('[data-testid="lesson-card"][data-lesson-id="lesson-1"]');
      expect(firstLesson.exists()).toBe(true);
      expect(firstLesson.text()).toContain('09:00');
      expect(firstLesson.text()).toContain('Room 101');
    });

    it('should handle overlapping lessons properly', () => {
      const scheduleWithOverlap: Schedule = {
        ...mockSchedule,
        lessons: [
          {
            id: 'lesson-overlap-1',
            courseId: 'course-1',
            teacherId: 'teacher-1',
            groupIds: ['group-1'],
            startTime: '09:00',
            endTime: '09:45',
            dayOfWeek: 1,
            classroom: 'Room 101'
          },
          {
            id: 'lesson-overlap-2',
            courseId: 'course-2',
            teacherId: 'teacher-2',
            groupIds: ['group-1'], // Same group - conflict!
            startTime: '09:00',
            endTime: '09:45',
            dayOfWeek: 1,
            classroom: 'Room 102'
          }
        ]
      };

      const wrapper = mount(WeeklySchedule, {
        props: {
          schedule: scheduleWithOverlap
        }
      });

      const conflictIndicators = wrapper.findAll('[data-testid="conflict-indicator"]');
      expect(conflictIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('User Interactions', () => {
    it('should emit lesson-click event when lesson is clicked', async () => {
      const wrapper = mount(WeeklySchedule, {
        props: {
          schedule: mockSchedule
        }
      });

      const lessonCard = wrapper.find('[data-testid="lesson-card"][data-lesson-id="lesson-1"]');
      await lessonCard.trigger('click');

      expect(wrapper.emitted('lesson-click')).toBeTruthy();
      expect(wrapper.emitted('lesson-click')?.[0]).toEqual([mockSchedule.lessons[0]]);
    });

    it('should emit time-slot-click event when empty slot is clicked', async () => {
      const wrapper = mount(WeeklySchedule, {
        props: {
          schedule: mockSchedule
        }
      });

      const emptySlot = wrapper.find('[data-testid="empty-slot"][data-day="3"][data-time="14:00"]');
      await emptySlot.trigger('click');

      expect(wrapper.emitted('time-slot-click')).toBeTruthy();
      expect(wrapper.emitted('time-slot-click')?.[0]).toEqual([
        { dayOfWeek: 3, time: '14:00' }
      ]);
    });

    it('should highlight current time slot', () => {
      // Mock current time to be within school hours
      const mockDate = new Date('2025-09-29T10:30:00'); // Monday 10:30
      vi.setSystemTime(mockDate);

      const wrapper = mount(WeeklySchedule, {
        props: {
          schedule: mockSchedule,
          highlightCurrentTime: true
        }
      });

      const currentTimeSlot = wrapper.find('[data-testid="current-time-indicator"]');
      expect(currentTimeSlot.exists()).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile view', () => {
      const wrapper = mount(WeeklySchedule, {
        props: {
          schedule: mockSchedule,
          viewMode: 'mobile'
        }
      });

      expect(wrapper.find('[data-testid="mobile-schedule-view"]').exists()).toBe(true);
    });

    it('should show desktop grid view by default', () => {
      const wrapper = mount(WeeklySchedule, {
        props: {
          schedule: mockSchedule
        }
      });

      expect(wrapper.find('[data-testid="desktop-schedule-grid"]').exists()).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const wrapper = mount(WeeklySchedule, {
        props: {
          schedule: mockSchedule
        }
      });

      expect(wrapper.find('[role="grid"]').exists()).toBe(true);
      expect(wrapper.find('[aria-label="Weekly Schedule"]').exists()).toBe(true);
    });

    it('should support keyboard navigation', async () => {
      const wrapper = mount(WeeklySchedule, {
        props: {
          schedule: mockSchedule
        }
      });

      const grid = wrapper.find('[role="grid"]');
      await grid.trigger('keydown', { key: 'ArrowRight' });

      expect(wrapper.emitted('navigate')).toBeTruthy();
    });

    it('should announce schedule changes to screen readers', async () => {
      const wrapper = mount(WeeklySchedule, {
        props: {
          schedule: mockSchedule
        }
      });

      await wrapper.setProps({
        schedule: {
          ...mockSchedule,
          lessons: [...mockSchedule.lessons, {
            id: 'new-lesson',
            courseId: 'course-3',
            teacherId: 'teacher-3',
            groupIds: ['group-3'],
            startTime: '11:00',
            endTime: '11:45',
            dayOfWeek: 3,
            classroom: 'Room 103'
          }]
        }
      });

      const announcement = wrapper.find('[aria-live="polite"]');
      expect(announcement.exists()).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should virtualize large schedules efficiently', () => {
      // Create a large schedule with many lessons
      const largeSchedule: Schedule = {
        ...mockSchedule,
        lessons: Array.from({ length: 100 }, (_, i) => ({
          id: `lesson-${i}`,
          courseId: `course-${i % 10}`,
          teacherId: `teacher-${i % 5}`,
          groupIds: [`group-${i % 20}`],
          startTime: '09:00',
          endTime: '09:45',
          dayOfWeek: (i % 5) + 1,
          classroom: `Room ${100 + i}`
        }))
      };

      const wrapper = mount(WeeklySchedule, {
        props: {
          schedule: largeSchedule,
          virtualizeRows: true
        }
      });

      // Should not render all lessons at once
      const renderedLessons = wrapper.findAll('[data-testid="lesson-card"]');
      expect(renderedLessons.length).toBeLessThan(largeSchedule.lessons.length);
    });
  });
});