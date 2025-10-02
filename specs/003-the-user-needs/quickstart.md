# Entity Management Quick Start Guide

## Overview
This feature adds comprehensive entity management to the schedule builder, allowing administrators to manage Groups, Teachers, Subjects, Courses, and Classes through an intuitive interface on the rules management page.

## Getting Started

### Prerequisites
- Existing schedule-builder application (001-schedule-builder)
- Database migration completed (Group-Class many-to-many relationship)
- Node.js 20.x and npm installed
- Access to rules management page

### Installation Steps

1. **Apply Database Migration**
   ```bash
   # Navigate to backend directory
   cd backend
   
   # Run migration to update Group-Class relationships
   npm run migrate:003-entity-management
   ```

2. **Install Frontend Dependencies**
   ```bash
   # Navigate to frontend directory
   cd frontend
   
   # Install new dependencies for Excel handling
   npm install xlsx file-saver
   ```

3. **Start Development Server**
   ```bash
   # Backend
   cd backend
   npm run dev
   
   # Frontend (in new terminal)
   cd frontend
   npm run dev
   ```

## Quick Tour

### 1. Access Entity Management
- Navigate to `/rules` page
- New entity management tabs will be available:
  - Groups
  - Teachers
  - Subjects
  - Courses
  - Classes

### 2. Create Your First Entities

#### Create Subjects
1. Go to "Subjects" tab
2. Click "Add Subject"
3. Fill in:
   - Name: "Mathematics"
   - Break Duration: 10 minutes
   - Credit Hours: 4 (optional)
4. Click "Save"

#### Create Teachers
1. Go to "Teachers" tab
2. Click "Add Teacher"
3. Fill in:
   - Name: "John Smith"
   - Subject Qualifications: Select "Mathematics"
   - Working Hours: 08:15 - 16:00
4. Click "Save"

#### Create Classes
1. Go to "Classes" tab
2. Click "Add Class"
3. Fill in:
   - Name: "10A"
   - Lunch Duration: 30 minutes
   - Academic Year: "2024-2025"
4. Click "Save"

#### Create Groups
1. Go to "Groups" tab
2. Click "Add Group"
3. Fill in:
   - Name: "Math Group 1"
   - Select Classes: "10A"
   - Group Size: 25 (optional)
4. Click "Save"

#### Create Courses
1. Go to "Courses" tab
2. Click "Add Course"
3. Fill in:
   - Subject: "Mathematics"
   - Teacher: "John Smith"
   - Groups: Select "Math Group 1"
   - Weekly Hours: 3
   - Number of Lessons: 2
4. Click "Save"

### 3. Manage Relationships
- Use the relationship panels to see connections between entities
- Click on relationship badges to navigate between related entities
- Use bulk selection to manage multiple relationships at once

### 4. Bulk Operations

#### Import from Excel
1. Click "Import" button on any entity tab
2. Download the template file
3. Fill in your data following the template format
4. Upload the completed file
5. Review validation results
6. Confirm import

#### Export to Excel
1. Select entities to export (or leave blank for all)
2. Click "Export" button
3. Choose format and options
4. Download generated Excel file

## Key Features

### Entity Management
- **Full CRUD Operations**: Create, Read, Update, Delete for all entity types
- **Search and Filter**: Quick search across all entity fields
- **Bulk Selection**: Select multiple entities for batch operations
- **Relationship Visualization**: See connections between entities
- **Validation**: Real-time validation with clear error messages

### Advanced Capabilities
- **Excel Import/Export**: Bulk data management using familiar Excel format
- **Teacher Availability**: Calendar-based constraints with exceptions
- **Dependency Management**: Prevent invalid deletions with cascade options
- **Audit Trail**: Track all changes with timestamps and user information
- **Performance Optimized**: Handles 500+ entities smoothly

## Common Workflows

### Setting Up a New Academic Year
1. **Create Classes** for the new year
2. **Create Groups** and assign them to classes
3. **Update Teacher Availability** for the new schedule
4. **Create Courses** linking subjects, teachers, and groups
5. **Generate Schedules** using the new entity setup

### Managing Teacher Assignments
1. **View Teacher Details** to see current subject qualifications and course assignments
2. **Add/Remove Subject Qualifications** as needed
3. **Set Availability Exceptions** for holidays, meetings, etc.
4. **Reassign Courses** to different teachers when needed

### Bulk Data Import
1. **Export Current Data** as a reference template
2. **Prepare Excel File** with new/updated entity data
3. **Validate Import** to check for errors
4. **Execute Import** and review results
5. **Verify Relationships** are correctly established

## Troubleshooting

### Common Issues

#### "Group cannot be deleted - has dependent relationships"
- **Cause**: Group is assigned to courses or has dependent groups
- **Solution**: Use cascade delete option or reassign relationships first

#### "Teacher not qualified for this subject"
- **Cause**: Trying to assign teacher to course for unqualified subject
- **Solution**: Add subject qualification to teacher first

#### "Import validation failed"
- **Cause**: Excel data format errors or missing required fields
- **Solution**: Check error details, fix data, and retry import

#### "Performance slow with large datasets"
- **Cause**: Loading too many entities at once
- **Solution**: Use search/filters to reduce displayed data, enable pagination

### Getting Help
- Check validation messages for specific field errors
- Use the "Help" tooltips next to form fields
- Review the audit trail for recent changes
- Contact system administrator for permission issues

## Best Practices

### Data Organization
- Use consistent naming conventions for all entities
- Group related entities logically (e.g., by academic year)
- Set up all subjects and teachers before creating courses
- Regularly export data as backup

### Performance Optimization
- Use search and filters when working with large datasets
- Perform bulk operations during off-peak hours
- Keep Excel import files under 1000 rows for best performance
- Use pagination for lists with 100+ items

### Data Integrity
- Always validate relationships before making changes
- Use the preview feature for bulk operations
- Regularly check for orphaned relationships
- Maintain backups before major data changes

## Next Steps

### Advanced Configuration
- Set up automated data imports from student information systems
- Configure custom validation rules for your institution
- Integrate with external calendar systems for teacher availability
- Set up role-based permissions for different user types

### Schedule Generation
- Use the configured entities to generate optimized schedules
- Apply scheduling rules and constraints
- Resolve conflicts using the entity relationship data
- Export schedules in various formats

This quick start guide should help you get up and running with the entity management system. For detailed API documentation, see the contracts folder.