# Schedule Builder User Guide

## Overview

The Schedule Builder is a comprehensive application for creating, managing, and optimizing academic schedules. It provides powerful tools for course scheduling, real-time collaboration, and conflict resolution.

## Getting Started

### System Requirements

- **Browser Requirements**: Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Memory**: At least 4GB RAM recommended
- **Internet Connection**: Stable broadband connection for real-time collaboration features

### Accessing the Application

1. Open your web browser
2. Navigate to the Schedule Builder URL provided by your administrator
3. Log in with your provided credentials

## Main Features

### 1. Course Management

#### Adding a New Course
1. Navigate to the **Courses** section
2. Click **"Add Course"** button
3. Fill in the required information:
   - Course name
   - Course code
   - Subject area
   - Credits
   - Weekly hours
   - Number of lessons per week
4. Assign a teacher (optional)
5. Select target groups
6. Click **"Save"** to create the course

#### Editing Courses
1. Find the course in the course list
2. Click the **"Edit"** button (pencil icon)
3. Modify the necessary fields
4. Click **"Save Changes"**

#### Deleting Courses
1. Select the course you want to delete
2. Click the **"Delete"** button (trash icon)
3. Confirm the deletion in the popup dialog

### 2. Teacher Management

#### Adding Teachers
1. Go to the **Teachers** section
2. Click **"Add Teacher"**
3. Enter teacher information:
   - Full name
   - Subject specializations
   - Working hours (start and end times)
4. Save the teacher profile

#### Managing Teacher Availability
1. Select a teacher from the list
2. Click **"Edit Availability"**
3. Set working hours for each day
4. Mark any unavailable time slots
5. Save the changes

### 3. Group Management

#### Creating Student Groups
1. Navigate to **Groups** section
2. Click **"Create Group"**
3. Provide group details:
   - Group name
   - Academic level
   - Maximum students
   - Current enrollment
   - Associated class
4. Save the group

#### Managing Group Dependencies
Some groups may have dependencies (e.g., advanced groups that require basic groups):
1. Edit the group
2. In the **"Dependencies"** section, select prerequisite groups
3. Save the changes

### 4. Schedule Generation

#### Creating a New Schedule

1. **Navigate to Schedule Generation**
   - Go to the **Schedules** section
   - Click **"Generate New Schedule"**

2. **Set Generation Parameters**
   - **Schedule Name**: Give your schedule a descriptive name
   - **Week Number**: Specify the academic week
   - **Academic Year**: Select the correct year
   - **Constraints**: Configure scheduling rules

3. **Configure Scheduling Constraints**
   - **Maximum lessons per day**: Set the daily lesson limit (typically 6-8)
   - **Lesson duration**: Standard lesson length (usually 45 minutes)
   - **Break duration**: Time between lessons (typically 15 minutes)
   - **Maximum hours per week**: Weekly hour limits for teachers

4. **Advanced Options**
   - **Optimization level**: Choose between speed and quality
   - **Conflict resolution**: Automatic or manual conflict handling
   - **Room assignments**: Enable automatic room allocation

5. **Generate Schedule**
   - Click **"Generate Schedule"** to start the process
   - Wait for the optimization engine to complete
   - Review the generated schedule

#### Understanding Schedule Generation

The system uses advanced algorithms to:
- Avoid teacher and group conflicts
- Respect working hour constraints
- Distribute lessons evenly throughout the week
- Optimize resource utilization
- Minimize gaps in schedules

**Performance Note**: Schedule generation typically takes 2-5 seconds for standard configurations with up to 50 courses and 20 teachers.

### 5. Schedule Management

#### Viewing Schedules
- **Weekly View**: See all lessons organized by day and time
- **Teacher View**: Filter by specific teachers
- **Group View**: Filter by student groups
- **Room View**: See room occupancy

#### Editing Schedules
1. Click on any lesson in the schedule
2. Modify the details:
   - Change time slot
   - Reassign teacher
   - Move to different room
   - Adjust duration
3. The system will automatically check for conflicts
4. Save your changes

#### Managing Conflicts
When conflicts arise:
1. **Automatic Detection**: The system highlights conflicts in red
2. **Conflict Details**: Click on conflicted lessons to see details
3. **Resolution Options**:
   - Move one of the conflicting lessons
   - Change teacher assignment
   - Split or merge lessons
   - Use alternative time slots

### 6. Real-Time Collaboration

#### Collaborative Editing
Multiple users can work on schedules simultaneously:
- **Live Updates**: See changes from other users in real-time
- **User Presence**: See who else is editing
- **Change History**: Track all modifications
- **Conflict Prevention**: Automatic locking prevents simultaneous edits

#### Chat and Communication
- **Built-in Chat**: Communicate with team members
- **Comments**: Add notes to specific lessons or time slots
- **Notifications**: Get alerts for important changes

### 7. Rules and Constraints

