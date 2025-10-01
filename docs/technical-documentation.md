# Schedule Builder Technical Documentation

## Architecture Overview

The Schedule Builder is a full-stack web application built with modern technologies, focusing on performance, scalability, and real-time collaboration.

### Technology Stack

**Frontend**
- **Framework**: Nuxt.js 3 (Vue.js 3 based)
- **Language**: TypeScript
- **Styling**: CSS with modern features
- **State Management**: Pinia
- **Testing**: Vitest + Vue Test Utils
- **Real-time**: WebSocket client

**Backend**
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Real-time**: WebSocket (ws library)
- **Testing**: Vitest + Supertest
- **Performance Monitoring**: Custom performance monitoring

**Infrastructure**
- **Containerization**: Docker support
- **Development**: Hot reload, type checking
- **Production**: Optimized builds, monitoring

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Nuxt.js)     │◄──►│   (Express)     │◄──►│   (PostgreSQL)  │
│                 │    │                 │    │                 │
│ - Vue Components│    │ - REST API      │    │ - Course Data   │
│ - Pinia Store   │    │ - WebSocket     │    │ - Schedules     │
│ - WebSocket     │    │ - TypeORM       │    │ - Users         │
│ - Performance   │    │ - Services      │    │ - Lessons       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Architecture

**Frontend Components**
```
components/
├── modals/
│   └── CourseModal.vue          # Course creation/editing
├── rules/
│   └── RuleEditor.vue           # Constraint management
├── schedule/
│   ├── LessonCard.vue           # Individual lesson display
│   ├── WeeklySchedule.vue       # Main schedule grid
│   ├── ScheduleSelector.vue     # Schedule dropdown selector
│   ├── ClassSelector.vue        # Searchable class picker
│   ├── CalendarNavigation.vue   # View mode toggle & day selector
│   ├── CalendarView.vue         # Interactive calendar grid
│   ├── CalendarLessonCard.vue   # Simplified lesson cards for calendar
│   └── EnhancedLessonCard.vue   # Adaptive lesson card component
└── workflows/
    ├── CollaborationWorkflow.vue # Real-time collaboration
    ├── RuleManagementWorkflow.vue # Rule configuration
    └── ScheduleGenerationWorkflow.vue # Schedule creation
```

**Calendar Feature Architecture**
The calendar schedule display feature provides an interactive viewing experience:

- **State Management**: Pinia store (`stores/calendar.ts`) manages selections and data
- **Service Layer**: `calendarService.ts` handles API integration and data transformation
- **Type Safety**: Comprehensive TypeScript interfaces in `types/calendar.ts`
- **Accessibility**: WCAG 2.1 AA compliant with full keyboard navigation
- **Performance**: Optimized CSS Grid layout for 100+ lesson datasets
- **Responsive**: Automatic mobile adaptation with day view fallback

**Data Flow**: User Selection → Store Update → API Call → Data Transform → UI Reactivity

**Backend Services**
```
services/
├── OptimizedScheduleGenerator.ts # Core scheduling algorithm
├── PerformanceMonitor.ts         # System performance tracking
├── CacheService.ts               # Multi-level caching
├── ErrorRecoveryService.ts       # Error handling & recovery
├── CollaborationService.ts       # Real-time collaboration
├── RuleValidator.ts              # Constraint validation
└── TeacherAssignment.ts          # Teacher-course matching
```

## Database Schema

### Core Entities

**Schedules Table**
```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status schedule_status DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Courses Table**
```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL,
  teacher_id UUID,
  group_ids TEXT[] NOT NULL,
  weekly_hours INTEGER DEFAULT 3,
  number_of_lessons INTEGER DEFAULT 2,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Teachers Table**
```sql
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subject_ids TEXT[] NOT NULL,
  working_hours JSONB DEFAULT '{"start": "08:15", "end": "16:00"}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Lessons Table**
```sql
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id),
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  schedule_id UUID NOT NULL REFERENCES schedules(id),
  room_id UUID,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  duration INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Groups Table**
