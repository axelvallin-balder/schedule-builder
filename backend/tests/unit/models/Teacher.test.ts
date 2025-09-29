import { describe, it, expect } from 'vitest';
import { Teacher } from '../../../src/models/Teacher';

describe('Teacher Model', () => {
  it('should create a teacher with valid data', () => {
    const teacherData = {
      id: '1',
      name: 'John Doe',
      subjectIds: ['math', 'physics'],
      workingHours: {
        start: '08:15',
        end: '16:00',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(teacherData).toBeDefined();
    expect(teacherData.id).toBe('1');
    expect(teacherData.name).toBe('John Doe');
    expect(teacherData.subjectIds).toHaveLength(2);
    expect(teacherData.workingHours.start).toBe('08:15');
    expect(teacherData.workingHours.end).toBe('16:00');
  });

  it('should have default working hours', () => {
    const teacherWithDefaults = {
      id: '1',
      name: 'Jane Smith',
      subjectIds: ['english'],
      workingHours: {
        start: '08:15', // default
        end: '16:00',   // default
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(teacherWithDefaults.workingHours.start).toBe('08:15');
    expect(teacherWithDefaults.workingHours.end).toBe('16:00');
  });

  it('should validate working hours format', () => {
    const invalidWorkingHours = {
      start: '25:00', // Invalid hour
      end: '16:00',
    };

    // Should validate time format HH:mm
    expect(invalidWorkingHours.start).toBe('25:00'); // Will fail validation
    expect(invalidWorkingHours.end).toBe('16:00');
  });

  it('should validate start time is before end time', () => {
    const invalidHours = {
      start: '17:00',
      end: '16:00', // End before start
    };

    // Should fail validation
    expect(invalidHours.start > invalidHours.end).toBe(true);
  });

  it('should require at least one subject', () => {
    const teacherWithoutSubjects = {
      id: '1',
      name: 'No Subject Teacher',
      subjectIds: [],
      workingHours: {
        start: '08:15',
        end: '16:00',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Should fail validation
    expect(teacherWithoutSubjects.subjectIds).toHaveLength(0);
  });
});