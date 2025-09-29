import { describe, it, expect, beforeEach } from 'vitest';
import { RuleValidator } from '../../../src/services/RuleValidator';

describe('RuleValidator Service', () => {
  let ruleValidator: RuleValidator;

  beforeEach(() => {
    ruleValidator = new RuleValidator();
  });

  it('should create a rule validator instance', () => {
    expect(ruleValidator).toBeDefined();
    expect(ruleValidator).toBeInstanceOf(RuleValidator);
  });

  it('should validate minimum lesson duration of 45 minutes', () => {
    const validLesson = {
      id: '1',
      duration: 45,
      startTime: '09:00',
      dayOfWeek: 1,
    };

    const invalidLesson = {
      id: '2',
      duration: 30, // Too short
      startTime: '09:00',
      dayOfWeek: 1,
    };

    expect(ruleValidator.validateLessonDuration(validLesson)).toBe(true);
    expect(ruleValidator.validateLessonDuration(invalidLesson)).toBe(false);
  });

  it('should validate teacher working hours', () => {
    const teacher = {
      id: 'teacher-1',
      workingHours: { start: '08:15', end: '16:00' },
    };

    const validLesson = {
      startTime: '09:00',
      duration: 45,
    };

    const invalidLesson = {
      startTime: '07:00', // Before working hours
      duration: 45,
    };

    expect(ruleValidator.validateTeacherWorkingHours(teacher, validLesson)).toBe(true);
    expect(ruleValidator.validateTeacherWorkingHours(teacher, invalidLesson)).toBe(false);
  });

  it('should validate break duration between lessons', () => {
    const subject = {
      id: 'math',
      breakDuration: 10,
    };

    const lesson1 = {
      startTime: '09:00',
      duration: 45, // Ends at 09:45
    };

    const lesson2Valid = {
      startTime: '09:55', // 10 minutes after lesson1 ends
      duration: 45,
    };

    const lesson2Invalid = {
      startTime: '09:50', // Only 5 minutes after lesson1 ends
      duration: 45,
    };

    expect(ruleValidator.validateBreakDuration(subject, lesson1, lesson2Valid)).toBe(true);
    expect(ruleValidator.validateBreakDuration(subject, lesson1, lesson2Invalid)).toBe(false);
  });

  it('should validate maximum 2 lessons per course per day', () => {
    const course = { id: 'course-1' };
    const dayOfWeek = 1; // Monday

    const existingLessons = [
      { courseId: 'course-1', dayOfWeek: 1, startTime: '09:00' },
      { courseId: 'course-1', dayOfWeek: 1, startTime: '11:00' },
    ];

    const newLesson = {
      courseId: 'course-1',
      dayOfWeek: 1,
      startTime: '14:00',
    };

    expect(ruleValidator.validateMaxLessonsPerDay(course, dayOfWeek, existingLessons, newLesson)).toBe(false);
  });

  it('should validate dependent group conflicts', () => {
    const group1 = {
      id: 'group-1',
      dependentGroupIds: ['group-2'],
    };

    const group2 = {
      id: 'group-2',
      dependentGroupIds: [],
    };

    const lesson1 = {
      groupIds: ['group-1'],
      dayOfWeek: 1,
      startTime: '09:00',
      duration: 45,
    };

    const lesson2Conflict = {
      groupIds: ['group-2'],
      dayOfWeek: 1,
      startTime: '09:15', // Overlaps with lesson1
      duration: 45,
    };

    const lesson2Valid = {
      groupIds: ['group-2'],
      dayOfWeek: 1,
      startTime: '10:00', // No overlap
      duration: 45,
    };

    expect(ruleValidator.validateDependentGroups(group1, lesson1, lesson2Conflict)).toBe(false);
    expect(ruleValidator.validateDependentGroups(group1, lesson1, lesson2Valid)).toBe(true);
  });

  it('should validate lunch period requirements', () => {
    const classEntity = {
      id: 'class-1',
      lunchDuration: 30,
    };

    const lessons = [
      { startTime: '12:00', duration: 45 }, // Ends at 12:45 - needs lunch
      { startTime: '13:30', duration: 45 }, // Valid - 45 min after previous
    ];

    const invalidLessons = [
      { startTime: '12:00', duration: 45 }, // Ends at 12:45
      { startTime: '13:00', duration: 45 }, // Invalid - only 15 min break
    ];

    expect(ruleValidator.validateLunchPeriod(classEntity, lessons)).toBe(true);
    expect(ruleValidator.validateLunchPeriod(classEntity, invalidLessons)).toBe(false);
  });

  it('should validate complete schedule consistency', () => {
    const schedule = {
      lessons: [
        {
          id: '1',
          courseId: 'course-1',
          teacherId: 'teacher-1',
          dayOfWeek: 1,
          startTime: '09:00',
          duration: 45,
          groupIds: ['group-1'],
        },
        {
          id: '2',
          courseId: 'course-2',
          teacherId: 'teacher-1',
          dayOfWeek: 1,
          startTime: '10:00', // Valid - 15 min break
          duration: 45,
          groupIds: ['group-2'],
        },
      ],
    };

    const teachers = [{ id: 'teacher-1', workingHours: { start: '08:15', end: '16:00' } }];
    const groups = [
      { id: 'group-1', dependentGroupIds: [] },
      { id: 'group-2', dependentGroupIds: [] },
    ];
    const subjects = [{ id: 'subject-1', breakDuration: 10 }];
    const classes = [{ id: 'class-1', lunchDuration: 30 }];

    const result = ruleValidator.validateSchedule(schedule, {
      teachers,
      groups,
      subjects,
      classes,
    });

    expect(result.isValid).toBe(true);
    expect(Array.isArray(result.violations)).toBe(true);
  });
});