# Calendar Schedule Display Data Model

## Overview
This feature extends the existing data model from 001-schedule-builder without requiring backend changes. All entities are already defined and available via existing APIs.

## Existing Entities (from 001-schedule-builder)

### Schedule
```typescript
interface Schedule {
  id: string;
  name: string;
  weekNumber: number;
  year: number;
  status: 'draft' | 'active' | 'archived';
  lessons: Lesson[];
  createdAt: Date;
  updatedAt: Date;
}
```
**Usage**: Primary entity for schedule selection dropdown. Filter by `status: 'active'` for default selection.

### Class
```typescript
interface Class {
  id: string;
  name: string;
  lunchDuration: number;    // in minutes, default: 30
  createdAt: Date;
  updatedAt: Date;
}
```
**Usage**: Used in class selector dropdown. Display name for user selection.

### Group
```typescript
interface Group {
  id: string;
  name: string;
  classId: string;
  dependentGroupIds: string[];  // groups that can't have concurrent lessons
  createdAt: Date;
  updatedAt: Date;
}
```
**Usage**: Groups within selected class determine lesson organization. Multiple groups may have overlapping lessons requiring side-by-side display.

### Lesson
```typescript
interface Lesson {
  id: string;
  courseId: string;
  teacherId: string;
  dayOfWeek: number;      // 1-5 (Monday-Friday)
  startTime: string;      // HH:mm format
  duration: number;       // in minutes, minimum: 45
  roomId: string | null;  // optional
  createdAt: Date;
  updatedAt: Date;
}
```
**Usage**: Core calendar display data. Positioned on grid using `dayOfWeek`, `startTime`, and `duration`.

### Course
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
```
**Usage**: Linked via `lesson.courseId` to get subject and group information for lesson display.

### Teacher
```typescript
interface Teacher {
  id: string;
  name: string;
  subjectIds: string[];
  workingHours: {
    start: string;          // HH:mm format
    end: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```
**Usage**: Linked via `lesson.teacherId` to display teacher name on lesson cards.

### Subject
```typescript
interface Subject {
  id: string;
  name: string;
  breakDuration: number;    // in minutes, default: 10
  createdAt: Date;
  updatedAt: Date;
}
```
**Usage**: Linked via `course.subjectId` to display subject name on lesson cards.

## Frontend-Only View Models

### CalendarTimeSlot
```typescript
interface CalendarTimeSlot {
  startTime: string;        // HH:mm format
  endTime: string;          // HH:mm format
  dayOfWeek: number;        // 1-5 (Monday-Friday)
  lessons: CalendarLesson[]; // lessons in this slot
  isEmpty: boolean;
}
```
**Purpose**: Represents a single calendar grid cell with all lessons occurring in that time period.

### CalendarLesson
```typescript
interface CalendarLesson {
  id: string;
  subjectName: string;      // from Subject entity
  teacherName: string;      // from Teacher entity
  groupNames: string[];     // from Group entities via Course
  startTime: string;        // HH:mm format
  duration: number;         // in minutes
  roomId: string | null;
  dayOfWeek: number;
  // UI-specific properties
  gridRowStart: number;     // CSS grid positioning
  gridRowSpan: number;      // CSS grid span
  position: number;         // horizontal position for overlapping lessons
}
```
**Purpose**: Enriched lesson data with all display information pre-computed for calendar rendering.

### CalendarWeek
```typescript
interface CalendarWeek {
  scheduleId: string;
  scheduleName: string;
  className: string;
  timeSlots: CalendarTimeSlot[];
  days: CalendarDay[];
  isEmpty: boolean;
}
```
**Purpose**: Complete calendar view data for a specific schedule/class combination.

### CalendarDay
```typescript
interface CalendarDay {
  dayOfWeek: number;        // 1-5 (Monday-Friday)
  dayName: string;          // 'Monday', 'Tuesday', etc.
  date: string;             // ISO date string
  lessons: CalendarLesson[];
  isEmpty: boolean;
}
```
**Purpose**: Single day view for responsive mobile layout.

### ClassOption
```typescript
interface ClassOption {
  id: string;
  name: string;
  groupCount: number;       // number of groups in class
  searchText: string;       // for dropdown filtering
}
```
**Purpose**: Optimized data for searchable class selector dropdown.

### ScheduleOption
```typescript
interface ScheduleOption {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'archived';
  weekNumber: number;
  year: number;
  isDefault: boolean;       // true for latest active schedule
}
```
**Purpose**: Options for schedule selector dropdown.

## Data Relationships

### Calendar View Data Flow
1. **Schedule Selection**: User selects from `ScheduleOption[]`
2. **Class Selection**: User selects from `ClassOption[]`  
3. **Data Loading**: 
   - Load selected `Schedule` with `lessons[]`
   - Load `Groups[]` for selected class
   - Load related `Courses[]`, `Teachers[]`, `Subjects[]`
4. **View Model Generation**:
   - Transform `Lesson[]` to `CalendarLesson[]` with display properties
   - Group lessons by time slots to create `CalendarTimeSlot[]`
   - Build complete `CalendarWeek` view model

### Data Validation Rules
- **Time Constraints**: All lessons must fall within 8:00-16:00 display range
- **Day Constraints**: Only Monday-Friday (dayOfWeek 1-5) lessons displayed
- **Duration**: Minimum 45-minute lesson duration (from existing model)
- **Overlap Handling**: Multiple lessons in same time slot positioned side-by-side

### Performance Considerations
- **Computed Properties**: Use Vue computed properties for view model transformation
- **Memoization**: Cache time slot calculations to avoid recalculation
- **Lazy Loading**: Load lesson details (teacher/subject names) only when needed
- **Pagination**: For classes with many groups, consider virtual scrolling

## State Management

### Calendar Store State
```typescript
interface CalendarState {
  selectedScheduleId: string | null;
  selectedClassId: string | null;
  availableSchedules: ScheduleOption[];
  availableClasses: ClassOption[];
  currentCalendarWeek: CalendarWeek | null;
  isLoading: boolean;
  error: string | null;
  // UI state
  viewMode: 'week' | 'day';
  selectedDay: number; // for mobile day view
}
```

### Store Actions
- `loadScheduleOptions()`: Fetch available schedules
- `loadClassOptions()`: Fetch available classes
- `selectSchedule(scheduleId)`: Set selected schedule and reload calendar
- `selectClass(classId)`: Set selected class and reload calendar
- `generateCalendarWeek()`: Transform loaded data to view model
- `setViewMode(mode)`: Switch between week/day view for responsive

This data model leverages the existing backend without requiring changes while providing optimized frontend view models for efficient calendar rendering.