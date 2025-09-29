import { describe, it, expect, beforeEach } from 'vitest';
import { ScheduleGenerator } from '../../../src/services/ScheduleGenerator';

describe('ScheduleGenerator Service', () => {
  let scheduleGenerator: ScheduleGenerator;

  beforeEach(() => {
    scheduleGenerator = new ScheduleGenerator();
  });

  it('should create a schedule generator instance', () => {
    expect(scheduleGenerator).toBeDefined();
    expect(scheduleGenerator).toBeInstanceOf(ScheduleGenerator);
  });

  it('should generate a schedule for given courses', async () => {
    const courses = [
      {
        id: '1',
        subjectId: 'math',
        teacherId: 'teacher-1',
        groupIds: ['group-1'],
        weeklyHours: 3,
        numberOfLessons: 2,
      },
    ];

    const teachers = [
      {
        id: 'teacher-1',
        name: 'Math Teacher',
        subjectIds: ['math'],
        workingHours: { start: '08:15', end: '16:00' },
      },
    ];

    const groups = [
      {
        id: 'group-1',
        name: 'Group A',
        classId: 'class-1',
        dependentGroupIds: [],
      },
    ];

    const result = await scheduleGenerator.generateSchedule({
      courses,
      teachers,
      groups,
      weekNumber: 1,
      year: 2025,
    });

    expect(result).toBeDefined();
    expect(result.schedule).toBeDefined();
    expect(result.status).toBeOneOf(['success', 'partial', 'failed']);
    expect(Array.isArray(result.messages)).toBe(true);
  });

  it('should handle conflicting constraints', async () => {
    const courses = [
      {
        id: '1',
        subjectId: 'math',
        teacherId: 'teacher-1',
        groupIds: ['group-1'],
        weeklyHours: 40, // Impossible hours
        numberOfLessons: 2,
      },
    ];

    const teachers = [
      {
        id: 'teacher-1',
        name: 'Math Teacher',
        subjectIds: ['math'],
        workingHours: { start: '08:15', end: '09:00' }, // Very short hours
      },
    ];

    const groups = [
      {
        id: 'group-1',
        name: 'Group A',
        classId: 'class-1',
        dependentGroupIds: [],
      },
    ];

    const result = await scheduleGenerator.generateSchedule({
      courses,
      teachers,
      groups,
      weekNumber: 1,
      year: 2025,
    });

    expect(result.status).toBe('failed');
    expect(result.messages.length).toBeGreaterThan(0);
  });

  it('should prioritize most constrained courses first', () => {
    const courses = [
      {
        id: '1',
        subjectId: 'math',
        weeklyHours: 5,
        numberOfLessons: 3,
      },
      {
        id: '2',
        subjectId: 'english',
        weeklyHours: 2,
        numberOfLessons: 1,
      },
    ];

    const sortedCourses = scheduleGenerator.sortCoursesByConstraints(courses);

    // More constrained course (math) should come first
    expect(sortedCourses[0].id).toBe('1');
    expect(sortedCourses[1].id).toBe('2');
  });

  it('should generate valid time slots based on constraints', () => {
    const teacher = {
      id: 'teacher-1',
      workingHours: { start: '09:00', end: '15:00' },
    };

    const constraints = {
      dayOfWeek: 1, // Monday
      duration: 45,
      breakDuration: 10,
      existingLessons: [],
    };

    const timeSlots = scheduleGenerator.generateValidTimeSlots(teacher, constraints);

    expect(Array.isArray(timeSlots)).toBe(true);
    timeSlots.forEach(slot => {
      expect(slot.startTime >= '09:00').toBe(true);
      expect(slot.endTime <= '15:00').toBe(true);
      expect(slot.duration).toBe(45);
    });
  });

  it('should use randomization for slot selection', () => {
    const availableSlots = [
      { startTime: '09:00', weight: 0.9 },
      { startTime: '10:00', weight: 0.7 },
      { startTime: '11:00', weight: 0.5 },
    ];

    const selectedSlot1 = scheduleGenerator.selectRandomSlot(availableSlots, 123);
    const selectedSlot2 = scheduleGenerator.selectRandomSlot(availableSlots, 456);

    // With different seeds, might get different results
    expect(selectedSlot1).toBeDefined();
    expect(selectedSlot2).toBeDefined();
    expect(availableSlots).toContain(selectedSlot1);
    expect(availableSlots).toContain(selectedSlot2);
  });

  it('should implement backtracking when no valid slots found', async () => {
    const courses = [
      {
        id: '1',
        subjectId: 'math',
        teacherId: 'teacher-1',
        groupIds: ['group-1'],
        weeklyHours: 3,
        numberOfLessons: 5, // Too many lessons for a week
      },
    ];

    const teachers = [
      {
        id: 'teacher-1',
        name: 'Math Teacher',
        subjectIds: ['math'],
        workingHours: { start: '08:15', end: '16:00' },
      },
    ];

    const groups = [
      {
        id: 'group-1',
        name: 'Group A',
        classId: 'class-1',
        dependentGroupIds: [],
      },
    ];

    const result = await scheduleGenerator.generateSchedule({
      courses,
      teachers,
      groups,
      weekNumber: 1,
      year: 2025,
    });

    // Should attempt backtracking and provide feedback
    expect(result.messages.some(msg => msg.includes('backtrack'))).toBe(true);
  });
});