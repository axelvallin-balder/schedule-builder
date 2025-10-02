// Validation Rules for Entity Management
// Based on data-model.md validation specifications

export interface ValidationRule {
  field: string;
  type: 'required' | 'pattern' | 'custom' | 'min' | 'max' | 'email' | 'time' | 'date';
  message: string;
  validator?: (value: any, entity?: any) => boolean;
  pattern?: RegExp;
  min?: number;
  max?: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// Entity-specific validation rules
export const EntityValidationRules: Record<string, ValidationRule[]> = {
  group: [
    { 
      field: 'name', 
      type: 'required', 
      message: 'Group name is required' 
    },
    {
      field: 'name',
      type: 'pattern',
      pattern: /^[a-zA-Z0-9\s\-_]{1,50}$/,
      message: 'Group name must be 1-50 characters, letters, numbers, spaces, hyphens, and underscores only'
    },
    { 
      field: 'classIds', 
      type: 'custom', 
      message: 'At least one class must be selected', 
      validator: (classIds) => Array.isArray(classIds) && classIds.length > 0 
    },
    {
      field: 'size',
      type: 'custom',
      message: 'Group size must be positive if specified',
      validator: (size) => size === undefined || size === null || (typeof size === 'number' && size > 0)
    },
    {
      field: 'dependentGroupIds',
      type: 'custom',
      message: 'Group cannot depend on itself',
      validator: (dependentGroupIds, entity) => {
        if (!Array.isArray(dependentGroupIds) || !entity?.id) return true;
        return !dependentGroupIds.includes(entity.id);
      }
    }
  ],
  
  teacher: [
    { 
      field: 'name', 
      type: 'required', 
      message: 'Teacher name is required' 
    },
    {
      field: 'name',
      type: 'pattern',
      pattern: /^[a-zA-Z\s\-'\.]{1,100}$/,
      message: 'Teacher name must be 1-100 characters, letters, spaces, hyphens, apostrophes, and periods only'
    },
    { 
      field: 'subjectIds', 
      type: 'custom', 
      message: 'At least one subject qualification required',
      validator: (subjectIds) => Array.isArray(subjectIds) && subjectIds.length > 0 
    },
    {
      field: 'workingHours.start',
      type: 'required',
      message: 'Working hours start time is required'
    },
    {
      field: 'workingHours.start',
      type: 'pattern',
      pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      message: 'Start time must be in HH:mm format'
    },
    {
      field: 'workingHours.end',
      type: 'required',
      message: 'Working hours end time is required'
    },
    {
      field: 'workingHours.end',
      type: 'pattern',
      pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      message: 'End time must be in HH:mm format'
    },
    {
      field: 'workingHours',
      type: 'custom',
      message: 'Start time must be before end time',
      validator: (workingHours) => {
        if (!workingHours?.start || !workingHours?.end) return true;
        const start = new Date(`2000-01-01 ${workingHours.start}`);
        const end = new Date(`2000-01-01 ${workingHours.end}`);
        return start < end;
      }
    },
    {
      field: 'maxWeeklyHours',
      type: 'custom',
      message: 'Maximum weekly hours must be positive if specified',
      validator: (maxWeeklyHours) => maxWeeklyHours === undefined || maxWeeklyHours === null || (typeof maxWeeklyHours === 'number' && maxWeeklyHours > 0)
    }
  ],
  
  subject: [
    { 
      field: 'name', 
      type: 'required', 
      message: 'Subject name is required' 
    },
    {
      field: 'name',
      type: 'pattern',
      pattern: /^[a-zA-Z0-9\s\-&()]{1,100}$/,
      message: 'Subject name must be 1-100 characters, letters, numbers, spaces, hyphens, ampersands, and parentheses only'
    },
    { 
      field: 'breakDuration', 
      type: 'custom', 
      message: 'Break duration must be positive',
      validator: (duration) => typeof duration === 'number' && duration > 0 
    },
    {
      field: 'breakDuration',
      type: 'min',
      min: 5,
      message: 'Break duration must be at least 5 minutes'
    },
    {
      field: 'breakDuration',
      type: 'max',
      max: 60,
      message: 'Break duration cannot exceed 60 minutes'
    },
    {
      field: 'creditHours',
      type: 'custom',
      message: 'Credit hours must be positive if specified',
      validator: (creditHours) => creditHours === undefined || creditHours === null || (typeof creditHours === 'number' && creditHours > 0)
    }
  ],
  
  course: [
    { 
      field: 'subjectId', 
      type: 'required', 
      message: 'Subject is required' 
    },
    { 
      field: 'groupIds', 
      type: 'custom', 
      message: 'At least one group must be selected',
      validator: (groupIds) => Array.isArray(groupIds) && groupIds.length > 0 
    },
    {
      field: 'weeklyHours',
      type: 'required',
      message: 'Weekly hours is required'
    },
    {
      field: 'weeklyHours',
      type: 'custom',
      message: 'Weekly hours must be positive',
      validator: (weeklyHours) => typeof weeklyHours === 'number' && weeklyHours > 0
    },
    {
      field: 'weeklyHours',
      type: 'max',
      max: 40,
      message: 'Weekly hours cannot exceed 40'
    },
    {
      field: 'numberOfLessons',
      type: 'required',
      message: 'Number of lessons is required'
    },
    {
      field: 'numberOfLessons',
      type: 'min',
      min: 1,
      message: 'Must have at least 1 lesson'
    },
    {
      field: 'numberOfLessons',
      type: 'max',
      max: 10,
      message: 'Cannot exceed 10 lessons per week'
    },
    {
      field: 'duration',
      type: 'custom',
      message: 'Duration must be at least 45 minutes if specified',
      validator: (duration) => duration === undefined || duration === null || (typeof duration === 'number' && duration >= 45)
    }
  ],
  
  class: [
    { 
      field: 'name', 
      type: 'required', 
      message: 'Class name is required' 
    },
    {
      field: 'name',
      type: 'pattern',
      pattern: /^[a-zA-Z0-9\s\-_]{1,50}$/,
      message: 'Class name must be 1-50 characters, letters, numbers, spaces, hyphens, and underscores only'
    },
    {
      field: 'lunchDuration',
      type: 'required',
      message: 'Lunch duration is required'
    },
    {
      field: 'lunchDuration',
      type: 'min',
      min: 30,
      message: 'Lunch duration must be at least 30 minutes'
    },
    {
      field: 'lunchDuration',
      type: 'max',
      max: 120,
      message: 'Lunch duration cannot exceed 120 minutes'
    },
    {
      field: 'academicYear',
      type: 'pattern',
      pattern: /^\d{4}-\d{4}$/,
      message: 'Academic year must be in YYYY-YYYY format (e.g., 2024-2025)'
    }
  ]
};

// Availability exception validation
export const AvailabilityExceptionRules: ValidationRule[] = [
  {
    field: 'date',
    type: 'required',
    message: 'Date is required'
  },
  {
    field: 'date',
    type: 'pattern',
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    message: 'Date must be in YYYY-MM-DD format'
  },
  {
    field: 'type',
    type: 'required',
    message: 'Exception type is required'
  },
  {
    field: 'startTime',
    type: 'custom',
    message: 'Start time is required for limited availability',
    validator: (startTime, exception) => {
      if (exception?.type !== 'limited') return true;
      return typeof startTime === 'string' && startTime.length > 0;
    }
  },
  {
    field: 'endTime',
    type: 'custom',
    message: 'End time is required for limited availability',
    validator: (endTime, exception) => {
      if (exception?.type !== 'limited') return true;
      return typeof endTime === 'string' && endTime.length > 0;
    }
  },
  {
    field: 'startTime',
    type: 'pattern',
    pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    message: 'Start time must be in HH:mm format'
  },
  {
    field: 'endTime',
    type: 'pattern',
    pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    message: 'End time must be in HH:mm format'
  }
];

// Bulk import validation rules
export const ImportValidationRules: Record<string, ValidationRule[]> = {
  fileFormat: [
    {
      field: 'file',
      type: 'required',
      message: 'File is required'
    },
    {
      field: 'file',
      type: 'custom',
      message: 'File must be an Excel file (.xlsx)',
      validator: (file) => {
        if (!file?.name) return false;
        return file.name.toLowerCase().endsWith('.xlsx');
      }
    },
    {
      field: 'file',
      type: 'custom',
      message: 'File size cannot exceed 10MB',
      validator: (file) => {
        if (!file?.size) return true;
        return file.size <= 10 * 1024 * 1024; // 10MB
      }
    }
  ]
};

// Validation utility functions
export const validateEntity = (entityType: string, data: any, existingEntity?: any): ValidationResult => {
  const rules = EntityValidationRules[entityType] || [];
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const rule of rules) {
    const fieldValue = getNestedValue(data, rule.field);
    const isValid = validateField(fieldValue, rule, existingEntity || data);

    if (!isValid) {
      errors.push({
        field: rule.field,
        message: rule.message,
        code: `VALIDATION_${rule.type.toUpperCase()}`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

export const validateField = (value: any, rule: ValidationRule, entity?: any): boolean => {
  switch (rule.type) {
    case 'required':
      return value !== undefined && value !== null && value !== '';
    
    case 'pattern':
      if (!rule.pattern) return true;
      if (value === undefined || value === null || value === '') return true;
      return rule.pattern.test(String(value));
    
    case 'min':
      if (rule.min === undefined) return true;
      if (typeof value !== 'number') return true;
      return value >= rule.min;
    
    case 'max':
      if (rule.max === undefined) return true;
      if (typeof value !== 'number') return true;
      return value <= rule.max;
    
    case 'custom':
      if (!rule.validator) return true;
      return rule.validator(value, entity);
    
    case 'email':
      if (value === undefined || value === null || value === '') return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(String(value));
    
    case 'time':
      if (value === undefined || value === null || value === '') return true;
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      return timeRegex.test(String(value));
    
    case 'date':
      if (value === undefined || value === null || value === '') return true;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      return dateRegex.test(String(value));
    
    default:
      return true;
  }
};

export const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

export const validateBulkData = (entityType: string, data: any[]): ValidationResult => {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  data.forEach((item, index) => {
    const result = validateEntity(entityType, item);
    
    // Add row information to errors
    result.errors.forEach(error => {
      allErrors.push({
        ...error,
        field: `Row ${index + 1}: ${error.field}`,
        code: `${error.code}_ROW_${index + 1}`
      });
    });

    result.warnings.forEach(warning => {
      allWarnings.push({
        ...warning,
        field: `Row ${index + 1}: ${warning.field}`
      });
    });
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
};

// Export validation constants
export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_FORMAT: 'Invalid format',
  INVALID_TIME_RANGE: 'Start time must be before end time',
  DUPLICATE_ENTITY: 'An entity with this name already exists',
  CIRCULAR_DEPENDENCY: 'Circular dependency detected',
  TEACHER_NOT_QUALIFIED: 'Teacher is not qualified for this subject',
  BULK_OPERATION_FAILED: 'Bulk operation failed with errors'
} as const;