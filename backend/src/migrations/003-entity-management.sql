-- Migration: 003-entity-management
-- Description: Update Group-Class relationship from one-to-many to many-to-many
-- Date: 2025-10-02

-- Remove existing classId column from groups table
ALTER TABLE groups DROP COLUMN IF EXISTS class_id;

-- Create junction table for many-to-many Group-Class relationship
CREATE TABLE IF NOT EXISTS group_classes (
  group_id VARCHAR(36) NOT NULL,
  class_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, class_id),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_classes_group ON group_classes(group_id);
CREATE INDEX IF NOT EXISTS idx_group_classes_class ON group_classes(class_id);

-- Add optional new fields to existing tables
ALTER TABLE groups ADD COLUMN IF NOT EXISTS size INTEGER DEFAULT NULL;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS academic_level VARCHAR(100) DEFAULT NULL;

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS max_weekly_hours INTEGER DEFAULT NULL;

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS credit_hours INTEGER DEFAULT NULL;

ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT NULL;

ALTER TABLE classes ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20) DEFAULT NULL;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS level VARCHAR(100) DEFAULT NULL;

-- Create table for teacher availability exceptions
CREATE TABLE IF NOT EXISTS teacher_availability_exceptions (
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

CREATE INDEX IF NOT EXISTS idx_teacher_availability_teacher ON teacher_availability_exceptions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_availability_date ON teacher_availability_exceptions(date);

-- Insert migration record
INSERT INTO migrations (version, name, applied_at) 
VALUES ('003', 'entity-management', CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE applied_at = CURRENT_TIMESTAMP;