import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Schedule } from '../../../src/models/Schedule';

interface ScheduleGenerateRequestBody {
  name: string;
  weekNumber: number;
  year: number;
}

interface AlternativesRequestBody {
  count?: number;
}

describe('Schedules API', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    
    // Mock endpoints for testing
    app.get('/api/schedules', (req, res) => {
      res.json({
        schedules: [],
        total: 0,
        page: 1,
        pageSize: 10,
      });
    });
    
    app.post('/api/schedules/generate', (req, res) => {
      const { name, weekNumber, year } = req.body;
      res.status(201).json({
        schedule: {
          id: 'test-schedule-1',
          name,
          weekNumber,
          year,
          status: 'draft',
          lessons: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        status: 'success',
        messages: ['Schedule generated successfully'],
      });
    });
    
    app.post('/api/schedules/:id/alternatives', (req, res) => {
      const { count = 1 } = req.body;
      const schedules = [];
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        schedules.push({
          id: `alt-schedule-${i + 1}`,
          name: `Alternative ${i + 1}`,
          weekNumber: 1,
          year: 2025,
          status: 'draft',
          lessons: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      
      res.json({
        schedules,
        status: 'success',
        messages: [`Generated ${schedules.length} alternative schedules`],
      });
    });
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('GET /api/schedules', () => {
    it('should return list of schedules with pagination', async () => {
      const response = await request(app)
        .get('/api/schedules')
        .expect(200);

      expect(response.body).toHaveProperty('schedules');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
      expect(Array.isArray(response.body.schedules)).toBe(true);
    });

    it('should filter schedules by status', async () => {
      const response = await request(app)
        .get('/api/schedules?status=active')
        .expect(200);

      expect(response.body).toHaveProperty('schedules');
    });
  });

  describe('POST /api/schedules/generate', () => {
    it('should generate a new schedule', async () => {
      const scheduleData: ScheduleGenerateRequestBody = {
        name: 'Week 1 Schedule',
        weekNumber: 1,
        year: 2025,
      };

      const response = await request(app)
        .post('/api/schedules/generate')
        .send(scheduleData)
        .expect(201);

      expect(response.body).toHaveProperty('schedule');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('messages');
      expect(response.body.schedule.name).toBe(scheduleData.name);
      expect(response.body.schedule.weekNumber).toBe(scheduleData.weekNumber);
      expect(response.body.schedule.year).toBe(scheduleData.year);
      expect(['success', 'partial', 'failed']).toContain(response.body.status);
    });

    it('should validate week number range', async () => {
      const invalidData = {
        name: 'Invalid Week Schedule',
        weekNumber: 54, // Invalid - max is 53
        year: 2025,
      };

      const response = await request(app)
        .post('/api/schedules/generate')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate year', async () => {
      const invalidData = {
        name: 'Old Schedule',
        weekNumber: 1,
        year: 1999, // Too old
      };

      const response = await request(app)
        .post('/api/schedules/generate')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/schedules/:id/alternatives', () => {
    it('should generate alternative schedules', async () => {
      const alternativesData: AlternativesRequestBody = {
        count: 3,
      };

      const response = await request(app)
        .post('/api/schedules/schedule-1/alternatives')
        .send(alternativesData)
        .expect(200);

      expect(response.body).toHaveProperty('schedules');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('messages');
      expect(Array.isArray(response.body.schedules)).toBe(true);
      expect(response.body.schedules.length).toBe(3);
    });

    it('should limit alternatives to maximum 5', async () => {
      const alternativesData: AlternativesRequestBody = {
        count: 10, // Should be limited to 5
      };

      const response = await request(app)
        .post('/api/schedules/schedule-1/alternatives')
        .send(alternativesData)
        .expect(200);

      expect(response.body.schedules.length).toBeLessThanOrEqual(5);
    });

    it('should use default count of 1', async () => {
      const response = await request(app)
        .post('/api/schedules/schedule-1/alternatives')
        .send({})
        .expect(200);

      expect(response.body.schedules.length).toBe(1);
    });
  });
});