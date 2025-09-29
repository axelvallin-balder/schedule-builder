# Schedule Builder API Contracts

## REST Endpoints

### Courses

#### GET /api/courses
List all courses
```typescript
Response {
  courses: Course[];
  total: number;
  page: number;
  pageSize: number;
}
```

#### POST /api/courses
Create a new course
```typescript
Request {
  subjectId: string;
  teacherId?: string;
  groupIds: string[];
  weeklyHours?: number;
  numberOfLessons?: number;
}

Response {
  course: Course;
}
```

### Teachers

#### GET /api/teachers
List all teachers
```typescript
Response {
  teachers: Teacher[];
  total: number;
  page: number;
  pageSize: number;
}
```

#### POST /api/teachers
Create a new teacher
```typescript
Request {
  name: string;
  subjectIds: string[];
  workingHours?: {
    start: string;
    end: string;
  };
}

Response {
  teacher: Teacher;
}
```

### Groups

#### GET /api/groups
List all groups
```typescript
Response {
  groups: Group[];
  total: number;
  page: number;
  pageSize: number;
}
```

#### POST /api/groups
Create a new group
```typescript
Request {
  name: string;
  classId: string;
  dependentGroupIds?: string[];
}

Response {
  group: Group;
}
```

### Schedules

#### GET /api/schedules
List all schedules
```typescript
Response {
  schedules: Schedule[];
  total: number;
  page: number;
  pageSize: number;
}
```

#### POST /api/schedules/generate
Generate a new schedule
```typescript
Request {
  name: string;
  weekNumber: number;
  year: number;
}

Response {
  schedule: Schedule;
  status: 'success' | 'partial' | 'failed';
  messages: string[];
}
```

#### POST /api/schedules/{id}/alternatives
Generate alternative schedules
```typescript
Request {
  count?: number;  // default: 1, max: 5
}

Response {
  schedules: Schedule[];
  status: 'success' | 'partial' | 'failed';
  messages: string[];
}
```

## WebSocket Events

### Client -> Server

#### subscribe
```typescript
{
  type: 'subscribe';
  scheduleId: string;
}
```

#### unsubscribe
```typescript
{
  type: 'unsubscribe';
  scheduleId: string;
}
```

#### updateLesson
```typescript
{
  type: 'updateLesson';
  scheduleId: string;
  lessonId: string;
  changes: {
    startTime?: string;
    duration?: number;
    teacherId?: string;
    roomId?: string;
  };
}
```

### Server -> Client

#### lessonUpdated
```typescript
{
  type: 'lessonUpdated';
  scheduleId: string;
  lesson: Lesson;
  updatedBy: string;
}
```

#### scheduleValidation
```typescript
{
  type: 'scheduleValidation';
  scheduleId: string;
  issues: {
    type: 'error' | 'warning';
    message: string;
    affectedIds: string[];
  }[];
}
```

#### userPresence
```typescript
{
  type: 'userPresence';
  scheduleId: string;
  users: {
    id: string;
    name: string;
    status: 'active' | 'idle';
  }[];
}
```

## Error Responses

### 400 Bad Request
```typescript
{
  error: string;
  details?: {
    field: string;
    message: string;
  }[];
}
```

### 404 Not Found
```typescript
{
  error: string;
  resourceType: string;
  resourceId: string;
}
```

### 409 Conflict
```typescript
{
  error: string;
  conflicts: {
    type: string;
    message: string;
    entities: string[];
  }[];
}
```

## Rate Limits

- 100 requests per minute per IP for REST endpoints
- 10 schedule generations per hour per user
- 60 WebSocket messages per minute per client