```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  level VARCHAR(100) NOT NULL,
  max_students INTEGER NOT NULL,
  current_students INTEGER DEFAULT 0,
  class_id UUID NOT NULL,
  dependent_group_ids UUID[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Entity Relationships

```
Course ──┬── Teacher (Many-to-One)
         ├── Subject (Many-to-One)
         └── Groups (Many-to-Many)

Lesson ──┬── Course (Many-to-One)
         ├── Teacher (Many-to-One)
         ├── Schedule (Many-to-One)
         └── Room (Many-to-One, optional)

Schedule ──── Lessons (One-to-Many)

Group ──┬── Class (Many-to-One)
        └── Dependencies (Self-referencing Many-to-Many)
```

## API Documentation

### REST Endpoints

**Course Management**
```typescript
// Get all courses
GET /api/courses
Response: Course[]

// Create course
POST /api/courses
Body: CreateCourseDTO
Response: Course

// Update course
PUT /api/courses/:id
Body: UpdateCourseDTO
Response: Course

// Delete course
DELETE /api/courses/:id
Response: { success: boolean }
```

**Schedule Management**
```typescript
// Generate optimized schedule
POST /api/schedules/generate
Body: {
  courses: Course[],
  teachers: Teacher[],
  groups: Group[],
  constraints: ScheduleConstraints
}
Response: {
  schedule: Schedule,
  metrics: OptimizationMetrics
}

// Get schedule
GET /api/schedules/:id
Response: Schedule

// Update schedule
PUT /api/schedules/:id
Body: UpdateScheduleDTO
Response: Schedule
```

**Teacher Management**
```typescript
// Get all teachers
GET /api/teachers
Response: Teacher[]

// Create teacher
POST /api/teachers
Body: CreateTeacherDTO
Response: Teacher

// Update teacher availability
PUT /api/teachers/:id/availability
Body: { workingHours: WorkingHours }
Response: Teacher
```

**Group Management**
```typescript
// Get all groups
GET /api/groups
Response: Group[]

// Create group
POST /api/groups
Body: CreateGroupDTO
Response: Group

// Update group dependencies
PUT /api/groups/:id/dependencies
Body: { dependentGroupIds: string[] }
Response: Group
```

### WebSocket Events

**Real-time Collaboration**
```typescript
// Join collaboration session
emit('join-session', { scheduleId: string, userId: string })

// Lesson updates
on('lesson-updated', { lesson: Lesson, userId: string })
emit('update-lesson', { lessonId: string, changes: Partial<Lesson> })

// User presence
on('user-joined', { userId: string, userName: string })
on('user-left', { userId: string })

