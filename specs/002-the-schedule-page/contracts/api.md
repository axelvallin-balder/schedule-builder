# API Contracts for Calendar Schedule Display

## Overview
This feature leverages existing API endpoints from 001-schedule-builder without requiring backend changes. All necessary data is available through current REST endpoints.

## API Endpoints (Existing)

### GET /api/schedules
**Purpose**: Retrieve available schedules for dropdown selection

**Response**:
```typescript
{
  success: boolean;
  data: Schedule[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  }
}
```

**Query Parameters**:
- `status?: 'draft' | 'active' | 'archived'` - Filter by schedule status
- `limit?: number` - Pagination limit (default: 50)
- `page?: number` - Pagination page (default: 1)

**Frontend Usage**:
```typescript
// Load active schedules for dropdown
const response = await api.get('/api/schedules?status=active&limit=10');
const schedules: ScheduleOption[] = response.data.map(schedule => ({
  id: schedule.id,
  name: schedule.name,
  status: schedule.status,
  weekNumber: schedule.weekNumber,
  year: schedule.year,
  isDefault: schedule.status === 'active' // logic for default selection
}));
```

### GET /api/schedules/:id
**Purpose**: Retrieve specific schedule with lessons for calendar display

**Response**:
```typescript
{
  success: boolean;
  data: {
    id: string;
    name: string;
    weekNumber: number;
    year: number;
    status: string;
    lessons: Lesson[];
    createdAt: string;
    updatedAt: string;
  }
}
```

**Frontend Usage**:
```typescript
// Load complete schedule data for calendar
const response = await api.get(`/api/schedules/${scheduleId}`);
const schedule = response.data;
// Transform lessons to CalendarLesson view models
```

### GET /api/classes
**Purpose**: Retrieve available classes for dropdown selection

**Response**:
```typescript
{
  success: boolean;
  data: Class[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  }
}
```

**Frontend Usage**:
```typescript
// Load classes for dropdown with group count
const response = await api.get('/api/classes');
const classOptions: ClassOption[] = await Promise.all(
  response.data.map(async (cls) => {
    const groupsResponse = await api.get(`/api/groups?classId=${cls.id}`);
    return {
      id: cls.id,
      name: cls.name,
      groupCount: groupsResponse.data.length,
      searchText: cls.name.toLowerCase()
    };
  })
);
```

### GET /api/groups
**Purpose**: Retrieve groups for selected class to organize lessons

**Query Parameters**:
- `classId: string` - Required filter by class ID

**Response**:
```typescript
{
  success: boolean;
  data: Group[];
}
```

**Frontend Usage**:
```typescript
// Load groups for selected class
const response = await api.get(`/api/groups?classId=${classId}`);
const groups = response.data;
// Use for lesson organization and groupNames display
```

### GET /api/courses
**Purpose**: Retrieve course details to link lessons with subjects and groups

**Query Parameters**:
- `groupIds?: string[]` - Filter by group IDs (comma-separated)

**Response**:
```typescript
{
  success: boolean;
  data: Course[];
}
```

**Frontend Usage**:
```typescript
// Load courses for calendar lesson enrichment
const groupIds = groups.map(g => g.id).join(',');
const response = await api.get(`/api/courses?groupIds=${groupIds}`);
const courses = response.data;
// Map courseId to subject and group information
```

### GET /api/teachers
**Purpose**: Retrieve teacher information for lesson display

**Response**:
```typescript
{
  success: boolean;
  data: Teacher[];
}
```

**Frontend Usage**:
```typescript
// Load all teachers (or filter by IDs from lessons)
const response = await api.get('/api/teachers');
const teachers = response.data;
// Map teacherId to teacher name for lesson cards
```

### GET /api/subjects
**Purpose**: Retrieve subject information for lesson display

**Response**:
```typescript
{
  success: boolean;
  data: Subject[];
}
```

**Frontend Usage**:
```typescript
// Load all subjects
const response = await api.get('/api/subjects');
const subjects = response.data;
// Map subjectId to subject name for lesson cards
```

## Frontend API Integration Patterns

