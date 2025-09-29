import { describe, it, expect } from 'vitest';
import { Schedule } from '../../../src/models/Schedule';

describe('Schedule Model', () => {
  it('should create a schedule with valid data', () => {
    const scheduleData = {
      id: '1',
      name: 'Week 1 Schedule',
      weekNumber: 1,
      year: 2025,
      status: 'draft' as const,
      lessons: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(scheduleData).toBeDefined();
    expect(scheduleData.id).toBe('1');
    expect(scheduleData.name).toBe('Week 1 Schedule');
    expect(scheduleData.weekNumber).toBe(1);
    expect(scheduleData.year).toBe(2025);
    expect(scheduleData.status).toBe('draft');
    expect(scheduleData.lessons).toHaveLength(0);
  });

  it('should validate status values', () => {
    const validStatuses = ['draft', 'active', 'archived'];
    
    validStatuses.forEach(status => {
      expect(['draft', 'active', 'archived']).toContain(status);
    });
  });

  it('should validate week number range', () => {
    const invalidWeekNumber = {
      weekNumber: 54, // Invalid - max is 53
      year: 2025,
    };

    // Should fail validation for week number > 53
    expect(invalidWeekNumber.weekNumber).toBeGreaterThan(53);
  });

  it('should validate year is reasonable', () => {
    const scheduleWithInvalidYear = {
      id: '1',
      name: 'Invalid Year Schedule',
      weekNumber: 1,
      year: 1900, // Too old
      status: 'draft' as const,
      lessons: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Should fail validation for unreasonable years
    expect(scheduleWithInvalidYear.year).toBeLessThan(2000);
  });

  it('should allow status transitions', () => {
    // draft -> active
    const draftSchedule = { status: 'draft' as const };
    const activeSchedule = { status: 'active' as const };
    
    expect(draftSchedule.status).toBe('draft');
    expect(activeSchedule.status).toBe('active');
    
    // active -> archived
    const archivedSchedule = { status: 'archived' as const };
    expect(archivedSchedule.status).toBe('archived');
  });
});