// Conflict notifications
on('conflict-detected', { conflictId: string, lessons: Lesson[] })
emit('resolve-conflict', { conflictId: string, resolution: ConflictResolution })
```

## Core Algorithms

### Schedule Generation Algorithm

The OptimizedScheduleGenerator uses a multi-phase approach:

**Phase 1: Constraint Preprocessing**
```typescript
interface ScheduleConstraints {
  maxLessonsPerDay: number;     // Default: 8
  lessonDuration: number;       // Default: 45 minutes
  breakDuration: number;        // Default: 15 minutes
  maxHoursPerWeek: number;      // Default: 40 hours
  startTime: string;            // Default: "08:15"
  endTime: string;              // Default: "16:00"
}
```

**Phase 2: Greedy Scheduling**
1. Sort courses by complexity (teacher constraints, group dependencies)
2. For each course, find optimal time slots:
   - Check teacher availability
   - Verify group availability
   - Ensure room capacity (if specified)
   - Respect daily/weekly limits
3. Use constraint satisfaction to resolve conflicts

**Phase 3: Optimization**
1. Apply local search improvements
2. Minimize gaps in teacher schedules
3. Balance daily lesson distribution
4. Optimize resource utilization

**Performance Characteristics**
- **Time Complexity**: O(n log n) where n = number of courses
- **Space Complexity**: O(n + m) where m = number of time slots
- **Typical Performance**: 2-5 seconds for 50 courses, 20 teachers

### Conflict Resolution Algorithm

**Conflict Detection**
```typescript
interface Conflict {
  type: 'teacher' | 'group' | 'room';
  lessons: Lesson[];
  severity: 'high' | 'medium' | 'low';
  resolutionOptions: ResolutionOption[];
}
```

**Resolution Strategies**
1. **Automatic Resolution**: Move least constrained lesson
2. **Teacher Conflict**: Reassign or reschedule
3. **Group Conflict**: Split groups or merge lessons
4. **Room Conflict**: Find alternative rooms

### Caching Strategy

**Multi-Level Cache Architecture**
```typescript
interface CacheConfiguration {
  scheduleCache: {
    maxSize: 32MB,
    ttl: 60 minutes,
    maxEntries: 100
  },
  courseCache: {
    maxSize: 16MB,
    ttl: 24 hours,
    maxEntries: 500
  },
  teacherCache: {
    maxSize: 8MB,
    ttl: 24 hours,
    maxEntries: 200
  }
}
```

**Cache Invalidation**
- **Schedule changes**: Invalidate related caches
- **Teacher updates**: Clear teacher and related course caches
- **Course modifications**: Invalidate course and schedule caches
- **Time-based**: Automatic TTL expiration

## Performance Monitoring

### Key Metrics

**Response Time Thresholds**
```typescript
const PERFORMANCE_THRESHOLDS = {
  scheduleGeneration: 5000,    // 5 seconds max
  uiResponse: 100,             // 100ms max
  apiResponse: 200,            // 200ms max
  memoryUsage: 512 * 1024 * 1024, // 512MB max
  errorRate: 0.05              // 5% max error rate
};
```

**Monitoring Implementation**
```typescript
// Performance monitoring usage
const result = await performanceMonitor.timeFunction(
  'schedule_generation',
  async () => {
    return await generator.generateOptimizedSchedule(
      courses, teachers, groups, constraints
    );
  },
  { courseCount: courses.length }
);