### Data Loading Strategy
```typescript
// Optimized loading sequence for calendar display
class CalendarDataLoader {
  async loadCalendarData(scheduleId: string, classId: string): Promise<CalendarWeek> {
    // 1. Load primary data in parallel
    const [scheduleResponse, groupsResponse] = await Promise.all([
      api.get(`/api/schedules/${scheduleId}`),
      api.get(`/api/groups?classId=${classId}`)
    ]);
    
    const schedule = scheduleResponse.data;
    const groups = groupsResponse.data;
    
    // 2. Load related data for lesson enrichment
    const [coursesResponse, teachersResponse, subjectsResponse] = await Promise.all([
      api.get(`/api/courses?groupIds=${groups.map(g => g.id).join(',')}`),
      api.get('/api/teachers'),
      api.get('/api/subjects')
    ]);
    
    // 3. Transform to view models
    return this.transformToCalendarWeek(schedule, groups, coursesResponse.data, teachersResponse.data, subjectsResponse.data);
  }
}
```

### Error Handling Contract
```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: any;
  }
}

// Standard error handling for calendar API calls
const handleCalendarApiError = (error: ApiErrorResponse) => {
  switch (error.error.code) {
    case 'SCHEDULE_NOT_FOUND':
      return 'Selected schedule no longer exists';
    case 'CLASS_NOT_FOUND':
      return 'Selected class no longer exists';
    case 'NETWORK_ERROR':
      return 'Unable to load calendar data. Please check your connection.';
    default:
      return 'An unexpected error occurred loading the calendar';
  }
};
```

### Caching Strategy
```typescript
// Cache configuration for calendar data
interface CacheConfig {
  scheduleOptions: { ttl: 300000 }; // 5 minutes
  classOptions: { ttl: 600000 };   // 10 minutes
  teachers: { ttl: 3600000 };       // 1 hour
  subjects: { ttl: 3600000 };       // 1 hour
  scheduleData: { ttl: 60000 };     // 1 minute (more dynamic)
}
```

## Data Transformation Contracts

### Lesson Enrichment Pipeline
```typescript
interface LessonEnrichmentInput {
  lesson: Lesson;
  course: Course;
  teacher: Teacher;
  subject: Subject;
  groups: Group[];
}

interface LessonEnrichmentOutput {
  calendarLesson: CalendarLesson;
  gridPosition: {
    rowStart: number;
    rowSpan: number;
    position: number;
  };
}

// Contract for transforming raw lesson data to calendar display format
const enrichLessonForCalendar = (input: LessonEnrichmentInput): LessonEnrichmentOutput => {
  // Implementation transforms lesson + related data to CalendarLesson
  // Calculates grid positioning for CSS Grid layout
  // Returns enriched lesson with display properties
};
```

### Time Slot Generation Contract
```typescript
interface TimeSlotGenerationInput {
  lessons: CalendarLesson[];
  timeRange: { start: string; end: string }; // '08:00' to '16:00'
  slotDuration: number; // 15 minutes default
}

interface TimeSlotGenerationOutput {
  timeSlots: CalendarTimeSlot[];
  conflictingSlots: number; // count of slots with multiple lessons
}

// Contract for generating calendar grid time slots
const generateTimeSlots = (input: TimeSlotGenerationInput): TimeSlotGenerationOutput => {
  // Implementation creates time grid with lesson placement
  // Handles overlapping lessons in same time period
  // Returns structured time slots for calendar rendering
};
```

## Performance Contracts

### Response Time Targets
- **Schedule Options Loading**: < 500ms
- **Class Options Loading**: < 500ms
- **Complete Calendar Data**: < 2000ms (initial load)
- **Calendar Refresh**: < 1000ms (schedule/class change)

### Data Size Limits
- **Schedules per request**: Maximum 50 items
- **Classes per request**: Maximum 100 items
- **Lessons per schedule**: Maximum 500 items (typical week)
- **Groups per class**: Maximum 20 items

### Optimization Strategies
- **Parallel Loading**: Load independent data simultaneously
- **Selective Loading**: Only load teachers/subjects referenced by lessons
- **Response Caching**: Cache stable data (teachers, subjects, classes)
- **Incremental Updates**: Reload only changed data on selection change

This contract specification ensures efficient use of existing APIs while maintaining performance requirements for the calendar display feature.