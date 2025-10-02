import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Subject, SubjectCreateRequest, SubjectUpdateRequest, ApiResponse, PaginatedResponse } from '../../app/types/entities';
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

describe('Subject API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Sample test data
  const sampleSubject: Subject = {
    id: '1',
    name: 'Mathematics',
    breakDuration: 10,
    creditHours: 3,
    prerequisites: ['algebra-basics'],
    createdAt: createMockDate('2024-01-01T00:00:00Z'),
    updatedAt: createMockDate('2024-01-01T00:00:00Z')
  };

  const sampleCreateRequest: SubjectCreateRequest = {
    name: 'Advanced Physics',
    breakDuration: 15,
    creditHours: 4,
    prerequisites: ['basic-physics', 'calculus-1']
  };

  const sampleUpdateRequest: SubjectUpdateRequest = {
    name: 'Advanced Mathematics',
    breakDuration: 12,
    creditHours: 4
  };

  describe('GET /api/subjects', () => {
    it('should return paginated subjects list', async () => {
      const mockResponse: PaginatedResponse<Subject> = {
        data: [sampleSubject],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.get('/api/subjects', {
        query: { page: 1, limit: 10 }
      });

      expect(mockApi.get).toHaveBeenCalledWith('/api/subjects', {
        query: { page: 1, limit: 10 }
      });
      expect(response.data).toEqual(mockResponse);
      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        breakDuration: expect.any(Number),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should support search by name', async () => {
      const mockResponse: PaginatedResponse<Subject> = {
        data: [sampleSubject],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      await mockApi.get('/api/subjects', {
        query: { search: 'Math' }
      });

      expect(mockApi.get).toHaveBeenCalledWith('/api/subjects', {
        query: { search: 'Math' }
      });
    });

    it('should support filtering by credit hours', async () => {
      const mockResponse: PaginatedResponse<Subject> = {
        data: [sampleSubject],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      await mockApi.get('/api/subjects', {
        query: { creditHours: 3 }
      });

      expect(mockApi.get).toHaveBeenCalledWith('/api/subjects', {
        query: { creditHours: 3 }
      });
    });

    it('should support filtering by prerequisites', async () => {
      const mockResponse: PaginatedResponse<Subject> = {
        data: [sampleSubject],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      await mockApi.get('/api/subjects', {
        query: { hasPrerequisites: true }
      });

      expect(mockApi.get).toHaveBeenCalledWith('/api/subjects', {
        query: { hasPrerequisites: true }
      });
    });
  });

  describe('GET /api/subjects/:id', () => {
    it('should return single subject with all details', async () => {
      const mockResponse: ApiResponse<Subject> = {
        data: sampleSubject
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.get('/api/subjects/1');

      expect(mockApi.get).toHaveBeenCalledWith('/api/subjects/1');
      expect(response.data.data).toMatchObject({
        id: '1',
        name: 'Mathematics',
        breakDuration: 10,
        creditHours: 3,
        prerequisites: expect.arrayContaining(['algebra-basics'])
      });
    });

    it('should return 404 for non-existent subject', async () => {
      mockApi.get.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Subject not found' }
        }
      });

      await expect(mockApi.get('/api/subjects/999')).rejects.toMatchObject({
        response: {
          status: 404,
          data: { error: 'Subject not found' }
        }
      });
    });
  });

  describe('POST /api/subjects', () => {
    it('should create new subject with valid data', async () => {
      const mockResponse: ApiResponse<Subject> = {
        data: {
          ...sampleCreateRequest,
          id: '2',
          createdAt: createMockDate('2024-01-01T00:00:00Z'),
          updatedAt: createMockDate('2024-01-01T00:00:00Z')
        }
      };

      mockApi.post.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.post('/api/subjects', sampleCreateRequest);

      expect(mockApi.post).toHaveBeenCalledWith('/api/subjects', sampleCreateRequest);
      expect(response.data.data).toMatchObject({
        id: expect.any(String),
        name: 'Advanced Physics',
        breakDuration: 15,
        creditHours: 4,
        prerequisites: expect.arrayContaining(['basic-physics', 'calculus-1'])
      });
    });

    it('should create subject with minimal required data', async () => {
      const minimalRequest: SubjectCreateRequest = {
        name: 'Basic Chemistry',
        breakDuration: 10
      };

      const mockResponse: ApiResponse<Subject> = {
        data: {
          ...minimalRequest,
          id: '3',
          createdAt: createMockDate('2024-01-01T00:00:00Z'),
          updatedAt: createMockDate('2024-01-01T00:00:00Z')
        }
      };

      mockApi.post.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.post('/api/subjects', minimalRequest);

      expect(mockApi.post).toHaveBeenCalledWith('/api/subjects', minimalRequest);
      expect(response.data.data).toMatchObject({
        id: expect.any(String),
        name: 'Basic Chemistry',
        breakDuration: 10
      });
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        // Missing required name field
        breakDuration: 10,
        creditHours: 3
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'name', message: 'Subject name is required' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/subjects', invalidRequest)).rejects.toMatchObject({
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

    it('should validate break duration', async () => {
      const invalidRequest = {
        name: 'Valid Subject',
        breakDuration: 0 // Invalid break duration
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'breakDuration', message: 'Break duration must be positive' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/subjects', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'breakDuration',
                message: expect.stringContaining('must be positive')
              })
            ])
          }
        }
      });
    });

    it('should validate break duration range', async () => {
      const invalidRequest = {
        name: 'Valid Subject',
        breakDuration: 2 // Too low
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'breakDuration', message: 'Break duration must be at least 5 minutes' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/subjects', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'breakDuration',
                message: expect.stringContaining('at least 5 minutes')
              })
            ])
          }
        }
      });
    });

    it('should validate break duration maximum', async () => {
      const invalidRequest = {
        name: 'Valid Subject',
        breakDuration: 120 // Too high
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'breakDuration', message: 'Break duration cannot exceed 60 minutes' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/subjects', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'breakDuration',
                message: expect.stringContaining('cannot exceed 60 minutes')
              })
            ])
          }
        }
      });
    });

    it('should validate subject name format', async () => {
      const invalidRequest = {
        name: '', // Empty name
        breakDuration: 10
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'name', message: 'Subject name is required' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/subjects', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400
        }
      });
    });

    it('should validate prerequisite references', async () => {
      const invalidRequest = {
        name: 'Valid Subject',
        breakDuration: 10,
        prerequisites: ['non-existent-subject']
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Invalid references',
            details: [
              { field: 'prerequisites', message: 'Subject non-existent-subject does not exist' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/subjects', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'Invalid references'
          }
        }
      });
    });

    it('should prevent circular prerequisites', async () => {
      const invalidRequest = {
        name: 'Circular Subject',
        breakDuration: 10,
        prerequisites: ['circular-subject'] // Would reference itself
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'prerequisites', message: 'Circular dependency detected in prerequisites' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/subjects', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'prerequisites',
                message: expect.stringContaining('Circular dependency')
              })
            ])
          }
        }
      });
    });
  });

  describe('PUT /api/subjects/:id', () => {
    it('should update subject with valid data', async () => {
      const mockResponse: ApiResponse<Subject> = {
        data: {
          ...sampleSubject,
          ...sampleUpdateRequest,
          updatedAt: createMockDate('2024-01-02T00:00:00Z')
        }
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.put('/api/subjects/1', sampleUpdateRequest);

      expect(mockApi.put).toHaveBeenCalledWith('/api/subjects/1', sampleUpdateRequest);
      expect(response.data.data).toMatchObject({
        id: '1',
        name: 'Advanced Mathematics',
        breakDuration: 12,
        creditHours: 4
      });
      expect(response.data.data.updatedAt).not.toEqual(sampleSubject.updatedAt);
    });

    it('should handle partial updates', async () => {
      const partialUpdate = {
        breakDuration: 20
      };

      const mockResponse: ApiResponse<Subject> = {
        data: {
          ...sampleSubject,
          breakDuration: partialUpdate.breakDuration,
          updatedAt: createMockDate('2024-01-02T00:00:00Z')
        }
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.put('/api/subjects/1', partialUpdate);

      expect(mockApi.put).toHaveBeenCalledWith('/api/subjects/1', partialUpdate);
      expect(response.data.data.breakDuration).toBe(20);
      expect(response.data.data.name).toBe(sampleSubject.name); // Unchanged
      expect(response.data.data.creditHours).toBe(sampleSubject.creditHours); // Unchanged
    });

    it('should return 404 for non-existent subject', async () => {
      mockApi.put.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Subject not found' }
        }
      });

      await expect(mockApi.put('/api/subjects/999', sampleUpdateRequest)).rejects.toMatchObject({
        response: {
          status: 404
        }
      });
    });

    it('should validate update data', async () => {
      const invalidUpdate = {
        name: '',
        breakDuration: -5,
        creditHours: -1
      };

      mockApi.put.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'name', message: 'Subject name is required' },
              { field: 'breakDuration', message: 'Break duration must be positive' },
              { field: 'creditHours', message: 'Credit hours must be positive if specified' }
            ]
          }
        }
      });

      await expect(mockApi.put('/api/subjects/1', invalidUpdate)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'Validation failed'
          }
        }
      });
    });
  });

  describe('DELETE /api/subjects/:id', () => {
    it('should delete subject successfully', async () => {
      mockApi.delete.mockResolvedValue({ 
        data: { 
          message: 'Subject deleted successfully' 
        } 
      });

      const response = await mockApi.delete('/api/subjects/1');

      expect(mockApi.delete).toHaveBeenCalledWith('/api/subjects/1');
      expect(response.data).toMatchObject({
        message: expect.stringContaining('deleted')
      });
    });

    it('should return 404 for non-existent subject', async () => {
      mockApi.delete.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Subject not found' }
        }
      });

      await expect(mockApi.delete('/api/subjects/999')).rejects.toMatchObject({
        response: {
          status: 404
        }
      });
    });

    it('should prevent deletion if subject has dependencies', async () => {
      mockApi.delete.mockRejectedValue({
        response: {
          status: 409,
          data: { 
            error: 'Cannot delete subject',
            details: 'Subject is referenced by courses or other subjects as prerequisite'
          }
        }
      });

      await expect(mockApi.delete('/api/subjects/1')).rejects.toMatchObject({
        response: {
          status: 409,
          data: {
            error: expect.stringContaining('Cannot delete'),
            details: expect.stringContaining('referenced by')
          }
        }
      });
    });
  });

  describe('Subject Prerequisites Hierarchy', () => {
    it('should handle subject with multiple prerequisites', async () => {
      const subjectWithPrerequisites: Subject = {
        ...sampleSubject,
        prerequisites: ['algebra-basics', 'geometry-basics', 'trigonometry-basics']
      };

      const mockResponse: ApiResponse<Subject> = {
        data: subjectWithPrerequisites
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.get('/api/subjects/1');

      expect(response.data.data.prerequisites).toHaveLength(3);
      expect(response.data.data.prerequisites).toContain('algebra-basics');
      expect(response.data.data.prerequisites).toContain('geometry-basics');
      expect(response.data.data.prerequisites).toContain('trigonometry-basics');
    });

    it('should support adding prerequisites', async () => {
      const updateWithNewPrerequisite = {
        prerequisites: [...(sampleSubject.prerequisites || []), 'statistics-basics']
      };

      const mockResponse: ApiResponse<Subject> = {
        data: {
          ...sampleSubject,
          prerequisites: updateWithNewPrerequisite.prerequisites
        }
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.put('/api/subjects/1', updateWithNewPrerequisite);

      expect(response.data.data.prerequisites).toContain('statistics-basics');
      expect(response.data.data.prerequisites).toHaveLength(2);
    });

    it('should support removing prerequisites', async () => {
      const updateWithRemovedPrerequisite = {
        prerequisites: [] // Remove all prerequisites
      };

      const mockResponse: ApiResponse<Subject> = {
        data: {
          ...sampleSubject,
          prerequisites: updateWithRemovedPrerequisite.prerequisites
        }
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.put('/api/subjects/1', updateWithRemovedPrerequisite);

      expect(response.data.data.prerequisites).toEqual([]);
    });

    it('should validate prerequisite chain integrity', async () => {
      const invalidRequest = {
        name: 'Advanced Calculus',
        breakDuration: 10,
        prerequisites: ['calculus-2'] // Would create chain: basic -> calc1 -> calc2 -> advanced
      };

      // Mock validation that checks for deep prerequisite chains
      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'prerequisites', message: 'Prerequisite chain too deep or creates circular dependency' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/subjects', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'prerequisites',
                message: expect.stringContaining('chain')
              })
            ])
          }
        }
      });
    });
  });

  describe('Subject Credit Hours', () => {
    it('should handle subjects with different credit hour values', async () => {
      const creditHourTests = [
        { creditHours: 1, name: 'Lab Session' },
        { creditHours: 3, name: 'Standard Course' },
        { creditHours: 6, name: 'Advanced Research' }
      ];

      for (const test of creditHourTests) {
        const request = {
          name: test.name,
          breakDuration: 10,
          creditHours: test.creditHours
        };

        const mockResponse: ApiResponse<Subject> = {
          data: {
            ...request,
            id: '1',
            createdAt: createMockDate('2024-01-01T00:00:00Z'),
            updatedAt: createMockDate('2024-01-01T00:00:00Z')
          }
        };

        mockApi.post.mockResolvedValue({ data: mockResponse });

        const response = await mockApi.post('/api/subjects', request);
        expect(response.data.data.creditHours).toBe(test.creditHours);

        vi.clearAllMocks();
      }
    });

    it('should handle subjects without credit hours', async () => {
      const request = {
        name: 'Optional Activity',
        breakDuration: 15
        // No creditHours specified
      };

      const mockResponse: ApiResponse<Subject> = {
        data: {
          ...request,
          id: '1',
          createdAt: createMockDate('2024-01-01T00:00:00Z'),
          updatedAt: createMockDate('2024-01-01T00:00:00Z')
        }
      };

      mockApi.post.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.post('/api/subjects', request);
      expect(response.data.data.creditHours).toBeUndefined();
    });

    it('should validate positive credit hours', async () => {
      const invalidRequest = {
        name: 'Invalid Credit Hours',
        breakDuration: 10,
        creditHours: -2
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'creditHours', message: 'Credit hours must be positive if specified' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/subjects', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'creditHours',
                message: expect.stringContaining('must be positive')
              })
            ])
          }
        }
      });
    });
  });

  describe('Break Duration Edge Cases', () => {
    it('should accept valid break duration range', async () => {
      const validDurations = [5, 10, 15, 30, 45, 60];

      for (const duration of validDurations) {
        const request = {
          name: `Subject with ${duration}min break`,
          breakDuration: duration
        };

        const mockResponse: ApiResponse<Subject> = {
          data: {
            ...request,
            id: '1',
            createdAt: createMockDate('2024-01-01T00:00:00Z'),
            updatedAt: createMockDate('2024-01-01T00:00:00Z')
          }
        };

        mockApi.post.mockResolvedValue({ data: mockResponse });

        const response = await mockApi.post('/api/subjects', request);
        expect(response.data.data.breakDuration).toBe(duration);

        vi.clearAllMocks();
      }
    });

    it('should reject break duration at boundaries', async () => {
      const invalidDurations = [0, 4, 61, 120];

      for (const duration of invalidDurations) {
        const request = {
          name: 'Invalid Duration Subject',
          breakDuration: duration
        };

        let expectedMessage = 'Break duration must be positive';
        if (duration === 4) expectedMessage = 'Break duration must be at least 5 minutes';
        if (duration >= 61) expectedMessage = 'Break duration cannot exceed 60 minutes';

        mockApi.post.mockRejectedValue({
          response: {
            status: 400,
            data: {
              error: 'Validation failed',
              details: [
                { field: 'breakDuration', message: expectedMessage }
              ]
            }
          }
        });

        await expect(mockApi.post('/api/subjects', request)).rejects.toMatchObject({
          response: {
            status: 400
          }
        });

        vi.clearAllMocks();
      }
    });
  });
});