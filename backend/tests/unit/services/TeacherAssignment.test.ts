import { describe, it, expect, beforeEach } from 'vitest';
import { TeacherAssignment } from '../../../src/services/TeacherAssignment';

describe('TeacherAssignment Service', () => {
  let teacherAssignment: TeacherAssignment;

  beforeEach(() => {
    teacherAssignment = new TeacherAssignment();
  });

  it('should create a teacher assignment service instance', () => {
    expect(teacherAssignment).toBeDefined();
    expect(teacherAssignment).toBeInstanceOf(TeacherAssignment);
  });

  it('should assign qualified teachers to courses', () => {
    const courses = [
      {
        id: 'course-1',
        subjectId: 'math',
        teacherId: null, // Auto-assign needed
        groupIds: ['group-1'],
      },
      {
        id: 'course-2',
        subjectId: 'english',
        teacherId: null,
        groupIds: ['group-2'],
      },
    ];

    const teachers = [
      {
        id: 'teacher-1',
        name: 'Math Teacher',
        subjectIds: ['math'],
        workingHours: { start: '08:15', end: '16:00' },
      },
      {
        id: 'teacher-2',
        name: 'English Teacher',
        subjectIds: ['english', 'literature'],
        workingHours: { start: '08:15', end: '16:00' },
      },
    ];

    const assignments = teacherAssignment.assignTeachers(courses, teachers);

    expect(assignments).toBeDefined();
    expect(Array.isArray(assignments)).toBe(true);
    expect(assignments.length).toBe(2);
    
    const mathAssignment = assignments.find(a => a.courseId === 'course-1');
    const englishAssignment = assignments.find(a => a.courseId === 'course-2');
    
    expect(mathAssignment?.teacherId).toBe('teacher-1');
    expect(englishAssignment?.teacherId).toBe('teacher-2');
  });

  it('should handle courses with pre-assigned teachers', () => {
    const courses = [
      {
        id: 'course-1',
        subjectId: 'math',
        teacherId: 'teacher-1', // Already assigned
        groupIds: ['group-1'],
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

    const assignments = teacherAssignment.assignTeachers(courses, teachers);

    expect(assignments.length).toBe(1);
    expect(assignments[0].courseId).toBe('course-1');
    expect(assignments[0].teacherId).toBe('teacher-1');
    expect(assignments[0].wasPreAssigned).toBe(true);
  });

  it('should handle multiple teachers qualified for same subject', () => {
    const courses = [
      {
        id: 'course-1',
        subjectId: 'math',
        teacherId: null,
        groupIds: ['group-1'],
        weeklyHours: 5,
      },
    ];

    const teachers = [
      {
        id: 'teacher-1',
        name: 'Math Teacher 1',
        subjectIds: ['math'],
        workingHours: { start: '08:15', end: '16:00' },
        currentLoad: 10, // Hours per week
      },
      {
        id: 'teacher-2',
        name: 'Math Teacher 2',
        subjectIds: ['math'],
        workingHours: { start: '08:15', end: '16:00' },
        currentLoad: 20, // More loaded
      },
    ];

    const assignments = teacherAssignment.assignTeachers(courses, teachers);

    // Should prefer teacher with lower current load
    expect(assignments[0].teacherId).toBe('teacher-1');
  });

  it('should detect when no qualified teacher is available', () => {
    const courses = [
      {
        id: 'course-1',
        subjectId: 'physics',
        teacherId: null,
        groupIds: ['group-1'],
      },
    ];

    const teachers = [
      {
        id: 'teacher-1',
        name: 'Math Teacher',
        subjectIds: ['math'], // Not qualified for physics
        workingHours: { start: '08:15', end: '16:00' },
      },
    ];

    const assignments = teacherAssignment.assignTeachers(courses, teachers);

    expect(assignments.length).toBe(1);
    expect(assignments[0].teacherId).toBeNull();
    expect(assignments[0].reason).toContain('No qualified teacher');
  });

  it('should consider teacher working hours compatibility', () => {
    const courses = [
      {
        id: 'course-1',
        subjectId: 'math',
        teacherId: null,
        groupIds: ['group-1'],
        preferredTimeSlots: [{ dayOfWeek: 1, startTime: '07:00' }], // Early morning
      },
    ];

    const teachers = [
      {
        id: 'teacher-1',
        name: 'Early Teacher',
        subjectIds: ['math'],
        workingHours: { start: '07:00', end: '15:00' },
      },
      {
        id: 'teacher-2',
        name: 'Late Teacher',
        subjectIds: ['math'],
        workingHours: { start: '10:00', end: '18:00' }, // Can't do early morning
      },
    ];

    const assignments = teacherAssignment.assignTeachers(courses, teachers);

    expect(assignments[0].teacherId).toBe('teacher-1');
  });

  it('should balance workload across teachers', () => {
    const courses = [
      { id: 'course-1', subjectId: 'math', teacherId: null, weeklyHours: 3 },
      { id: 'course-2', subjectId: 'math', teacherId: null, weeklyHours: 3 },
      { id: 'course-3', subjectId: 'math', teacherId: null, weeklyHours: 3 },
    ];

    const teachers = [
      {
        id: 'teacher-1',
        subjectIds: ['math'],
        currentLoad: 0,
        maxLoad: 20,
      },
      {
        id: 'teacher-2',
        subjectIds: ['math'],
        currentLoad: 0,
        maxLoad: 20,
      },
    ];

    const assignments = teacherAssignment.assignTeachers(courses, teachers);

    // Should distribute courses between teachers
    const teacher1Courses = assignments.filter(a => a.teacherId === 'teacher-1').length;
    const teacher2Courses = assignments.filter(a => a.teacherId === 'teacher-2').length;
    
    expect(Math.abs(teacher1Courses - teacher2Courses)).toBeLessThanOrEqual(1);
  });

  it('should validate teacher assignment against constraints', () => {
    const assignment = {
      courseId: 'course-1',
      teacherId: 'teacher-1',
    };

    const course = {
      id: 'course-1',
      subjectId: 'math',
      weeklyHours: 5,
    };

    const teacher = {
      id: 'teacher-1',
      subjectIds: ['math', 'physics'],
      workingHours: { start: '08:15', end: '16:00' },
      currentLoad: 15,
      maxLoad: 20,
    };

    const validation = teacherAssignment.validateAssignment(assignment, course, teacher);

    expect(validation.isValid).toBe(true);
    expect(validation.reasons).toContain('Qualified for subject');
    expect(validation.reasons).toContain('Within load capacity');
  });
});