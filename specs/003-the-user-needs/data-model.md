# Entity Management Data Model

## Updated Entity Definitions

### Group (Updated from 001-schedule-builder)
```typescript
interface Group {
  id: string;
  name: string;
  classIds: string[];              // UPDATED: Support multiple classes (many-to-many)
  dependentGroupIds: string[];     // groups that can't have concurrent lessons
  size?: number;                   // NEW: Optional group size for capacity planning
  academicLevel?: string;          // NEW: Optional academic level (e.g., "Beginner", "Advanced")
  createdAt: Date;
  updatedAt: Date;
}
```

### Teacher (From 001-schedule-builder)
```typescript
interface Teacher {
  id: string;
  name: string;
  subjectIds: string[];            // subjects they can teach
  workingHours: {
    start: string;                 // HH:mm format, default: "08:15"
    end: string;                  // HH:mm format, default: "16:00"
  };
  availabilityExceptions?: AvailabilityException[];  // NEW: Calendar-based constraints
  maxWeeklyHours?: number;         // NEW: Optional teaching capacity limit
  createdAt: Date;
  updatedAt: Date;
}

interface AvailabilityException {
  date: string;                    // YYYY-MM-DD format
  type: 'unavailable' | 'limited';
  startTime?: string;              // HH:mm format (for limited availability)
  endTime?: string;                // HH:mm format (for limited availability)
  reason?: string;                 // Optional description
}
```

### Subject (From 001-schedule-builder)
```typescript
interface Subject {
  id: string;
  name: string;
  breakDuration: number;           // in minutes, default: 10
  creditHours?: number;            // NEW: Optional academic credit value
  prerequisites?: string[];        // NEW: Optional prerequisite subject IDs
  createdAt: Date;
  updatedAt: Date;
}
```

### Course (From 001-schedule-builder)
```typescript
interface Course {
  id: string;
  subjectId: string;
  teacherId: string | null;        // null if auto-assigned
  groupIds: string[];
  weeklyHours: number;             // default: 3
  numberOfLessons: number;         // default: 2
  duration?: number;               // NEW: Optional lesson duration override
  resourceRequirements?: string[]; // NEW: Optional room/equipment requirements
  createdAt: Date;
  updatedAt: Date;
}
```

### Class (From 001-schedule-builder)
```typescript
interface Class {
  id: string;
  name: string;
  lunchDuration: number;           // in minutes, default: 30
  academicYear?: string;           // NEW: Optional academic year (e.g., "2024-2025")
  level?: string;                  // NEW: Optional class level (e.g., "Grade 10", "Intermediate")
  createdAt: Date;
  updatedAt: Date;
}
```

## Entity Relationships

### Updated Relationships
- **Group ↔ Class**: Many-to-many (UPDATED from one-to-many)
  - Junction table: `group_classes` with columns `group_id`, `class_id`
- **Teacher ↔ Subject**: Many-to-many (existing)
- **Course → Groups**: One-to-many (existing)
- **Course → Teacher**: Many-to-one (existing)
- **Course → Subject**: Many-to-one (existing)

### Relationship Constraints
1. **Group-Class Relationships**:
   - A group can belong to multiple classes
   - A class can contain multiple groups
   - Deletion cascading: Removing class removes group-class relationships

2. **Teacher-Subject Qualifications**:
   - Teachers can only be assigned to courses for subjects they're qualified for
   - Adding/removing subject qualifications affects available course assignments

3. **Course Dependencies**:
   - Course must have valid subject and at least one group
   - Teacher assignment optional (can be auto-assigned during scheduling)
   - Course duration inherits from subject if not specified

## Frontend-Specific Data Structures

### Entity Management State
```typescript
interface EntityState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  selectedIds: string[];
  searchQuery: string;
  filters: Record<string, any>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

interface EntitiesStore {
  groups: EntityState<Group>;
  teachers: EntityState<Teacher>;
  subjects: EntityState<Subject>;
  courses: EntityState<Course>;
  classes: EntityState<Class>;
  relationships: {
    groupClasses: GroupClass[];
    teacherSubjects: TeacherSubject[];
    courseGroups: CourseGroup[];
  };
}
```

### Form Validation Rules
```typescript
interface ValidationRule {
  field: string;
  type: 'required' | 'pattern' | 'custom';
  message: string;
  validator?: (value: any, entity: any) => boolean;
}

const EntityValidationRules: Record<string, ValidationRule[]> = {
  group: [
    { field: 'name', type: 'required', message: 'Group name is required' },
    { field: 'classIds', type: 'custom', message: 'At least one class must be selected', 
      validator: (classIds) => Array.isArray(classIds) && classIds.length > 0 }
  ],
  teacher: [
    { field: 'name', type: 'required', message: 'Teacher name is required' },
    { field: 'subjectIds', type: 'custom', message: 'At least one subject qualification required',
      validator: (subjectIds) => Array.isArray(subjectIds) && subjectIds.length > 0 }
  ],
  subject: [
    { field: 'name', type: 'required', message: 'Subject name is required' },
    { field: 'breakDuration', type: 'custom', message: 'Break duration must be positive',
      validator: (duration) => typeof duration === 'number' && duration > 0 }
  ],
  course: [
    { field: 'subjectId', type: 'required', message: 'Subject is required' },
    { field: 'groupIds', type: 'custom', message: 'At least one group must be selected',
      validator: (groupIds) => Array.isArray(groupIds) && groupIds.length > 0 }
  ],
  class: [
    { field: 'name', type: 'required', message: 'Class name is required' }
  ]
};
```

