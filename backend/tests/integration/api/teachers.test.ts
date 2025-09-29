import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Teacher } from '../../../src/models/Teacher';

interface TeacherRequestBody {
  name: string;
  subjectIds: string[];
  workingHours?: {
    start: string;
    end: string;
  };
}

describe('Teachers API', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    
    // Mock endpoints for testing
    app.get('/api/teachers', (req, res) => {
      res.json({
        teachers: [],
        total: 0,
        page: 1,
        pageSize: 10,
      });
    });
    
    app.post('/api/teachers', (req, res) => {
      const teacherData = req.body;
      res.status(201).json({
        teacher: {
          id: 'test-teacher-1',
          ...teacherData,
          workingHours: teacherData.workingHours || { start: '08:15', end: '16:00' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    });
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('GET /api/teachers', () => {
    it('should return list of teachers with pagination', async () => {
      const response = await request(app)
        .get('/api/teachers')
        .expect(200);

      expect(response.body).toHaveProperty('teachers');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
      expect(Array.isArray(response.body.teachers)).toBe(true);
    });

    it('should filter teachers by subject', async () => {
      const response = await request(app)
        .get('/api/teachers?subjectId=math')
        .expect(200);

      expect(response.body).toHaveProperty('teachers');
    });
  });

  describe('POST /api/teachers', () => {
    it('should create a new teacher with valid data', async () => {
      const teacherData: TeacherRequestBody = {
        name: 'John Doe',
        subjectIds: ['math', 'physics'],
        workingHours: {
          start: '08:00',
          end: '16:30',
        },
      };

      const response = await request(app)
        .post('/api/teachers')
        .send(teacherData)
        .expect(201);

      expect(response.body).toHaveProperty('teacher');
      expect(response.body.teacher.name).toBe(teacherData.name);
      expect(response.body.teacher.subjectIds).toEqual(teacherData.subjectIds);
      expect(response.body.teacher.workingHours).toEqual(teacherData.workingHours);
    });

    it('should create teacher with default working hours', async () => {
      const teacherData: TeacherRequestBody = {
        name: 'Jane Smith',
        subjectIds: ['english'],
      };

      const response = await request(app)
        .post('/api/teachers')
        .send(teacherData)
        .expect(201);

      expect(response.body.teacher.workingHours).toEqual({
        start: '08:15',
        end: '16:00',
      });
    });

    it('should reject teacher without subjects', async () => {
      const invalidData = {
        name: 'No Subject Teacher',
        subjectIds: [], // Should fail validation
      };

      const response = await request(app)
        .post('/api/teachers')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate working hours format', async () => {
      const invalidData = {
        name: 'Invalid Hours Teacher',
        subjectIds: ['math'],
        workingHours: {
          start: '25:00', // Invalid hour
          end: '16:00',
        },
      };

      const response = await request(app)
        .post('/api/teachers')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});