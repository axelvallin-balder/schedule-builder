import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Course, CourseCreateRequest, CourseUpdateRequest, ApiResponse, PaginatedResponse } from '../../app/types/entities';
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

describe('Course API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Sample test data
  const sampleCourse: Course = {
    id: '1',
    subjectId: 'math-1',
    teacherId: 'teacher-1',
    groupIds: ['group-1', 'group-2'],
    weeklyHours: 4,
    numberOfLessons: 2,
    duration: 90,
    resourceRequirements: ['projector', 'whiteboard'],
    createdAt: createMockDate('2024-01-01T00:00:00Z'),
    updatedAt: createMockDate('2024-01-01T00:00:00Z')
  };

  const sampleCreateRequest: CourseCreateRequest = {
    subjectId: 'physics-1',
    teacherId: 'teacher-2',
    groupIds: ['group-3'],
    weeklyHours: 3,
    numberOfLessons: 2,
    duration: 75,
    resourceRequirements: ['lab-equipment', 'computer']
  };

  const sampleUpdateRequest: CourseUpdateRequest = {
    weeklyHours: 5,
    numberOfLessons: 3,
    groupIds: ['group-1', 'group-2', 'group-4']
  };

  describe('GET /api/courses', () => {
    it('should return paginated courses list', async () => {
      const mockResponse: PaginatedResponse<Course> = {
        data: [sampleCourse],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.get('/api/courses', {
        query: { page: 1, limit: 10 }
      });

      expect(mockApi.get).toHaveBeenCalledWith('/api/courses', {
        query: { page: 1, limit: 10 }
      });
      expect(response.data).toEqual(mockResponse);
      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0]).toMatchObject({
        id: expect.any(String),
        subjectId: expect.any(String),
        groupIds: expect.any(Array),
        weeklyHours: expect.any(Number),
        numberOfLessons: expect.any(Number),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should support filtering by subject', async () => {
      const mockResponse: PaginatedResponse<Course> = {
        data: [sampleCourse],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      await mockApi.get('/api/courses', {
        query: { subjectId: 'math-1' }
      });

      expect(mockApi.get).toHaveBeenCalledWith('/api/courses', {
        query: { subjectId: 'math-1' }
      });
    });

    it('should support filtering by teacher', async () => {
      const mockResponse: PaginatedResponse<Course> = {
        data: [sampleCourse],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      await mockApi.get('/api/courses', {
        query: { teacherId: 'teacher-1' }
      });

      expect(mockApi.get).toHaveBeenCalledWith('/api/courses', {
        query: { teacherId: 'teacher-1' }
      });
    });

    it('should support filtering by group', async () => {
      const mockResponse: PaginatedResponse<Course> = {
        data: [sampleCourse],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      await mockApi.get('/api/courses', {
        query: { groupId: 'group-1' }
      });

      expect(mockApi.get).toHaveBeenCalledWith('/api/courses', {
        query: { groupId: 'group-1' }
      });
    });

    it('should support filtering by weekly hours', async () => {
      const mockResponse: PaginatedResponse<Course> = {
        data: [sampleCourse],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      await mockApi.get('/api/courses', {
        query: { minWeeklyHours: 3, maxWeeklyHours: 5 }
      });

      expect(mockApi.get).toHaveBeenCalledWith('/api/courses', {
        query: { minWeeklyHours: 3, maxWeeklyHours: 5 }
      });
    });
  });

  describe('GET /api/courses/:id', () => {
    it('should return single course with all details', async () => {
      const mockResponse: ApiResponse<Course> = {
        data: sampleCourse
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.get('/api/courses/1');

      expect(mockApi.get).toHaveBeenCalledWith('/api/courses/1');
      expect(response.data.data).toMatchObject({
        id: '1',
        subjectId: 'math-1',
        teacherId: 'teacher-1',
        groupIds: expect.arrayContaining(['group-1', 'group-2']),
        weeklyHours: 4,
        numberOfLessons: 2,
        duration: 90,
        resourceRequirements: expect.arrayContaining(['projector', 'whiteboard'])
      });
    });

    it('should return 404 for non-existent course', async () => {
      mockApi.get.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Course not found' }
        }
      });

      await expect(mockApi.get('/api/courses/999')).rejects.toMatchObject({
        response: {
          status: 404,
          data: { error: 'Course not found' }
        }
      });
    });
  });

  describe('POST /api/courses', () => {
    it('should create new course with valid data', async () => {
      const mockResponse: ApiResponse<Course> = {
        data: {
          id: '2',
          subjectId: sampleCreateRequest.subjectId,
          teacherId: sampleCreateRequest.teacherId ?? null,
          groupIds: sampleCreateRequest.groupIds,
          weeklyHours: sampleCreateRequest.weeklyHours,
          numberOfLessons: sampleCreateRequest.numberOfLessons,
          duration: sampleCreateRequest.duration,
          resourceRequirements: sampleCreateRequest.resourceRequirements,
          createdAt: createMockDate('2024-01-01T00:00:00Z'),
          updatedAt: createMockDate('2024-01-01T00:00:00Z')
        }
      };

      mockApi.post.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.post('/api/courses', sampleCreateRequest);

      expect(mockApi.post).toHaveBeenCalledWith('/api/courses', sampleCreateRequest);
      expect(response.data.data).toMatchObject({
        id: expect.any(String),
        subjectId: 'physics-1',
        teacherId: 'teacher-2',
        groupIds: ['group-3'],
        weeklyHours: 3,
        numberOfLessons: 2,
        duration: 75,
        resourceRequirements: expect.arrayContaining(['lab-equipment', 'computer'])
      });
    });

    it('should create course with auto-assigned teacher', async () => {
      const autoAssignRequest: CourseCreateRequest = {
        subjectId: 'chemistry-1',
        teacherId: null, // Auto-assign
        groupIds: ['group-5'],
        weeklyHours: 3,
        numberOfLessons: 2
      };

      const mockResponse: ApiResponse<Course> = {
        data: {
          id: '3',
          subjectId: autoAssignRequest.subjectId,
          teacherId: autoAssignRequest.teacherId ?? null,
          groupIds: autoAssignRequest.groupIds,
          weeklyHours: autoAssignRequest.weeklyHours,
          numberOfLessons: autoAssignRequest.numberOfLessons,
          duration: autoAssignRequest.duration,
          resourceRequirements: autoAssignRequest.resourceRequirements,
          createdAt: createMockDate('2024-01-01T00:00:00Z'),
          updatedAt: createMockDate('2024-01-01T00:00:00Z')
        }
      };

      mockApi.post.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.post('/api/courses', autoAssignRequest);

      expect(mockApi.post).toHaveBeenCalledWith('/api/courses', autoAssignRequest);
      expect(response.data.data.teacherId).toBeNull();
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        // Missing required subjectId
        teacherId: 'teacher-1',
        groupIds: ['group-1'],
        weeklyHours: 3,
        numberOfLessons: 2
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'subjectId', message: 'Subject is required' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/courses', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'subjectId',
                message: expect.stringContaining('required')
              })
            ])
          }
        }
      });
    });

    it('should validate at least one group is selected', async () => {
      const invalidRequest = {
        subjectId: 'math-1',
        teacherId: 'teacher-1',
        groupIds: [], // Empty group list
        weeklyHours: 3,
        numberOfLessons: 2
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'groupIds', message: 'At least one group must be selected' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/courses', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'groupIds',
                message: expect.stringContaining('At least one group')
              })
            ])
          }
        }
      });
    });

    it('should validate weekly hours', async () => {
      const invalidRequest = {
        subjectId: 'math-1',
        teacherId: 'teacher-1',
        groupIds: ['group-1'],
        weeklyHours: 0, // Invalid weekly hours
        numberOfLessons: 2
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'weeklyHours', message: 'Weekly hours must be positive' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/courses', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'weeklyHours',
                message: expect.stringContaining('must be positive')
              })
            ])
          }
        }
      });
    });

    it('should validate weekly hours maximum', async () => {
      const invalidRequest = {
        subjectId: 'math-1',
        teacherId: 'teacher-1',
        groupIds: ['group-1'],
        weeklyHours: 50, // Too high
        numberOfLessons: 2
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'weeklyHours', message: 'Weekly hours cannot exceed 40' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/courses', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'weeklyHours',
                message: expect.stringContaining('cannot exceed 40')
              })
            ])
          }
        }
      });
    });

    it('should validate number of lessons', async () => {
      const invalidRequest = {
        subjectId: 'math-1',
        teacherId: 'teacher-1',
        groupIds: ['group-1'],
        weeklyHours: 3,
        numberOfLessons: 0 // Invalid number of lessons
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'numberOfLessons', message: 'Must have at least 1 lesson' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/courses', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'numberOfLessons',
                message: expect.stringContaining('at least 1 lesson')
              })
            ])
          }
        }
      });
    });

    it('should validate number of lessons maximum', async () => {
      const invalidRequest = {
        subjectId: 'math-1',
        teacherId: 'teacher-1',
        groupIds: ['group-1'],
        weeklyHours: 3,
        numberOfLessons: 15 // Too many lessons
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'numberOfLessons', message: 'Cannot exceed 10 lessons per week' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/courses', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'numberOfLessons',
                message: expect.stringContaining('Cannot exceed 10 lessons')
              })
            ])
          }
        }
      });
    });

    it('should validate lesson duration minimum', async () => {
      const invalidRequest = {
        subjectId: 'math-1',
        teacherId: 'teacher-1',
        groupIds: ['group-1'],
        weeklyHours: 3,
        numberOfLessons: 2,
        duration: 30 // Too short
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'duration', message: 'Duration must be at least 45 minutes if specified' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/courses', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'duration',
                message: expect.stringContaining('at least 45 minutes')
              })
            ])
          }
        }
      });
    });

    it('should validate entity references', async () => {
      const invalidRequest = {
        subjectId: 'non-existent-subject',
        teacherId: 'non-existent-teacher',
        groupIds: ['non-existent-group'],
        weeklyHours: 3,
        numberOfLessons: 2
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Invalid references',
            details: [
              { field: 'subjectId', message: 'Subject non-existent-subject does not exist' },
              { field: 'teacherId', message: 'Teacher non-existent-teacher does not exist' },
              { field: 'groupIds', message: 'Group non-existent-group does not exist' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/courses', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'Invalid references'
          }
        }
      });
    });

    it('should validate teacher qualification for subject', async () => {
      const invalidRequest = {
        subjectId: 'physics-1',
        teacherId: 'math-only-teacher', // Not qualified for physics
        groupIds: ['group-1'],
        weeklyHours: 3,
        numberOfLessons: 2
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'teacherId', message: 'Teacher is not qualified for this subject' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/courses', invalidRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'teacherId',
                message: expect.stringContaining('not qualified')
              })
            ])
          }
        }
      });
    });
  });

  describe('PUT /api/courses/:id', () => {
    it('should update course with valid data', async () => {
      const mockResponse: ApiResponse<Course> = {
        data: {
          ...sampleCourse,
          ...sampleUpdateRequest,
          updatedAt: createMockDate('2024-01-02T00:00:00Z')
        }
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.put('/api/courses/1', sampleUpdateRequest);

      expect(mockApi.put).toHaveBeenCalledWith('/api/courses/1', sampleUpdateRequest);
      expect(response.data.data).toMatchObject({
        id: '1',
        weeklyHours: 5,
        numberOfLessons: 3,
        groupIds: expect.arrayContaining(['group-1', 'group-2', 'group-4'])
      });
      expect(response.data.data.updatedAt).not.toEqual(sampleCourse.updatedAt);
    });

    it('should handle partial updates', async () => {
      const partialUpdate = {
        weeklyHours: 6
      };

      const mockResponse: ApiResponse<Course> = {
        data: {
          ...sampleCourse,
          weeklyHours: partialUpdate.weeklyHours,
          updatedAt: createMockDate('2024-01-02T00:00:00Z')
        }
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.put('/api/courses/1', partialUpdate);

      expect(mockApi.put).toHaveBeenCalledWith('/api/courses/1', partialUpdate);
      expect(response.data.data.weeklyHours).toBe(6);
      expect(response.data.data.subjectId).toBe(sampleCourse.subjectId); // Unchanged
      expect(response.data.data.numberOfLessons).toBe(sampleCourse.numberOfLessons); // Unchanged
    });

    it('should return 404 for non-existent course', async () => {
      mockApi.put.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Course not found' }
        }
      });

      await expect(mockApi.put('/api/courses/999', sampleUpdateRequest)).rejects.toMatchObject({
        response: {
          status: 404
        }
      });
    });

    it('should validate update data', async () => {
      const invalidUpdate = {
        weeklyHours: -1,
        numberOfLessons: 0,
        groupIds: [],
        duration: 20
      };

      mockApi.put.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'weeklyHours', message: 'Weekly hours must be positive' },
              { field: 'numberOfLessons', message: 'Must have at least 1 lesson' },
              { field: 'groupIds', message: 'At least one group must be selected' },
              { field: 'duration', message: 'Duration must be at least 45 minutes if specified' }
            ]
          }
        }
      });

      await expect(mockApi.put('/api/courses/1', invalidUpdate)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: 'Validation failed'
          }
        }
      });
    });
  });

  describe('DELETE /api/courses/:id', () => {
    it('should delete course successfully', async () => {
      mockApi.delete.mockResolvedValue({ 
        data: { 
          message: 'Course deleted successfully' 
        } 
      });

      const response = await mockApi.delete('/api/courses/1');

      expect(mockApi.delete).toHaveBeenCalledWith('/api/courses/1');
      expect(response.data).toMatchObject({
        message: expect.stringContaining('deleted')
      });
    });

    it('should return 404 for non-existent course', async () => {
      mockApi.delete.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Course not found' }
        }
      });

      await expect(mockApi.delete('/api/courses/999')).rejects.toMatchObject({
        response: {
          status: 404
        }
      });
    });

    it('should prevent deletion if course is in active schedule', async () => {
      mockApi.delete.mockRejectedValue({
        response: {
          status: 409,
          data: { 
            error: 'Cannot delete course',
            details: 'Course is part of an active schedule'
          }
        }
      });

      await expect(mockApi.delete('/api/courses/1')).rejects.toMatchObject({
        response: {
          status: 409,
          data: {
            error: expect.stringContaining('Cannot delete'),
            details: expect.stringContaining('active schedule')
          }
        }
      });
    });
  });

  describe('Course-Group Relationships', () => {
    it('should handle course with multiple groups', async () => {
      const multiGroupCourse: Course = {
        ...sampleCourse,
        groupIds: ['group-1', 'group-2', 'group-3', 'group-4']
      };

      const mockResponse: ApiResponse<Course> = {
        data: multiGroupCourse
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.get('/api/courses/1');

      expect(response.data.data.groupIds).toHaveLength(4);
      expect(response.data.data.groupIds).toContain('group-1');
      expect(response.data.data.groupIds).toContain('group-2');
      expect(response.data.data.groupIds).toContain('group-3');
      expect(response.data.data.groupIds).toContain('group-4');
    });

    it('should support adding groups to existing course', async () => {
      const updateWithNewGroup = {
        groupIds: [...sampleCourse.groupIds, 'group-5']
      };

      const mockResponse: ApiResponse<Course> = {
        data: {
          ...sampleCourse,
          groupIds: updateWithNewGroup.groupIds
        }
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.put('/api/courses/1', updateWithNewGroup);

      expect(response.data.data.groupIds).toContain('group-5');
      expect(response.data.data.groupIds).toHaveLength(3);
    });

    it('should support removing groups from course', async () => {
      const updateWithRemovedGroup = {
        groupIds: ['group-1'] // Remove group-2
      };

      const mockResponse: ApiResponse<Course> = {
        data: {
          ...sampleCourse,
          groupIds: updateWithRemovedGroup.groupIds
        }
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.put('/api/courses/1', updateWithRemovedGroup);

      expect(response.data.data.groupIds).toEqual(['group-1']);
      expect(response.data.data.groupIds).not.toContain('group-2');
    });
  });

  describe('Resource Requirements', () => {
    it('should handle courses with various resource requirements', async () => {
      const resourceTests = [
        { resources: [], name: 'Basic Course' },
        { resources: ['projector'], name: 'Presentation Course' },
        { resources: ['computer', 'internet', 'projector'], name: 'Tech Course' },
        { resources: ['lab-equipment', 'safety-gear', 'fume-hood'], name: 'Lab Course' }
      ];

      for (const test of resourceTests) {
        const course: Course = {
          ...sampleCourse,
          resourceRequirements: test.resources
        };

        const mockResponse: ApiResponse<Course> = {
          data: course
        };

        mockApi.get.mockResolvedValue({ data: mockResponse });

        const response = await mockApi.get('/api/courses/1');
        expect(response.data.data.resourceRequirements).toEqual(test.resources);

        vi.clearAllMocks();
      }
    });

    it('should support updating resource requirements', async () => {
      const updateWithResources = {
        resourceRequirements: ['smart-board', 'tablets', 'wifi']
      };

      const mockResponse: ApiResponse<Course> = {
        data: {
          ...sampleCourse,
          resourceRequirements: updateWithResources.resourceRequirements
        }
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.put('/api/courses/1', updateWithResources);

      expect(response.data.data.resourceRequirements).toEqual(['smart-board', 'tablets', 'wifi']);
    });
  });

  describe('Auto-Assignment and Teacher Management', () => {
    it('should handle teacher reassignment', async () => {
      const reassignTeacher = {
        teacherId: 'new-teacher-id'
      };

      const mockResponse: ApiResponse<Course> = {
        data: {
          ...sampleCourse,
          teacherId: reassignTeacher.teacherId
        }
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.put('/api/courses/1', reassignTeacher);

      expect(response.data.data.teacherId).toBe('new-teacher-id');
    });

    it('should handle setting course to auto-assign', async () => {
      const setAutoAssign = {
        teacherId: null
      };

      const mockResponse: ApiResponse<Course> = {
        data: {
          ...sampleCourse,
          teacherId: null
        }
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      const response = await mockApi.put('/api/courses/1', setAutoAssign);

      expect(response.data.data.teacherId).toBeNull();
    });

    it('should validate teacher availability conflicts', async () => {
      const conflictingAssignment = {
        teacherId: 'busy-teacher'
      };

      mockApi.put.mockRejectedValue({
        response: {
          status: 409,
          data: {
            error: 'Schedule conflict',
            details: 'Teacher has conflicting assignments at the same time'
          }
        }
      });

      await expect(mockApi.put('/api/courses/1', conflictingAssignment)).rejects.toMatchObject({
        response: {
          status: 409,
          data: {
            error: expect.stringContaining('conflict'),
            details: expect.stringContaining('conflicting assignments')
          }
        }
      });
    });
  });

  describe('Weekly Hours and Lesson Distribution', () => {
    it('should accept valid weekly hours and lesson combinations', async () => {
      const validCombinations = [
        { weeklyHours: 2, numberOfLessons: 1 },
        { weeklyHours: 3, numberOfLessons: 2 },
        { weeklyHours: 6, numberOfLessons: 3 },
        { weeklyHours: 10, numberOfLessons: 5 }
      ];

      for (const combo of validCombinations) {
        const request = {
          subjectId: 'test-subject',
          groupIds: ['test-group'],
          ...combo
        };

        const mockResponse: ApiResponse<Course> = {
          data: {
            ...request,
            id: '1',
            teacherId: null,
            createdAt: createMockDate('2024-01-01T00:00:00Z'),
            updatedAt: createMockDate('2024-01-01T00:00:00Z')
          }
        };

        mockApi.post.mockResolvedValue({ data: mockResponse });

        const response = await mockApi.post('/api/courses', request);
        expect(response.data.data.weeklyHours).toBe(combo.weeklyHours);
        expect(response.data.data.numberOfLessons).toBe(combo.numberOfLessons);

        vi.clearAllMocks();
      }
    });

    it('should validate reasonable hours per lesson ratio', async () => {
      const unreasonableRequest = {
        subjectId: 'test-subject',
        groupIds: ['test-group'],
        weeklyHours: 1,
        numberOfLessons: 10 // Would result in 6-minute lessons
      };

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: [
              { field: 'weeklyHours', message: 'Weekly hours too low for number of lessons' }
            ]
          }
        }
      });

      await expect(mockApi.post('/api/courses', unreasonableRequest)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'weeklyHours',
                message: expect.stringContaining('too low')
              })
            ])
          }
        }
      });
    });
  });
});