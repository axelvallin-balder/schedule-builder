// Entity Management TypeScript Interfaces
// Based on data-model.md specifications

// Base entity interface for common fields
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Group entity - updated to support many-to-many with classes
export interface Group extends BaseEntity {
  name: string;
  classIds: string[];              // UPDATED: Support multiple classes (many-to-many)
  dependentGroupIds: string[];     // groups that can't have concurrent lessons
  size?: number;                   // Optional group size for capacity planning
  academicLevel?: string;          // Optional academic level (e.g., "Beginner", "Advanced")
  notes?: string;                  // Optional notes field
}

// Teacher availability exception
export interface AvailabilityException {
  date: string;                    // YYYY-MM-DD format
  type: 'unavailable' | 'limited';
  startTime?: string;              // HH:mm format (for limited availability)
  endTime?: string;                // HH:mm format (for limited availability)
  reason?: string;                 // Optional description
}

// Teacher entity with calendar-based constraints
export interface Teacher extends BaseEntity {
  name: string;
  email: string;                   // unique email identifier
  subjectIds: string[];            // subjects they can teach
  availability: {
    dayOfWeek: number;             // 0 = Sunday, 1 = Monday, etc.
    startTime: string;             // HH:mm format
    endTime: string;               // HH:mm format
  }[];
  availabilityExceptions?: AvailabilityException[];  // Calendar-based constraints
  maxWeeklyHours?: number;         // Optional teaching capacity limit
}

// Subject entity
export interface Subject extends BaseEntity {
  name: string;
  breakDuration: number;           // in minutes, default: 10
  creditHours?: number;            // Optional academic credit value
  prerequisites?: string[];        // Optional prerequisite subject IDs
}

// Course entity
export interface Course extends BaseEntity {
  subjectId: string;
  teacherId: string | null;        // null if auto-assigned
  groupIds: string[];
  weeklyHours: number;             // default: 3
  numberOfLessons: number;         // default: 2
  duration?: number;               // Optional lesson duration override
  resourceRequirements?: string[]; // Optional room/equipment requirements
}

// Class entity
export interface Class extends BaseEntity {
  name: string;
  lunchDuration: number;           // in minutes, default: 30
  academicYear?: string;           // Optional academic year (e.g., "2024-2025")
  level?: string;                  // Optional class level (e.g., "Grade 10", "Intermediate")
}

// Entity state management interfaces
export interface EntityState<T> {
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

// Create and update request interfaces (exclude BaseEntity fields)
export interface GroupCreateRequest {
  name: string;
  classIds: string[];
  dependentGroupIds?: string[];
  size?: number;
  academicLevel?: string;
  notes?: string;
}

export interface GroupUpdateRequest {
  name?: string;
  classIds?: string[];
  dependentGroupIds?: string[];
  size?: number;
  academicLevel?: string;
  notes?: string;
}

export interface TeacherCreateRequest {
  name: string;
  subjectIds: string[];
  workingHours: {
    start: string;
    end: string;
  };
  availabilityExceptions?: AvailabilityException[];
  maxWeeklyHours?: number;
}

export interface TeacherUpdateRequest {
  name?: string;
  subjectIds?: string[];
  workingHours?: {
    start: string;
    end: string;
  };
  availabilityExceptions?: AvailabilityException[];
  maxWeeklyHours?: number;
}

export interface SubjectCreateRequest {
  name: string;
  breakDuration: number;
  creditHours?: number;
  prerequisites?: string[];
}

export interface SubjectUpdateRequest {
  name?: string;
  breakDuration?: number;
  creditHours?: number;
  prerequisites?: string[];
}

export interface CourseCreateRequest {
  subjectId: string;
  teacherId?: string | null;
  groupIds: string[];
  weeklyHours: number;
  numberOfLessons: number;
  duration?: number;
  resourceRequirements?: string[];
}

export interface CourseUpdateRequest {
  subjectId?: string;
  teacherId?: string | null;
  groupIds?: string[];
  weeklyHours?: number;
  numberOfLessons?: number;
  duration?: number;
  resourceRequirements?: string[];
}

export interface ClassCreateRequest {
  name: string;
  lunchDuration: number;
  academicYear?: string;
  level?: string;
}

export interface ClassUpdateRequest {
  name?: string;
  lunchDuration?: number;
  academicYear?: string;
  level?: string;
}

// API response interfaces
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Bulk operation interfaces
export interface BulkOperation {
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

export interface BulkOperationError {
  row?: number;
  entityId?: string;
  field?: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface ImportMapping {
  entityType: string;
  fieldMappings: Record<string, string>; // CSV column -> entity field
  sampleData: any[];
}

// Form and validation interfaces
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'textarea' | 'time' | 'date';
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  helpText?: string;
}

// Relationship interfaces
export interface GroupClass {
  groupId: string;
  classId: string;
  createdAt: Date;
}

export interface TeacherSubject {
  teacherId: string;
  subjectId: string;
  createdAt: Date;
}

export interface CourseGroup {
  courseId: string;
  groupId: string;
  createdAt: Date;
}

// Entity type union for generic operations
export type Entity = Group | Teacher | Subject | Course | Class;
export type EntityType = 'groups' | 'teachers' | 'subjects' | 'courses' | 'classes';

// Navigation and UI interfaces
export interface EntityTab {
  key: EntityType;
  label: string;
  icon?: string;
  count?: number;
}

export interface EntityAction {
  key: string;
  label: string;
  icon?: string;
  handler: (entity: Entity) => void;
  visible?: (entity: Entity) => boolean;
  disabled?: (entity: Entity) => boolean;
}

// Search and filter interfaces
export interface SearchOptions {
  query: string;
  entityTypes: EntityType[];
  filters: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'range' | 'date';
  options?: { value: any; label: string }[];
}

// Export these interfaces for use in components and stores