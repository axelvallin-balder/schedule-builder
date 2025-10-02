# Calendar Schedule Display - Quick Start Guide

## Feature Overview
Display class schedules in a calendar grid format with week/day views, interactive lesson cards, and responsive design. Users can select schedules and classes to view timetables with full lesson details.

## Getting Started (5 minutes)

### 1. Navigate to Schedule Page
```bash
# Start the development server (if not running)
cd frontend
npm run dev

# Visit the schedule page
# http://localhost:3000/schedules
```

### 2. Basic Usage Flow
1. **Select Schedule**: Choose from active schedules in dropdown
2. **Select Class**: Choose class to view timetable for
3. **View Calendar**: See weekly calendar with lessons positioned by time slots
4. **Switch Views**: Toggle between week view (desktop) and day view (mobile)
5. **Lesson Details**: Click lesson cards to see teacher, groups, and room information

### 3. Expected UI Behavior
- **Loading States**: Dropdowns show loading spinners while fetching data
- **Empty States**: "No lessons scheduled" message for empty time periods
- **Responsive Design**: Automatic switch to day view on mobile devices
- **Error Handling**: Clear error messages for failed data loading

## File Structure

### New Components
```
frontend/app/components/schedule/
├── CalendarView.vue           # Main calendar grid component
├── LessonCard.vue            # Individual lesson display (exists, will extend)
├── ScheduleSelector.vue      # Schedule dropdown component
├── ClassSelector.vue         # Class dropdown component
└── CalendarNavigation.vue    # Week/day view toggle
```

### New Pages
```
frontend/app/pages/schedules/
├── index.vue                 # Schedule selection and calendar display
└── calendar.vue              # Alternative calendar-focused route
```

### Enhanced Stores
```
frontend/app/stores/
├── schedule.ts               # Enhanced with calendar-specific state
└── calendar.ts               # New store for calendar UI state
```

### Services
```
frontend/services/
├── calendarService.ts        # Calendar data transformation logic
└── api.ts                    # Enhanced with calendar endpoints
```

## Development Setup

### 1. Install Dependencies
```bash
cd frontend
npm install

# Verify TypeScript and Vue are working
npm run build
```

### 2. Backend Connection
```bash
# Ensure backend is running on port 3001
cd ../backend
npm run dev

# Verify API endpoints are accessible
curl http://localhost:3001/api/schedules
curl http://localhost:3001/api/classes
```

### 3. Database Setup
The feature uses existing data from 001-schedule-builder. Ensure your database has:
- **Schedules**: At least one active schedule with lessons
- **Classes**: Classes with associated groups
- **Teachers**: Teachers assigned to lessons
- **Subjects**: Subjects linked to courses

### 4. Test Data Verification
```sql
-- Verify you have calendar-displayable data
SELECT 
  s.name as schedule_name,
  c.name as class_name,
  COUNT(l.id) as lesson_count
FROM schedules s
CROSS JOIN classes c
LEFT JOIN lessons l ON l.dayOfWeek BETWEEN 1 AND 5 
  AND l.startTime BETWEEN '08:00' AND '16:00'
GROUP BY s.id, c.id
HAVING lesson_count > 0;
```

## Key Implementation Concepts

### Calendar Grid System
- **Time Slots**: 15-minute intervals from 8:00 AM to 4:00 PM
- **CSS Grid**: Dynamic grid with time slots as rows, weekdays as columns
- **Lesson Positioning**: Calculated grid-row-start and grid-row-span for exact placement
- **Overlap Handling**: Side-by-side positioning for concurrent lessons

### Data Flow Pattern
```
User Selection → API Loading → Data Transformation → View Models → UI Rendering
     ↓              ↓              ↓                    ↓           ↓
Schedule/Class → Raw Entities → CalendarLesson[] → Vue Components → DOM
```

### State Management
```typescript
// Calendar store manages both data and UI state
const calendarStore = useCalendarStore();

// Load calendar data
await calendarStore.loadCalendarData(scheduleId, classId);

// Access transformed view models
const calendarWeek = calendarStore.currentCalendarWeek;
const timeSlots = calendarStore.timeSlots;
```

### Component Communication
```typescript
// Parent page coordinates selection and data loading
<template>
  <ScheduleSelector @schedule-selected="onScheduleSelected" />
  <ClassSelector @class-selected="onClassSelected" />
  <CalendarView :calendar-week="calendarWeek" />
</template>

// Components emit events for user interactions
const emit = defineEmits<{
  'schedule-selected': [scheduleId: string]
  'class-selected': [classId: string]
}>();
```

## Performance Considerations

### Loading Strategy
1. **Lazy Loading**: Load lesson details only when calendar is displayed
2. **Parallel Requests**: Load schedules and classes simultaneously
3. **Caching**: Cache stable data (teachers, subjects) in Pinia stores
4. **Debouncing**: Debounce rapid selection changes

### Optimization Points
- **Virtual Scrolling**: For classes with many groups (future enhancement)
- **Image Optimization**: Optimize any lesson-related images
- **Bundle Splitting**: Lazy-load calendar components
- **Computed Properties**: Use Vue computed for expensive calculations

## Testing Approach

### Unit Tests
```bash
# Component testing
npm run test components/schedule/CalendarView.test.ts
npm run test stores/calendar.test.ts

# Service testing  
npm run test services/calendarService.test.ts
```

### Integration Tests
```bash
# API integration
npm run test:integration api/calendar-endpoints.test.ts

# Store integration
npm run test:integration stores/calendar-integration.test.ts
```

### E2E Tests
```bash
# User workflow testing
npm run test:e2e schedule-page.spec.ts
```

## Troubleshooting Common Issues

### API Connection Issues
```bash
# Check backend status
curl http://localhost:3001/health

# Verify CORS configuration
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:3001/api/schedules
```

### Data Loading Issues
```javascript
// Debug data transformation in browser console
console.log('Raw lessons:', lessons);
console.log('Transformed calendar lessons:', calendarLessons);
console.log('Time slots:', timeSlots);
```

### Styling Issues
```css
/* Common CSS Grid debugging */
.calendar-grid {
  border: 1px solid red; /* Visualize grid container */
}

.lesson-card {
  outline: 1px solid blue; /* Visualize lesson positioning */
}
```

## Next Steps After Implementation

### Phase 1: Core Features
- [ ] Basic calendar grid display
- [ ] Schedule and class selection
- [ ] Lesson card rendering
- [ ] Responsive week/day views

### Phase 2: Enhancements
- [ ] Lesson conflict visualization
- [ ] Print-friendly view
- [ ] Export to PDF/ICS
- [ ] Accessibility improvements

### Phase 3: Advanced Features
- [ ] Real-time updates via WebSocket
- [ ] Lesson drag-and-drop editing
- [ ] Multi-class comparison view
- [ ] Teacher availability overlay

## Documentation References
- **Feature Specification**: `specs/002-the-schedule-page/spec.md`
- **Data Model**: `specs/002-the-schedule-page/data-model.md`
- **API Contracts**: `specs/002-the-schedule-page/contracts/api.md`
- **Implementation Plan**: `specs/002-the-schedule-page/plan.md`
- **Original Data Model**: `specs/001-schedule-builder/data-model.md`

Start by implementing the core calendar grid and schedule selection, then build out the lesson display and responsive features incrementally.