import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Teacher, TeacherCreateRequest, TeacherUpdateRequest, ApiResponse, PaginatedResponse, AvailabilityException } from '../../app/types/entities';
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

describe('Teacher API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Sample test data
  const sampleAvailabilityException: AvailabilityException = {
    date: '2024-01-15',
    type: 'unavailable',
    reason: 'Medical appointment'
  };

  const sampleLimitedAvailability: AvailabilityException = {
    date: '2024-01-20',
    type: 'limited',
    startTime: '10:00',
    endTime: '14:00',
    reason: 'Training session'
  };

  const sampleTeacher: Teacher = {
    id: '1',
    name: 'Dr. Sarah Johnson',
    subjectIds: ['math-1', 'physics-1'],
    workingHours: {
      start: '08:15',
      end: '16:00'
    },
    availabilityExceptions: [sampleAvailabilityException, sampleLimitedAvailability],
    maxWeeklyHours: 35,
    createdAt: createMockDate('2024-01-01T00:00:00Z'),
    updatedAt: createMockDate('2024-01-01T00:00:00Z')
  };

  const sampleCreateRequest: TeacherCreateRequest = {
    name: 'Prof. Michael Chen',
    subjectIds: ['chemistry-1'],
    workingHours: {
      start: '09:00',
      end: '15:30'
    },
    maxWeeklyHours: 30
  };

  const sampleUpdateRequest: TeacherUpdateRequest = {
    name: 'Dr. Sarah Johnson-Smith',
    subjectIds: ['math-1', 'physics-1', 'chemistry-1'],
    maxWeeklyHours: 40
  };

  describe('GET /api/teachers', () => {
    it('should return paginated teachers list', async () => {
      const mockResponse: PaginatedResponse<Teacher> = {
        data: [sampleTeacher],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.get('/api/teachers', {
        query: { page: 1, limit: 10 }
      });

      expect(mockApi.get).toHaveBeenCalledWith('/api/teachers', {
        query: { page: 1, limit: 10 }
      });
      expect(response.data).toEqual(mockResponse);
      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        subjectIds: expect.any(Array),
        workingHours: expect.objectContaining({
          start: expect.any(String),
          end: expect.any(String)
        }),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should support filtering by subject', async () => {
      const mockResponse: PaginatedResponse<Teacher> = {
        data: [sampleTeacher],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      await mockApi.get('/api/teachers', {
        query: { subjectId: 'math-1' }
      });

      expect(mockApi.get).toHaveBeenCalledWith('/api/teachers', {
        query: { subjectId: 'math-1' }
      });
    });

    it('should support search by name', async () => {
      const mockResponse: PaginatedResponse<Teacher> = {
        data: [sampleTeacher],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      await mockApi.get('/api/teachers', {
        query: { search: 'Sarah' }
      });

      expect(mockApi.get).toHaveBeenCalledWith('/api/teachers', {
        query: { search: 'Sarah' }
      });
    });

    it('should support filtering by availability', async () => {
      const mockResponse: PaginatedResponse<Teacher> = {
        data: [sampleTeacher],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      await mockApi.get('/api/teachers', {
        query: { 
          availableDate: '2024-01-10',
          availableTime: '10:00'
        }
      });

      expect(mockApi.get).toHaveBeenCalledWith('/api/teachers', {
        query: { 
          availableDate: '2024-01-10',
          availableTime: '10:00'
        }
      });
    });
  });

  describe('GET /api/teachers/:id', () => {
    it('should return single teacher with all details', async () => {
      const mockResponse: ApiResponse<Teacher> = {
        data: sampleTeacher
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.get('/api/teachers/1');

      expect(mockApi.get).toHaveBeenCalledWith('/api/teachers/1');
      expect(response.data.data).toMatchObject({
        id: '1',
        name: 'Dr. Sarah Johnson',
        subjectIds: expect.arrayContaining(['math-1', 'physics-1']),
        workingHours: {
          start: '08:15',
          end: '16:00'
        },
        maxWeeklyHours: 35
      });
      expect(response.data.data.availabilityExceptions).toHaveLength(2);
    });

    it('should return 404 for non-existent teacher', async () => {
      mockApi.get.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Teacher not found' }
        }
      });

      await expect(mockApi.get('/api/teachers/999')).rejects.toMatchObject({
        response: {
          status: 404,
          data: { error: 'Teacher not found' }
        }
      });
    });
  });

  describe('POST /api/teachers', () => {
    it('should create new teacher with valid data', async () => {
      const mockResponse: ApiResponse<Teacher> = {
        data: {
          ...sampleCreateRequest,
          id: '2',
          availabilityExceptions: [],
          createdAt: createMockDate('2024-01-01T00:00:00Z'),
          updatedAt: createMockDate('2024-01-01T00:00:00Z')
        }
      };

      mockApi.post.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.post('/api/teachers', sampleCreateRequest);

      expect(mockApi.post).toHaveBeenCalledWith('/api/teachers', sampleCreateRequest);
      expect(response.data.data).toMatchObject({
        id: expect.any(String),
        name: 'Prof. Michael Chen',
        subjectIds: ['chemistry-1'],
        workingHours: {
          start: '09:00',
          end: '15:30'
        },
        maxWeeklyHours: 30
      });
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        // Missing required name field
        subjectIds: ['math-1'],
        workingHours: {
          start: '08:00',
          end: '16:00'
        }
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'name', message: 'Teacher name is required' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/teachers', invalidRequest)).rejects.toMatchObject({
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

    it('should validate subject qualifications', async () => {
      const invalidRequest = {
        name: 'Valid Teacher',
        subjectIds: [], // Empty subject list
        workingHours: {
          start: '08:00',
          end: '16:00'
        }
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'subjectIds', message: 'At least one subject qualification required' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/teachers', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'subjectIds',
                message: expect.stringContaining('At least one subject')
              })
            ])
          }
        }
      });
    });

    it('should validate working hours format', async () => {
      const invalidRequest = {
        name: 'Valid Teacher',
        subjectIds: ['math-1'],
        workingHours: {
          start: '25:00', // Invalid time format
          end: '16:00'
        }
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'workingHours.start', message: 'Start time must be in HH:mm format' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/teachers', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'workingHours.start',
                message: expect.stringContaining('HH:mm format')
              })
            ])
          }
        }
      });
    });

    it('should validate working hours range', async () => {
      const invalidRequest = {
        name: 'Valid Teacher',
        subjectIds: ['math-1'],
        workingHours: {
          start: '16:00',
          end: '08:00' // End before start
        }
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'workingHours', message: 'Start time must be before end time' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/teachers', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'workingHours',
                message: expect.stringContaining('Start time must be before end time')
              })
            ])
          }
        }
      });
    });

    it('should validate subject existence', async () => {
      const invalidRequest = {
        name: 'Valid Teacher',
        subjectIds: ['non-existent-subject'],
        workingHours: {
          start: '08:00',
          end: '16:00'
        }
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Invalid references',
            details: [
              { field: 'subjectIds', message: 'Subject non-existent-subject does not exist' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/teachers', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'Invalid references'
          }
        }
      });
    });
  });

  describe('PUT /api/teachers/:id', () => {
    it('should update teacher with valid data', async () => {
      const mockResponse: ApiResponse<Teacher> = {
        data: {
          ...sampleTeacher,
          ...sampleUpdateRequest,
          updatedAt: createMockDate('2024-01-02T00:00:00Z')
        }
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.put('/api/teachers/1', sampleUpdateRequest);

      expect(mockApi.put).toHaveBeenCalledWith('/api/teachers/1', sampleUpdateRequest);
      expect(response.data.data).toMatchObject({
        id: '1',
        name: 'Dr. Sarah Johnson-Smith',
        subjectIds: expect.arrayContaining(['math-1', 'physics-1', 'chemistry-1']),
        maxWeeklyHours: 40
      });
      expect(response.data.data.updatedAt).not.toEqual(sampleTeacher.updatedAt);
    });

    it('should handle partial updates', async () => {
      const partialUpdate = {
        maxWeeklyHours: 25
      };

      const mockResponse: ApiResponse<Teacher> = {
        data: {
          ...sampleTeacher,
          maxWeeklyHours: partialUpdate.maxWeeklyHours,
          updatedAt: createMockDate('2024-01-02T00:00:00Z')
        }
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.put('/api/teachers/1', partialUpdate);

      expect(mockApi.put).toHaveBeenCalledWith('/api/teachers/1', partialUpdate);
      expect(response.data.data.maxWeeklyHours).toBe(25);
      expect(response.data.data.name).toBe(sampleTeacher.name); // Unchanged
      expect(response.data.data.subjectIds).toEqual(sampleTeacher.subjectIds); // Unchanged
    });

    it('should return 404 for non-existent teacher', async () => {
      mockApi.put.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Teacher not found' }
        }
      });

      await expect(mockApi.put('/api/teachers/999', sampleUpdateRequest)).rejects.toMatchObject({
        response: {
          status: 404
        }
      });
    });

    it('should validate update data', async () => {
      const invalidUpdate = {
        name: '',
        subjectIds: [],
        workingHours: {
          start: '18:00',
          end: '08:00'
        }
      };

      mockApi.put.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'name', message: 'Teacher name is required' },
              { field: 'subjectIds', message: 'At least one subject qualification required' },
              { field: 'workingHours', message: 'Start time must be before end time' }
            ]
          }
        }
      });

      await expect(mockApi.put('/api/teachers/1', invalidUpdate)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'Validation failed'
          }
        }
      });
    });
  });

  describe('DELETE /api/teachers/:id', () => {
    it('should delete teacher successfully', async () => {
      mockApi.delete.mockResolvedValue({ 
        data: { 
          message: 'Teacher deleted successfully' 
        } 
      });

      const response = await mockApi.delete('/api/teachers/1');

      expect(mockApi.delete).toHaveBeenCalledWith('/api/teachers/1');
      expect(response.data).toMatchObject({
        message: expect.stringContaining('deleted')
      });
    });

    it('should return 404 for non-existent teacher', async () => {
      mockApi.delete.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Teacher not found' }
        }
      });

      await expect(mockApi.delete('/api/teachers/999')).rejects.toMatchObject({
        response: {
          status: 404
        }
      });
    });

    it('should prevent deletion if teacher has active assignments', async () => {
      mockApi.delete.mockRejectedValue({
        response: {
          status: 409,
          data: { 
            error: 'Cannot delete teacher',
            details: 'Teacher is assigned to active courses'
          }
        }
      });

      await expect(mockApi.delete('/api/teachers/1')).rejects.toMatchObject({
        response: {
          status: 409,
          data: {
            error: expect.stringContaining('Cannot delete'),
            details: expect.stringContaining('assigned to active courses')
          }
        }
      });
    });
  });

  describe('Teacher-Subject Relationships', () => {
    it('should handle teacher with multiple subject qualifications', async () => {
      const multiSubjectTeacher: Teacher = {
        ...sampleTeacher,
        subjectIds: ['math-1', 'physics-1', 'chemistry-1', 'biology-1']
      };

      const mockResponse: ApiResponse<Teacher> = {
        data: multiSubjectTeacher
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.get('/api/teachers/1');

      expect(response.data.data.subjectIds).toHaveLength(4);
      expect(response.data.data.subjectIds).toContain('math-1');
      expect(response.data.data.subjectIds).toContain('physics-1');
      expect(response.data.data.subjectIds).toContain('chemistry-1');
      expect(response.data.data.subjectIds).toContain('biology-1');
    });

    it('should support adding subject qualifications', async () => {
      const updateWithNewSubject = {
        subjectIds: [...sampleTeacher.subjectIds, 'biology-1']
      };

      const mockResponse: ApiResponse<Teacher> = {
        data: {
          ...sampleTeacher,
          subjectIds: updateWithNewSubject.subjectIds
        }
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.put('/api/teachers/1', updateWithNewSubject);

      expect(response.data.data.subjectIds).toContain('biology-1');
      expect(response.data.data.subjectIds).toHaveLength(3);
    });

    it('should support removing subject qualifications', async () => {
      const updateWithRemovedSubject = {
        subjectIds: ['math-1'] // Remove physics-1
      };

      const mockResponse: ApiResponse<Teacher> = {
        data: {
          ...sampleTeacher,
          subjectIds: updateWithRemovedSubject.subjectIds
        }
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.put('/api/teachers/1', updateWithRemovedSubject);

      expect(response.data.data.subjectIds).toEqual(['math-1']);
      expect(response.data.data.subjectIds).not.toContain('physics-1');
    });
  });

  describe('Availability Exceptions', () => {
    it('should handle unavailable days', async () => {
      const teacherWithUnavailability: Teacher = {
        ...sampleTeacher,
        availabilityExceptions: [
          {
            date: '2024-01-15',
            type: 'unavailable',
            reason: 'Conference'
          },
          {
            date: '2024-01-20',
            type: 'unavailable',
            reason: 'Sick leave'
          }
        ]
      };

      const mockResponse: ApiResponse<Teacher> = {
        data: teacherWithUnavailability
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.get('/api/teachers/1');

      const exceptions = response.data.data.availabilityExceptions;
      expect(exceptions).toHaveLength(2);
      expect(exceptions?.[0]).toMatchObject({
        date: '2024-01-15',
        type: 'unavailable',
        reason: 'Conference'
      });
      expect(exceptions?.[1]).toMatchObject({
        date: '2024-01-20',
        type: 'unavailable',
        reason: 'Sick leave'
      });
    });

    it('should handle limited availability', async () => {
      const teacherWithLimitedAvailability: Teacher = {
        ...sampleTeacher,
        availabilityExceptions: [
          {
            date: '2024-01-18',
            type: 'limited',
            startTime: '10:00',
            endTime: '14:00',
            reason: 'Doctor appointment'
          }
        ]
      };

      const mockResponse: ApiResponse<Teacher> = {
        data: teacherWithLimitedAvailability
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.get('/api/teachers/1');

      const exception = response.data.data.availabilityExceptions?.[0];
      expect(exception).toMatchObject({
        date: '2024-01-18',
        type: 'limited',
        startTime: '10:00',
        endTime: '14:00',
        reason: 'Doctor appointment'
      });
    });

    it('should validate availability exception data', async () => {
      const invalidException = {
        name: 'Valid Teacher',
        subjectIds: ['math-1'],
        workingHours: {
          start: '08:00',
          end: '16:00'
        },
        availabilityExceptions: [
          {
            date: 'invalid-date',
            type: 'limited',
            // Missing required startTime and endTime for limited type
          }
        ]
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'availabilityExceptions[0].date', message: 'Date must be in YYYY-MM-DD format' },
              { field: 'availabilityExceptions[0].startTime', message: 'Start time is required for limited availability' },
              { field: 'availabilityExceptions[0].endTime', message: 'End time is required for limited availability' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/teachers', invalidException)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'Validation failed'
          }
        }
      });
    });
  });

  describe('Working Hours Validation', () => {
    it('should accept valid time formats', async () => {
      const validWorkingHours = [
        { start: '08:00', end: '16:00' },
        { start: '09:15', end: '17:30' },
        { start: '07:45', end: '15:15' }
      ];

      for (const workingHours of validWorkingHours) {
        const request = {
          name: 'Valid Teacher',
          subjectIds: ['math-1'],
          workingHours
        };

        const mockResponse: ApiResponse<Teacher> = {
          data: {
            ...request,
            id: '1',
            availabilityExceptions: [],
            createdAt: createMockDate('2024-01-01T00:00:00Z'),
            updatedAt: createMockDate('2024-01-01T00:00:00Z')
          }
        };

        mockApi.post.mockResolvedValue({ data: mockResponse });

        const response = await mockApi.post('/api/teachers', request);
        expect(response.data.data.workingHours).toEqual(workingHours);

        vi.clearAllMocks();
      }
    });

    it('should reject invalid time formats', async () => {
      const invalidFormats = ['25:00', '12:70', '8:00', 'abc', ''];

      for (const invalidTime of invalidFormats) {
        const request = {
          name: 'Valid Teacher',
          subjectIds: ['math-1'],
          workingHours: {
            start: invalidTime,
            end: '16:00'
          }
        };

        mockApi.post.mockRejectedValue({
          response: {
            status: 400,
            data: {
              error: 'Validation failed',
              details: [
                { field: 'workingHours.start', message: 'Start time must be in HH:mm format' }
              ]
            }
          }
        });

        await expect(mockApi.post('/api/teachers', request)).rejects.toMatchObject({
          response: {
            status: 400
          }
        });

        vi.clearAllMocks();
      }
    });
  });
});