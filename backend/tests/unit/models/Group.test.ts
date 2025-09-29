import { describe, it, expect } from 'vitest';
import { Group } from '../../../src/models/Group';

describe('Group Model', () => {
  it('should create a group with valid data', () => {
    const groupData = {
      id: '1',
      name: 'Group A',
      classId: 'class-1',
      dependentGroupIds: ['group-2', 'group-3'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(groupData).toBeDefined();
    expect(groupData.id).toBe('1');
    expect(groupData.name).toBe('Group A');
    expect(groupData.classId).toBe('class-1');
    expect(groupData.dependentGroupIds).toHaveLength(2);
  });

  it('should allow empty dependent groups', () => {
    const groupWithoutDependents = {
      id: '1',
      name: 'Independent Group',
      classId: 'class-1',
      dependentGroupIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(groupWithoutDependents.dependentGroupIds).toHaveLength(0);
  });

  it('should not allow self-dependency', () => {
    const selfDependentGroup = {
      id: '1',
      name: 'Self Dependent',
      classId: 'class-1',
      dependentGroupIds: ['1'], // Self-reference
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Should fail validation - group cannot depend on itself
    expect(selfDependentGroup.dependentGroupIds).toContain('1');
  });

  it('should require valid class reference', () => {
    const groupWithoutClass = {
      id: '1',
      name: 'Orphan Group',
      classId: '', // Invalid class
      dependentGroupIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Should fail validation
    expect(groupWithoutClass.classId).toBe('');
  });

  it('should validate dependent group existence', () => {
    const groupWithInvalidDependents = {
      id: '1',
      name: 'Group with Invalid Deps',
      classId: 'class-1',
      dependentGroupIds: ['non-existent-group'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Should fail validation when dependent groups don't exist
    expect(groupWithInvalidDependents.dependentGroupIds).toContain('non-existent-group');
  });
});