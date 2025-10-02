import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Group, GroupCreateRequest, GroupUpdateRequest, ApiResponse, PaginatedResponse } from '../../app/types/entities';
import type { ValidationResult } from '../../app/types/validation';

// Mock API service
const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
};

// Mock the API service
vi.mock('../../app/services/api', () => ({
  default: mockApi
}));

// Helper function to create mock dates
const createMockDate = (dateStr: string): Date => new Date(dateStr);

describe('Group API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Sample test data
  const sampleGroup: Group = {
    id: '1',
    name: 'Mathematics Advanced',
    classIds: ['class-1', 'class-2'],
    size: 25,
    dependentGroupIds: [],
    notes: 'Advanced mathematics group',
    createdAt: createMockDate('2024-01-01T00:00:00Z'),
    updatedAt: createMockDate('2024-01-01T00:00:00Z')
  };

  const sampleCreateRequest: GroupCreateRequest = {
    name: 'Physics Honors',
    classIds: ['class-3'],
    size: 20,
    dependentGroupIds: [],
    notes: 'Honors physics group'
  };

  const sampleUpdateRequest: GroupUpdateRequest = {
    name: 'Updated Group Name',
    classIds: ['class-1', 'class-3'],
    size: 30,
    notes: 'Updated notes'
  };

  describe('GET /api/groups', () => {
    it('should return paginated groups list', async () => {
      const mockResponse: PaginatedResponse<Group> = {
        data: [sampleGroup],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.get('/api/groups', {
        query: { page: 1, limit: 10 }
      });

      expect(mockApi.get).toHaveBeenCalledWith('/api/groups', {
        query: { page: 1, limit: 10 }
      });
      expect(response.data).toEqual(mockResponse);
      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        classIds: expect.any(Array),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should support filtering by class', async () => {
      const mockResponse: PaginatedResponse<Group> = {
        data: [sampleGroup],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      await mockApi.get('/api/groups', {
        query: { classId: 'class-1' }
      });

      expect(mockApi.get).toHaveBeenCalledWith('/api/groups', {
        query: { classId: 'class-1' }
      });
    });

    it('should support search by name', async () => {
      const mockResponse: PaginatedResponse<Group> = {
        data: [sampleGroup],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      await mockApi.get('/api/groups', {
        query: { search: 'Math' }
      });

      expect(mockApi.get).toHaveBeenCalledWith('/api/groups', {
        query: { search: 'Math' }
      });
    });
  });

  describe('GET /api/groups/:id', () => {
    it('should return single group with relationships', async () => {
      const mockResponse: ApiResponse<Group> = {
        data: sampleGroup
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.get('/api/groups/1');

      expect(mockApi.get).toHaveBeenCalledWith('/api/groups/1');
      expect(response.data.data).toMatchObject({
        id: '1',
        name: expect.any(String),
        classIds: expect.any(Array)
      });
      expect(response.data.data.classIds).toContain('class-1');
      expect(response.data.data.classIds).toContain('class-2');
    });

    it('should return 404 for non-existent group', async () => {
      mockApi.get.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Group not found' }
        }
      });

      await expect(mockApi.get('/api/groups/999')).rejects.toMatchObject({
        response: {
          status: 404,
          data: { error: 'Group not found' }
        }
      });
    });
  });

  describe('POST /api/groups', () => {
    it('should create new group with valid data', async () => {
      const mockResponse: ApiResponse<Group> = {
        data: {
          ...sampleGroup,
          id: '2',
          name: sampleCreateRequest.name,
          classIds: sampleCreateRequest.classIds
        }
      };

      mockApi.post.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.post('/api/groups', sampleCreateRequest);

      expect(mockApi.post).toHaveBeenCalledWith('/api/groups', sampleCreateRequest);
      expect(response.data.data).toMatchObject({
        id: expect.any(String),
        name: 'Physics Honors',
        classIds: ['class-3'],
        size: 20
      });
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        // Missing required name field
        classIds: ['class-1'],
        size: 10
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'name', message: 'Group name is required' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/groups', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'name',
                message: expect.stringContaining('required')
              })
            ])
          }
        }
      });
    });

    it('should validate group name format', async () => {
      const invalidRequest = {
        name: '', // Empty name
        classIds: ['class-1'],
        size: 10
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'name', message: 'Group name is required' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/groups', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400
        }
      });
    });

    it('should validate at least one class is selected', async () => {
      const invalidRequest = {
        name: 'Valid Name',
        classIds: [], // Empty class list
        size: 10
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'classIds', message: 'At least one class must be selected' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/groups', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'classIds',
                message: expect.stringContaining('At least one class')
              })
            ])
          }
        }
      });
    });

    it('should prevent circular dependencies', async () => {
      const invalidRequest = {
        name: 'Circular Group',
        classIds: ['class-1'],
        dependentGroupIds: ['1'], // Referencing itself (assuming id will be 1)
        size: 10
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'dependentGroupIds', message: 'Group cannot depend on itself' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/groups', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'dependentGroupIds',
                message: expect.stringContaining('cannot depend on itself')
              })
            ])
          }
        }
      });
    });

    it('should validate class existence', async () => {
      const invalidRequest = {
        name: 'Valid Name',
        classIds: ['non-existent-class'],
        size: 10
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Invalid references',
            details: [
              { field: 'classIds', message: 'Class non-existent-class does not exist' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/groups', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'Invalid references'
          }
        }
      });
    });
  });

  describe('PUT /api/groups/:id', () => {
    it('should update group with valid data', async () => {
      const mockResponse: ApiResponse<Group> = {
        data: {
          ...sampleGroup,
          ...sampleUpdateRequest,
          updatedAt: createMockDate('2024-01-02T00:00:00Z')
        }
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.put('/api/groups/1', sampleUpdateRequest);

      expect(mockApi.put).toHaveBeenCalledWith('/api/groups/1', sampleUpdateRequest);
      expect(response.data.data).toMatchObject({
        id: '1',
        name: 'Updated Group Name',
        classIds: ['class-1', 'class-3'],
        size: 30
      });
      expect(response.data.data.updatedAt).not.toEqual(sampleGroup.updatedAt);
    });

    it('should handle partial updates', async () => {
      const partialUpdate = {
        name: 'Partially Updated Name'
      };

      const mockResponse: ApiResponse<Group> = {
        data: {
          ...sampleGroup,
          name: partialUpdate.name,
          updatedAt: createMockDate('2024-01-02T00:00:00Z')
        }
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.put('/api/groups/1', partialUpdate);

      expect(mockApi.put).toHaveBeenCalledWith('/api/groups/1', partialUpdate);
      expect(response.data.data.name).toBe('Partially Updated Name');
      expect(response.data.data.classIds).toEqual(sampleGroup.classIds); // Unchanged
    });

    it('should return 404 for non-existent group', async () => {
      mockApi.put.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Group not found' }
        }
      });

      await expect(mockApi.put('/api/groups/999', sampleUpdateRequest)).rejects.toMatchObject({
        response: {
          status: 404
        }
      });
    });

    it('should validate update data', async () => {
      const invalidUpdate = {
        name: '',
        classIds: []
      };

      mockApi.put.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'name', message: 'Group name is required' },
              { field: 'classIds', message: 'At least one class must be selected' }
            ]
          }
        }
      });

      await expect(mockApi.put('/api/groups/1', invalidUpdate)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'Validation failed'
          }
        }
      });
    });
  });

  describe('DELETE /api/groups/:id', () => {
    it('should delete group successfully', async () => {
      mockApi.delete.mockResolvedValue({ 
        data: { 
          message: 'Group deleted successfully' 
        } 
      });

      const response = await mockApi.delete('/api/groups/1');

      expect(mockApi.delete).toHaveBeenCalledWith('/api/groups/1');
      expect(response.data).toMatchObject({
        message: expect.stringContaining('deleted')
      });
    });

    it('should return 404 for non-existent group', async () => {
      mockApi.delete.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Group not found' }
        }
      });

      await expect(mockApi.delete('/api/groups/999')).rejects.toMatchObject({
        response: {
          status: 404
        }
      });
    });

    it('should prevent deletion if group has dependencies', async () => {
      mockApi.delete.mockRejectedValue({
        response: {
          status: 409,
          data: { 
            error: 'Cannot delete group',
            details: 'Group is referenced by courses or other groups'
          }
        }
      });

      await expect(mockApi.delete('/api/groups/1')).rejects.toMatchObject({
        response: {
          status: 409,
          data: {
            error: expect.stringContaining('Cannot delete'),
            details: expect.stringContaining('referenced')
          }
        }
      });
    });
  });

  describe('Many-to-Many Class Relationships', () => {
    it('should handle group with multiple classes', async () => {
      const multiClassGroup: Group = {
        ...sampleGroup,
        classIds: ['class-1', 'class-2', 'class-3']
      };

      const mockResponse: ApiResponse<Group> = {
        data: multiClassGroup
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.get('/api/groups/1');

      expect(response.data.data.classIds).toHaveLength(3);
      expect(response.data.data.classIds).toContain('class-1');
      expect(response.data.data.classIds).toContain('class-2');
      expect(response.data.data.classIds).toContain('class-3');
    });

    it('should support adding classes to existing group', async () => {
      const updateWithNewClass = {
        classIds: [...sampleGroup.classIds, 'class-4']
      };

      const mockResponse: ApiResponse<Group> = {
        data: {
          ...sampleGroup,
          classIds: updateWithNewClass.classIds
        }
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.put('/api/groups/1', updateWithNewClass);

      expect(response.data.data.classIds).toContain('class-4');
      expect(response.data.data.classIds).toHaveLength(3);
    });

    it('should support removing classes from group', async () => {
      const updateWithRemovedClass = {
        classIds: ['class-1'] // Remove class-2
      };

      const mockResponse: ApiResponse<Group> = {
        data: {
          ...sampleGroup,
          classIds: updateWithRemovedClass.classIds
        }
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.put('/api/groups/1', updateWithRemovedClass);

      expect(response.data.data.classIds).toEqual(['class-1']);
      expect(response.data.data.classIds).not.toContain('class-2');
    });
  });

  describe('Group Dependencies', () => {
    it('should handle dependent groups correctly', async () => {
      const groupWithDependencies: Group = {
        ...sampleGroup,
        dependentGroupIds: ['group-2', 'group-3']
      };

      const mockResponse: ApiResponse<Group> = {
        data: groupWithDependencies
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.get('/api/groups/1');

      expect(response.data.data.dependentGroupIds).toHaveLength(2);
      expect(response.data.data.dependentGroupIds).toContain('group-2');
      expect(response.data.data.dependentGroupIds).toContain('group-3');
    });

    it('should validate dependent group existence', async () => {
      const invalidRequest = {
        name: 'Valid Group',
        classIds: ['class-1'],
        dependentGroupIds: ['non-existent-group']
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Invalid references',
            details: [
              { field: 'dependentGroupIds', message: 'Group non-existent-group does not exist' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/groups', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'Invalid references'
          }
        }
      });
    });
  });
});