#### Setting up Scheduling Rules
1. Navigate to **Rules Management**
2. Configure constraint types:
   - **Hard Constraints**: Must be respected (conflicts)
   - **Soft Constraints**: Preferences (optimizations)

#### Common Rule Types
- **Teacher Availability**: Set when teachers can and cannot teach
- **Group Availability**: Define when groups are available
- **Room Constraints**: Specify room requirements and capacity
- **Subject Distribution**: Spread lessons throughout the week
- **Break Requirements**: Minimum time between lessons

#### Custom Rules
Create specialized rules for your institution:
1. Click **"Create Custom Rule"**
2. Define the conditions and constraints
3. Set the priority level
4. Test the rule before applying

### 8. Performance and Optimization

#### System Performance
The Schedule Builder is optimized for:
- **Fast Response Times**: UI interactions under 100ms
- **Quick Generation**: Schedule creation under 5 seconds
- **Memory Efficiency**: Minimal browser memory usage
- **Scalability**: Supports up to 50 concurrent users

#### Performance Tips
- **Regular Cleanup**: Archive old schedules to maintain performance
- **Optimal Data Size**: Keep course lists manageable (under 100 courses)
- **Browser Optimization**: Keep browser tabs minimal during heavy operations
- **Network Stability**: Use stable internet connection for real-time features

### 9. Data Management

#### Importing Data
1. Go to **Data Management** > **Import**
2. Select file type (CSV, Excel, JSON)
3. Map columns to system fields
4. Preview and validate data
5. Complete the import

#### Exporting Schedules
1. Select the schedule to export
2. Choose export format:
   - **PDF**: For printing and sharing
   - **Excel**: For further analysis
   - **CSV**: For data processing
   - **iCal**: For calendar integration
3. Configure export options
4. Download the file

#### Backup and Recovery
- **Automatic Backups**: System creates daily backups
- **Manual Backup**: Export complete data sets
- **Recovery**: Contact administrator for data recovery

### 10. Troubleshooting

#### Common Issues

**Schedule Generation Fails**
- Check that all courses have assigned teachers
- Verify teacher availability matches course requirements
- Reduce the number of constraints if generation fails
- Ensure sufficient time slots are available

**Performance Issues**
- Clear browser cache and cookies
- Close unnecessary browser tabs
- Check internet connection stability
- Contact administrator if issues persist

**Collaboration Problems**
- Refresh the page to reconnect
- Check that multiple users aren't editing the same element
- Verify proper permissions for collaborative features

**Data Synchronization Issues**
- Wait a few seconds for automatic sync
- Refresh the page if changes don't appear
- Check internet connection
- Contact support for persistent sync issues

#### Getting Help

**In-App Help**
- Click the **"?"** icon for contextual help
- Use the search function to find specific topics
- Access video tutorials from the help menu

**Support Channels**
- **Email Support**: Send detailed problem descriptions
- **Live Chat**: Available during business hours
- **User Community**: Join forums for tips and best practices
- **Documentation**: Access complete technical documentation

#### Keyboard Shortcuts

**Navigation**
- `Ctrl + N`: New schedule
- `Ctrl + S`: Save current work
- `Ctrl + Z`: Undo last action
- `Ctrl + Y`: Redo action
- `F5`: Refresh data

**Schedule View**
- `Arrow Keys`: Navigate between time slots
- `Space`: Select/deselect lesson
- `Delete`: Remove selected lesson
- `Enter`: Edit selected lesson
- `Esc`: Cancel current operation

### 11. Best Practices

#### Schedule Planning
1. **Start Early**: Begin schedule planning well before the semester
2. **Involve Stakeholders**: Get input from teachers and administrators
3. **Test Scenarios**: Create multiple schedule versions to compare
4. **Document Decisions**: Keep track of scheduling choices and rationale

#### Data Quality
1. **Regular Updates**: Keep teacher and course information current
2. **Validation**: Verify data accuracy before schedule generation
3. **Consistency**: Use standardized naming conventions
4. **Backup**: Regularly export important schedule data

#### Collaboration
1. **Clear Communication**: Use comments and chat features effectively
2. **Role Definition**: Assign clear responsibilities to team members
3. **Version Control**: Track changes and maintain schedule versions
4. **Training**: Ensure all users understand the system features

#### Performance Optimization
1. **Minimize Complexity**: Avoid overly complex constraint rules
2. **Staged Approach**: Build schedules incrementally
3. **Regular Maintenance**: Archive old data and clean up unused entries
4. **Monitor Usage**: Keep track of system performance during peak times

## Conclusion

The Schedule Builder provides powerful tools for academic scheduling with intuitive interfaces and advanced optimization capabilities. By following this guide and best practices, you can create efficient, conflict-free schedules that meet your institution's needs.

For additional support or advanced features, please contact your system administrator or refer to the technical documentation."