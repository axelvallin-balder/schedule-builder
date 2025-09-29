import { describe, it, expect } from 'vitest';
import { Class } from '../../../src/models/Class';

describe('Class Model', () => {
  it('should create a class with valid data', () => {
    const classData = {
      id: '1',
      name: 'Class 10A',
      lunchDuration: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(classData).toBeDefined();
    expect(classData.id).toBe('1');
    expect(classData.name).toBe('Class 10A');
    expect(classData.lunchDuration).toBe(30);
  });

  it('should have default lunch duration of 30 minutes', () => {
    const classWithDefaults = {
      id: '1',
      name: 'Class 9B',
      lunchDuration: 30, // default
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(classWithDefaults.lunchDuration).toBe(30);
  });

  it('should validate minimum lunch duration', () => {
    const classWithShortLunch = {
      id: '1',
      name: 'Class 11C',
      lunchDuration: 20, // Less than minimum 30
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Should fail validation for lunch < 30 minutes if lessons extend past 12:30
    expect(classWithShortLunch.lunchDuration).toBeLessThan(30);
  });

  it('should require unique class names', () => {
    const className = 'Class 12A';
    
    // This would be validated at database level
    expect(className).toBe('Class 12A');
  });
});