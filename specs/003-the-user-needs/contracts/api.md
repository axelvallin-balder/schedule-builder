# API Contracts for Entity Management

## Entity CRUD Operations

### Groups API

#### List Groups
```http
GET /api/groups?page=1&limit=50&search=&classId=
```

**Response:**
```typescript
{
  data: Group[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### Create Group
```http
POST /api/groups
Content-Type: application/json

{
  name: string;
  classIds: string[];
  dependentGroupIds?: string[];
  size?: number;
  academicLevel?: string;
}
```

**Response:**
```typescript
{
  data: Group;
  message: string;
}
```

#### Update Group
```http
PUT /api/groups/:id
Content-Type: application/json

{
  name?: string;
  classIds?: string[];
  dependentGroupIds?: string[];
  size?: number;
  academicLevel?: string;
}
```

#### Delete Group
```http
DELETE /api/groups/:id
```

**Response:**
```typescript
{
  message: string;
  cascadedDeletions?: {
    courseGroups: number;
    groupClasses: number;
  };
}
```

### Teachers API

#### List Teachers
```http
GET /api/teachers?page=1&limit=50&search=&subjectId=
```

#### Create Teacher
```http
POST /api/teachers
Content-Type: application/json

{
  name: string;
  subjectIds: string[];
  workingHours: {
    start: string; // "HH:mm"
    end: string;   // "HH:mm"
  };
  maxWeeklyHours?: number;
  availabilityExceptions?: AvailabilityException[];
}
```

#### Update Teacher Availability
```http
PUT /api/teachers/:id/availability
Content-Type: application/json

{
  exceptions: AvailabilityException[];
}
```

### Subjects API

#### List Subjects
```http
GET /api/subjects?page=1&limit=50&search=
```

#### Create Subject
```http
POST /api/subjects
Content-Type: application/json

{
  name: string;
  breakDuration: number;
  creditHours?: number;
  prerequisites?: string[];
}
```

### Courses API

#### List Courses
```http
GET /api/courses?page=1&limit=50&search=&subjectId=&teacherId=
```

#### Create Course
```http
POST /api/courses
Content-Type: application/json

{
  subjectId: string;
  teacherId?: string;
  groupIds: string[];
  weeklyHours: number;
  numberOfLessons: number;
  duration?: number;
  resourceRequirements?: string[];
}
```

### Classes API

#### List Classes
```http
GET /api/classes?page=1&limit=50&search=
```

#### Create Class
```http
POST /api/classes
Content-Type: application/json

{
  name: string;
  lunchDuration: number;
  academicYear?: string;
  level?: string;
}
```

## Bulk Operations API

### Import Entities
```http
POST /api/bulk/import
Content-Type: multipart/form-data

file: <Excel file>
entityType: "groups" | "teachers" | "subjects" | "courses" | "classes"
mapping: <JSON mapping configuration>
validateOnly: boolean
```

**Response:**
```typescript
{
  operationId: string;
  status: "processing" | "completed" | "failed";
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    created: number;
    updated: number;
    errors: BulkOperationError[];
  };
}
```

### Export Entities
```http
GET /api/bulk/export?entityType=groups&format=xlsx&includeRelationships=true
```

**Response:** Excel file download

### Bulk Operation Status
```http
GET /api/bulk/operations/:operationId
```

**Response:**
```typescript
{
  id: string;
  type: "import" | "export";
  entityType: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  totalItems: number;
  processedItems: number;
  errors: BulkOperationError[];
  createdAt: string;
  completedAt?: string;
}
```

## Relationship Management API

### Group-Class Relationships

#### Get Group Classes
```http
GET /api/groups/:id/classes
```

**Response:**
```typescript
{
  data: Class[];
}
```

#### Add Group to Classes
```http
POST /api/groups/:id/classes
Content-Type: application/json

{
  classIds: string[];
}
```

#### Remove Group from Class
```http
DELETE /api/groups/:groupId/classes/:classId
```

### Teacher-Subject Relationships

#### Get Teacher Subjects
```http
GET /api/teachers/:id/subjects
```

#### Update Teacher Subjects
```http
PUT /api/teachers/:id/subjects
Content-Type: application/json

{
  subjectIds: string[];
}
```

## Validation API

### Validate Entity Data
```http
POST /api/validate/entity
Content-Type: application/json

{
  entityType: "groups" | "teachers" | "subjects" | "courses" | "classes";
  data: any;
  operation: "create" | "update";
  existingId?: string;
}
```

**Response:**
```typescript
{
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}
```

### Validate Relationships
```http
POST /api/validate/relationships
Content-Type: application/json

{
  operation: "create" | "update" | "delete";
  entityType: string;
  entityId: string;
  relationships: Record<string, string[]>;
}
```

## Error Responses

### Standard Error Format
```typescript
{
  error: {
    code: string;
    message: string;
    details?: any;
    field?: string; // For field-specific errors
  };
  timestamp: string;
  path: string;
}
```

### Common Error Codes
- `ENTITY_NOT_FOUND`: Requested entity doesn't exist
- `VALIDATION_ERROR`: Data validation failed
- `RELATIONSHIP_CONFLICT`: Operation would violate relationship constraints
- `DUPLICATE_ENTITY`: Entity with same identifier already exists
- `DEPENDENCY_EXISTS`: Cannot delete entity with dependencies
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `BULK_OPERATION_FAILED`: Bulk operation encountered errors
- `FILE_FORMAT_INVALID`: Import file format is invalid
- `CONCURRENT_MODIFICATION`: Entity was modified by another user

## Pagination and Filtering

### Query Parameters
- `page`: Page number (1-based)
- `limit`: Items per page (max 100)
- `search`: Text search across name/relevant fields
- `sortBy`: Field to sort by
- `sortOrder`: "asc" | "desc"
- `filter`: JSON object with filter criteria

### Response Headers
- `X-Total-Count`: Total number of items
- `X-Page-Count`: Total number of pages
- `Link`: Pagination links (first, prev, next, last)

## Authentication and Authorization

### Required Headers
```http
Authorization: Bearer <JWT token>
Content-Type: application/json
```

### Permission Requirements
- `entities:read`: View entities
- `entities:write`: Create/update entities
- `entities:delete`: Delete entities
- `entities:bulk`: Perform bulk operations
- `relationships:manage`: Manage entity relationships

## Rate Limiting

### Limits
- Standard API calls: 1000 requests per hour per user
- Bulk operations: 10 operations per hour per user
- File uploads: 100MB per request
- Export operations: 5 per hour per user

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```