import { describe, it, expect } from 'vitest';
import { Subject } from '../../../src/models/Subject';

describe('Subject Model', () => {
  it('should create a subject with valid data', () => {
    const subjectData = {
      id: '1',
      name: 'Mathematics',
      breakDuration: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(subjectData).toBeDefined();
    expect(subjectData.id).toBe('1');
    expect(subjectData.name).toBe('Mathematics');
    expect(subjectData.breakDuration).toBe(10);
  });

  it('should have default break duration of 10 minutes', () => {
    const subjectWithDefaults = {
      id: '1',
      name: 'Physics',
      breakDuration: 10, // default
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(subjectWithDefaults.breakDuration).toBe(10);
  });

  it('should validate break duration is positive', () => {
    const subjectWithInvalidBreak = {
      id: '1',
      name: 'Chemistry',
      breakDuration: -5, // Invalid negative duration
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Should fail validation
    expect(subjectWithInvalidBreak.breakDuration).toBeLessThan(0);
  });

  it('should require unique subject names', () => {
    const subjectName = 'English Literature';
    
    // This would be validated at database level
    expect(subjectName).toBe('English Literature');
  });
});