// Automatic threshold checking and alerting
const report = performanceMonitor.generateReport();
console.log(`Hit rate: ${report.summary.hitRate * 100}%`);
```

### System Health Monitoring

**Health Check Endpoints**
```typescript
GET /api/health
Response: {
  status: 'healthy' | 'degraded' | 'critical',
  performance: PerformanceMetrics,
  cache: CacheHealthReport,
  errors: ErrorReport,
  uptime: number
}
```

**Automated Alerts**
- Performance degradation detection
- Error rate threshold violations
- Memory pressure warnings
- Cache efficiency monitoring

## Error Handling & Recovery

### Error Recovery Patterns

**Circuit Breaker Pattern**
```typescript
const recovery = await errorRecoveryService.executeWithRecovery(
  primaryOperation,
  {
    operation: 'schedule_generation',
    timestamp: Date.now(),
    userId: 'user123'
  },
  {
    maxRetries: 3,
    exponentialBackoff: true,
    circuitBreakerThreshold: 5
  }
);
```

**Fallback Strategies**
```typescript
const result = await errorRecoveryService.executeWithFallback(
  primaryScheduleGeneration,
  fallbackSimpleGeneration,
  context,
  strategy
);
```

### Global Error Handling

**Unhandled Promise Rejections**
```typescript
process.on('unhandledRejection', (reason, promise) => {
  globalErrorHandler.handleGlobalError(reason, {
    type: 'unhandledRejection',
    promise: promise.toString()
  });
});
```

**Graceful Degradation**
- Cache fallbacks for API failures
- Simplified scheduling when optimization fails
- Offline mode for critical functions

## Real-Time Collaboration

### WebSocket Architecture

**Connection Management**
```typescript
interface CollaborationSession {
  scheduleId: string;
  users: Map<string, UserSession>;
  locks: Map<string, LockInfo>;
  changeHistory: ChangeEvent[];
}
```

**Conflict Prevention**
- Optimistic locking for UI responsiveness
- Automatic conflict detection
- Real-time lock visualization
- Change propagation with operational transforms

### Operational Transform

**Change Operations**
```typescript
interface Operation {
  type: 'insert' | 'delete' | 'update';
  targetId: string;
  changes: Record<string, any>;
  timestamp: number;
  userId: string;
}
```

**Transform Algorithm**
```typescript
function transformOperation(op1: Operation, op2: Operation): Operation {
  // Resolve conflicts between concurrent operations
  // Ensure convergence and intention preservation
  return transformedOperation;
}
```

## Security Considerations

### Data Protection

**Input Validation**
- TypeScript type checking at compile time
- Runtime validation using Zod schemas
- SQL injection prevention with TypeORM
- XSS protection with content sanitization

**Authentication & Authorization**
- JWT-based authentication
- Role-based access control (RBAC)
- Session management
- API rate limiting

### Security Headers

```typescript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  next();
});
```

## Testing Strategy

### Test Architecture

**Unit Tests**
- Service layer testing with mocks
- Component testing with Vue Test Utils
- Algorithm testing with edge cases
- Utility function validation

**Integration Tests**
- API endpoint testing
- Database integration
- WebSocket communication
- End-to-end workflows

**Performance Tests**
- Load testing with concurrent users
- Memory leak detection
- Response time validation
- Scalability benchmarks

### Test Coverage

**Backend Coverage**
```
Services: 95%+ coverage
Models: 90%+ coverage
API Routes: 85%+ coverage
Utilities: 95%+ coverage
```

**Frontend Coverage**
```
Components: 85%+ coverage
Composables: 90%+ coverage
Stores: 85%+ coverage
Services: 90%+ coverage
```

## Deployment & Operations

### Environment Configuration

**Development Environment**
```typescript
const config = {
  database: {
    host: 'localhost',
    port: 5432,
    synchronize: true, // Auto-sync schema changes
    logging: true
  },
  cache: {
    enabled: false // Disable for development
  },
  performance: {
    monitoring: false
  }
};
```

**Production Environment**
```typescript
const config = {
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    synchronize: false, // Manual migrations only
    logging: false
  },
  cache: {
    enabled: true,
    redis: process.env.REDIS_URL
  },
  performance: {
    monitoring: true,
    alerts: true
  }
};
```

### Scaling Considerations

**Horizontal Scaling**
- Stateless application design
- Session data in external store
- Load balancer configuration
- Database connection pooling

**Vertical Scaling**
- Memory optimization
- CPU-intensive operation optimization
- Database query optimization
- Cache efficiency tuning

### Monitoring & Logging

**Application Metrics**
- Request/response times
- Error rates and types
- User session analytics
- Feature usage statistics

**Infrastructure Metrics**
- CPU and memory usage
- Database performance
- Network latency
- Disk I/O patterns

## Development Workflow

### Code Quality

**TypeScript Configuration**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**ESLint Rules**
- Consistent code formatting
- Import organization
- Type safety enforcement
- Performance best practices

**Git Workflow**
- Feature branch development
- Pull request reviews
- Automated testing
- Continuous integration

### Build Process

**Development Build**
```bash
# Start development servers
npm run dev:frontend  # Nuxt dev server with HMR
npm run dev:backend   # Express with nodemon
npm run dev:db        # PostgreSQL with Docker
```

**Production Build**
```bash
# Build optimized bundles
npm run build:frontend  # Static generation
npm run build:backend   # TypeScript compilation
npm run test:all        # Run all test suites
npm run lint:fix        # Fix linting issues
```

## Troubleshooting Guide

### Common Issues

**Performance Degradation**
1. Check memory usage and cache hit rates
2. Analyze database query performance
3. Review error logs for patterns
4. Monitor WebSocket connection stability

**Schedule Generation Failures**
1. Validate input data completeness
2. Check constraint conflicts
3. Review teacher availability
4. Verify group dependencies

**Real-time Sync Issues**
1. Check WebSocket connection status
2. Verify user permissions
3. Review operational transform logs
4. Clear client-side cache

### Debugging Tools

**Performance Profiling**
```typescript
// Enable detailed performance monitoring
const debugResult = await performanceMonitor.timeFunction(
  'debug_operation',
  operation,
  { debug: true, stackTrace: true }
);
```

**Database Query Analysis**
```typescript
// Enable query logging
const queryRunner = dataSource.createQueryRunner();
queryRunner.manager.query('EXPLAIN ANALYZE SELECT ...');
```

**Cache Analysis**
```typescript
// Get detailed cache statistics
const cacheReport = cacheService.getHealthReport();
console.log('Cache efficiency:', cacheReport.overall.totalHitRate);
```

## API Reference

### TypeScript Interfaces

**Core Data Types**
```typescript
interface Course {
  id: string;
  subjectId: string;
  teacherId: string | null;
  groupIds: string[];
  weeklyHours: number;
  numberOfLessons: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Teacher {
  id: string;
  name: string;
  subjectIds: string[];
  workingHours: {
    start: string;
    end: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface Schedule {
  id: string;
  name: string;
  weekNumber: number;
  year: number;
  status: 'draft' | 'active' | 'archived';
  lessons?: Lesson[];
  createdAt: Date;
  updatedAt: Date;
}

interface Lesson {
  id: string;
  courseId: string;
  teacherId: string;
  scheduleId: string;
  roomId: string | null;
  dayOfWeek: number; // 0 = Monday, 6 = Sunday
  startTime: string; // HH:MM format
  duration: number; // minutes
  createdAt: Date;
  updatedAt: Date;
}
```

**Performance Types**
```typescript
interface PerformanceMetrics {
  timestamp: number;
  operation: string;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  errorCount: number;
  successCount: number;
  metadata?: Record<string, any>;
}

interface OptimizationMetrics {
  generationTime: number;
  constraintsSatisfied: number;
  conflictsResolved: number;
  optimizationScore: number;
  memoryUsed: number;
}
```

### Error Codes

**HTTP Status Codes**
- `200`: Success
- `201`: Created successfully
- `400`: Bad request (validation error)
- `401`: Unauthorized
- `403`: Forbidden (insufficient permissions)
- `404`: Resource not found
- `409`: Conflict (scheduling conflict)
- `422`: Unprocessable entity (constraint violation)
- `500`: Internal server error
- `503`: Service unavailable (temporary)

**Custom Error Codes**
- `SCHEDULE_GENERATION_FAILED`: Cannot generate valid schedule
- `CONSTRAINT_VIOLATION`: Scheduling rule violated
- `TEACHER_CONFLICT`: Teacher double-booked
- `GROUP_CONFLICT`: Group double-booked
- `INSUFFICIENT_TIME_SLOTS`: Not enough available time
- `OPTIMIZATION_TIMEOUT`: Generation took too long

## Contributing

### Development Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd schedule-builder
   ```

2. **Install Dependencies**
   ```bash
   # Backend dependencies
   cd backend && npm install
   
   # Frontend dependencies
   cd ../frontend && npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment templates
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

4. **Database Setup**
   ```bash
   # Start PostgreSQL with Docker
   docker-compose up -d postgres
   
   # Run migrations
   cd backend && npm run migration:run
   ```

5. **Start Development**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

### Code Standards

**Commit Message Format**
```
type(scope): description

Examples:
feat(schedule): add optimized generation algorithm
fix(api): resolve teacher conflict validation
docs(readme): update installation instructions
test(unit): add cache service tests
```

**Pull Request Process**
1. Create feature branch from `main`
2. Implement changes with tests
3. Ensure all tests pass
4. Update documentation if needed
5. Submit pull request with description
6. Address review feedback
7. Merge after approval

This technical documentation provides comprehensive coverage of the Schedule Builder's architecture, implementation details, and operational considerations. For specific implementation questions or advanced customization, please refer to the source code or contact the development team."