### Bulk Operation Structures
```typescript
interface BulkOperation {
  id: string;
  type: 'import' | 'export' | 'delete' | 'update';
  entityType: 'groups' | 'teachers' | 'subjects' | 'courses' | 'classes';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  totalItems: number;
  processedItems: number;
  errors: BulkOperationError[];
  createdAt: Date;
}

interface BulkOperationError {
  row?: number;
  entityId?: string;
  field?: string;
  message: string;
  severity: 'warning' | 'error';
}

interface ImportMapping {
  entityType: string;
  fieldMappings: Record<string, string>; // CSV column -> entity field
  validation: ValidationRule[];
  sampleData: any[];
}
```

## Database Migration Requirements

### Group-Class Relationship Update
```sql
-- Remove existing classId column from groups table
ALTER TABLE groups DROP COLUMN class_id;

-- Create junction table for many-to-many relationship
CREATE TABLE group_classes (
  group_id VARCHAR(36) NOT NULL,
  class_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, class_id),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_group_classes_group ON group_classes(group_id);
CREATE INDEX idx_group_classes_class ON group_classes(class_id);

-- Add optional new fields to existing tables
ALTER TABLE groups ADD COLUMN size INTEGER DEFAULT NULL;
ALTER TABLE groups ADD COLUMN academic_level VARCHAR(100) DEFAULT NULL;

ALTER TABLE teachers ADD COLUMN max_weekly_hours INTEGER DEFAULT NULL;

ALTER TABLE subjects ADD COLUMN credit_hours INTEGER DEFAULT NULL;

ALTER TABLE courses ADD COLUMN duration INTEGER DEFAULT NULL;

ALTER TABLE classes ADD COLUMN academic_year VARCHAR(20) DEFAULT NULL;
ALTER TABLE classes ADD COLUMN level VARCHAR(100) DEFAULT NULL;

-- Create table for teacher availability exceptions
CREATE TABLE teacher_availability_exceptions (
  id VARCHAR(36) PRIMARY KEY,
  teacher_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  type ENUM('unavailable', 'limited') NOT NULL,
  start_time TIME DEFAULT NULL,
  end_time TIME DEFAULT NULL,
  reason TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

CREATE INDEX idx_teacher_availability_teacher ON teacher_availability_exceptions(teacher_id);
CREATE INDEX idx_teacher_availability_date ON teacher_availability_exceptions(date);
```

## API Updates Required

### Minimal Backend Changes
1. **Group endpoints**: Update to handle `classIds` array instead of single `classId`
2. **Teacher endpoints**: Add support for availability exceptions
3. **Validation updates**: Update relationship validation for new many-to-many structure

### New API Endpoints (if missing)
```typescript
// Entity CRUD endpoints (if not already implemented)
GET    /api/groups
POST   /api/groups
PUT    /api/groups/:id
DELETE /api/groups/:id

GET    /api/teachers
POST   /api/teachers
PUT    /api/teachers/:id
DELETE /api/teachers/:id

GET    /api/subjects
POST   /api/subjects
PUT    /api/subjects/:id
DELETE /api/subjects/:id

GET    /api/courses
POST   /api/courses
PUT    /api/courses/:id
DELETE /api/courses/:id

GET    /api/classes
POST   /api/classes
PUT    /api/classes/:id
DELETE /api/classes/:id

// Bulk operations
POST   /api/bulk/import
GET    /api/bulk/export
POST   /api/bulk/validate

// Relationship management
GET    /api/relationships/groups/:id/classes
POST   /api/relationships/groups/:id/classes
DELETE /api/relationships/groups/:groupId/classes/:classId
```

## Data Consistency Rules

### Frontend Validation
1. **Cross-entity validation**: Prevent invalid relationship assignments
2. **Cascading updates**: Update dependent entities when relationships change
3. **Optimistic updates**: Immediate UI feedback with rollback on API failure
4. **Conflict resolution**: Handle concurrent edits gracefully

### Backend Validation (Minimal Updates)
1. **Relationship integrity**: Ensure all foreign keys are valid
2. **Business rules**: Enforce teacher qualifications and scheduling constraints
3. **Data format validation**: Validate time formats, numeric ranges, etc.

This data model extends the existing 001-schedule-builder structure with minimal backend changes while enabling comprehensive frontend entity management.