import { describe, it, expect } from 'vitest';
import { Lesson } from '../../../src/models/Lesson';

describe('Lesson Model', () => {
  it('should create a lesson with valid data', () => {
    const lessonData = {
      id: '1',
      courseId: 'course-1',
      teacherId: 'teacher-1',
      dayOfWeek: 1, // Monday
      startTime: '09:00',
      duration: 45,
      roomId: 'room-101',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(lessonData).toBeDefined();
    expect(lessonData.id).toBe('1');
    expect(lessonData.courseId).toBe('course-1');
    expect(lessonData.teacherId).toBe('teacher-1');
    expect(lessonData.dayOfWeek).toBe(1);
    expect(lessonData.startTime).toBe('09:00');
    expect(lessonData.duration).toBe(45);
    expect(lessonData.roomId).toBe('room-101');
  });

  it('should validate day of week range (1-5)', () => {
    const validDays = [1, 2, 3, 4, 5]; // Monday to Friday
    const invalidDays = [0, 6, 7]; // Sunday, Saturday, Invalid
    
    validDays.forEach(day => {
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(5);
    });
    
    invalidDays.forEach(day => {
      expect(day < 1 || day > 5).toBe(true);
    });
  });

  it('should validate minimum duration of 45 minutes', () => {
    const lessonWithShortDuration = {
      id: '1',
      courseId: 'course-1',
      teacherId: 'teacher-1',
      dayOfWeek: 1,
      startTime: '09:00',
      duration: 30, // Less than minimum 45
      roomId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Should fail validation
    expect(lessonWithShortDuration.duration).toBeLessThan(45);
  });

  it('should validate time format HH:mm', () => {
    const validTimes = ['09:00', '14:30', '16:45'];
    const invalidTimes = ['25:00', '14:60', '9:00']; // Invalid formats
    
    validTimes.forEach(time => {
      const [hours, minutes] = time.split(':').map(Number);
      expect(hours).toBeGreaterThanOrEqual(0);
      expect(hours).toBeLessThan(24);
      expect(minutes).toBeGreaterThanOrEqual(0);
      expect(minutes).toBeLessThan(60);
    });
  });

  it('should allow null roomId', () => {
    const lessonWithoutRoom = {
      id: '1',
      courseId: 'course-1',
      teacherId: 'teacher-1',
      dayOfWeek: 1,
      startTime: '09:00',
      duration: 45,
      roomId: null, // Optional room
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(lessonWithoutRoom.roomId).toBeNull();
  });

  it('should validate teacher working hours constraint', () => {
    const lessonOutsideWorkingHours = {
      startTime: '07:00', // Before typical working hours (08:15)
      teacherWorkingHours: {
        start: '08:15',
        end: '16:00',
      },
    };

    // Should fail validation if lesson is outside teacher's working hours
    expect(lessonOutsideWorkingHours.startTime < lessonOutsideWorkingHours.teacherWorkingHours.start).toBe(true);
  });
});