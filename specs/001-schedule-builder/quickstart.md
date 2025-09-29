# Schedule Builder Quickstart Guide

## Prerequisites

1. Development Environment:
   ```bash
   node >= 20.x
   npm >= 9.x
   PostgreSQL >= 16
   ```

2. Clone the repository:
   ```bash
   git clone <repository-url>
   cd schedule-builder
   ```

3. Install dependencies:
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install

   # Install backend dependencies
   cd ../backend
   npm install
   ```

4. Environment setup:
   ```bash
   # Frontend (.env)
   NUXT_PUBLIC_API_URL=http://localhost:3001
   NUXT_PUBLIC_WS_URL=ws://localhost:3001

   # Backend (.env)
   DATABASE_URL=postgresql://user:password@localhost:5432/schedule_builder
   JWT_SECRET=your-secret-key
   PORT=3001
   ```

5. Database setup:
   ```bash
   # Create database
   createdb schedule_builder

   # Run migrations
   cd backend
   npm run migrate
   ```

## Development Workflow

1. Start the development servers:
   ```bash
   # Terminal 1: Frontend
   cd frontend
   npm run dev

   # Terminal 2: Backend
   cd backend
   npm run dev
   ```

2. Access the application:
   - Frontend: http://localhost:3000
   - API: http://localhost:3001

## Testing

1. Run unit tests:
   ```bash
   # Frontend
   cd frontend
   npm run test:unit

   # Backend
   cd backend
   npm run test:unit
   ```

2. Run integration tests:
   ```bash
   cd backend
   npm run test:integration
   ```

3. Run E2E tests:
   ```bash
   # Start servers in test mode first
   cd frontend
   npm run dev:test

   cd backend
   npm run dev:test

   # Run Cypress tests
   npm run test:e2e
   ```

## Core Features Validation

1. Create basic entities:
   ```typescript
   // Create a subject
   const math = await api.post('/subjects', {
     name: 'Mathematics',
     breakDuration: 15
   });

   // Create a teacher
   const teacher = await api.post('/teachers', {
     name: 'John Doe',
     subjectIds: [math.id],
     workingHours: {
       start: '08:15',
       end: '16:00'
     }
   });

   // Create a class
   const class9a = await api.post('/classes', {
     name: '9A',
     lunchDuration: 30
   });

   // Create groups
   const group1 = await api.post('/groups', {
     name: '9A-1',
     classId: class9a.id
   });

   // Create course
   const course = await api.post('/courses', {
     subjectId: math.id,
     teacherId: teacher.id,
     groupIds: [group1.id],
     weeklyHours: 3,
     numberOfLessons: 2
   });
   ```

2. Generate schedule:
   ```typescript
   const schedule = await api.post('/schedules/generate', {
     name: 'Week 39',
     weekNumber: 39,
     year: 2025
   });
   ```

3. Generate alternatives:
   ```typescript
   const alternatives = await api.post(`/schedules/${schedule.id}/alternatives`, {
     count: 3
   });
   ```

## Common Operations

1. View schedule by class:
   ```typescript
   const classSchedule = await api.get(`/schedules/${scheduleId}/classes/${classId}`);
   ```

2. Update lesson timing:
   ```typescript
   await api.patch(`/schedules/${scheduleId}/lessons/${lessonId}`, {
     startTime: '10:00',
     duration: 45
   });
   ```

3. Validate schedule:
   ```typescript
   const validation = await api.post(`/schedules/${scheduleId}/validate`);
   ```

## Troubleshooting

1. Schedule Generation Issues:
   - Check teacher availability
   - Verify group dependencies
   - Ensure break requirements are not conflicting
   - Review lunch period constraints

2. Real-time Sync Issues:
   - Check WebSocket connection
   - Verify client subscription
   - Review browser console for errors
   - Check server logs for conflicts

3. Performance Issues:
   - Monitor database query performance
   - Check browser memory usage
   - Review server resource utilization
   - Optimize large dataset operations

## Support

For issues and feature requests:
1. Check existing issues in repository
2. Submit detailed bug report if needed
3. Include relevant logs and screenshots
4. Provide steps to reproduce