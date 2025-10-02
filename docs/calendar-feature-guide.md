# Calendar Schedule Display Feature Documentation

## Overview

The Calendar Schedule Display feature provides an interactive, user-friendly way to view and navigate class schedules. It supports both weekly and daily views with responsive design, accessibility features, and real-time data loading.

## Features

### 🗓️ Calendar Views
- **Weekly View**: Shows all 5 weekdays with lessons in a CSS Grid layout
- **Daily View**: Focused view on a single day with detailed lesson information
- **Responsive Design**: Automatically switches to day view on mobile devices

### 🔍 Schedule Selection
- **Schedule Dropdown**: Choose from available schedules with loading states
- **Class Search**: Searchable dropdown with keyboard navigation support
- **Auto-selection**: Automatically selects default schedules when available

### ♿ Accessibility
- **WCAG 2.1 AA Compliant**: Full keyboard navigation and screen reader support
- **ARIA Labels**: Comprehensive labeling for assistive technologies
- **Focus Management**: Proper focus indicators and tab order
- **Live Regions**: Real-time announcements for dynamic content

### ⚡ Performance
- **Optimized Rendering**: Efficient CSS Grid layout for large datasets
- **Lazy Loading**: On-demand data fetching
- **Caching**: Store-based caching for improved performance

## Components

### ScheduleSelector
**Location**: `frontend/app/components/schedule/ScheduleSelector.vue`

Dropdown component for selecting schedules with loading and error states.

```vue
<ScheduleSelector
  :schedules=\"availableSchedules\"
  :selected-schedule-id=\"selectedId\"
  :loading=\"isLoading\"
  :error=\"errorMessage\"
  @schedule-selected=\"onScheduleSelected\"
/>
```

**Props:**
- `schedules: ScheduleOption[]` - Array of available schedules
- `selectedScheduleId: string | null` - Currently selected schedule ID
- `loading?: boolean` - Shows loading spinner when true
- `error?: string | null` - Displays error message

**Events:**
- `schedule-selected(scheduleId: string)` - Emitted when user selects a schedule

### ClassSelector
**Location**: `frontend/app/components/schedule/ClassSelector.vue`

Searchable dropdown for class selection with keyboard navigation.

```vue
<ClassSelector
  :classes=\"availableClasses\"
  :selected-class-id=\"selectedId\"
  :loading=\"isLoading\"
  @class-selected=\"onClassSelected\"
/>
```

**Props:**
- `classes: ClassOption[]` - Array of available classes
- `selectedClassId: string | null` - Currently selected class ID
- `loading?: boolean` - Shows loading state
- `searchable?: boolean` - Enables search functionality

**Events:**
- `class-selected(classId: string)` - Emitted when user selects a class

### CalendarNavigation
**Location**: `frontend/app/components/schedule/CalendarNavigation.vue`

View mode toggle and day selection component.

```vue
<CalendarNavigation
  :current-view-mode=\"viewMode\"
  :selected-day=\"selectedDay\"
  :available-days=\"[1,2,3,4,5]\"
  @view-mode-changed=\"onViewModeChanged\"
  @day-selected=\"onDaySelected\"
/>
```

**Props:**
- `currentViewMode: 'week' | 'day'` - Current view mode
- `selectedDay: number` - Selected day of week (1-5)
- `availableDays?: number[]` - Days available for selection

**Events:**
- `view-mode-changed(mode: 'week' | 'day')` - View mode change
- `day-selected(dayOfWeek: number)` - Day selection

### CalendarView
**Location**: `frontend/app/components/schedule/CalendarView.vue`

Main calendar display component with grid layout and lesson cards.

```vue
<CalendarView
  :current-week=\"calendarWeek\"
  :view-mode=\"viewMode\"
  :selected-day-of-week=\"selectedDay\"
  :loading=\"isLoading\"
  :error=\"errorMessage\"
  @lesson-clicked=\"onLessonClicked\"
/>
```

**Props:**
- `currentWeek: CalendarWeek | null` - Calendar data to display
- `viewMode: 'week' | 'day'` - Display mode
- `selectedDayOfWeek: number` - Selected day for day view
- `loading?: boolean` - Loading state
- `error?: string | null` - Error message

**Events:**
- `lesson-clicked(lesson: CalendarLesson)` - Lesson card clicked

## Store Management

### Calendar Store
**Location**: `frontend/app/stores/calendar.ts`

Pinia store managing calendar state and data loading.

```typescript
const calendarStore = useCalendarStore()

// Load initial data
await calendarStore.loadScheduleOptions()
await calendarStore.loadClassOptions()

// Select schedule and class
calendarStore.selectSchedule('schedule-id')
calendarStore.selectClass('class-id')

// Generate calendar view
await calendarStore.generateCalendarWeek()
```

**State:**
- `selectedScheduleId: string | null`
- `selectedClassId: string | null`
- `availableSchedules: ScheduleOption[]`
- `availableClasses: ClassOption[]`
- `currentCalendarWeek: CalendarWeek | null`
- `isLoading: boolean`
- `error: string | null`
- `viewMode: 'week' | 'day'`
- `selectedDay: number`

**Actions:**
- `loadScheduleOptions()` - Load available schedules
- `loadClassOptions()` - Load available classes
- `selectSchedule(id)` - Select a schedule
- `selectClass(id)` - Select a class
- `generateCalendarWeek()` - Generate calendar data
- `setViewMode(mode)` - Change view mode
- `setSelectedDay(day)` - Set selected day
- `clearError()` - Clear error state
- `reset()` - Reset all state

## Type Definitions

### CalendarLesson
```typescript
interface CalendarLesson {
  id: string
  subjectName: string
  teacherName: string
  groupNames: string[]
  startTime: string        // HH:mm format
  duration: number         // minutes
  roomId: string | null
  dayOfWeek: number        // 1-5 (Monday-Friday)
  gridRowStart: number     // CSS grid positioning
  gridRowSpan: number      // CSS grid span
  position: number         // Horizontal position for overlaps
}
```

### CalendarWeek
```typescript
interface CalendarWeek {
  scheduleId: string
  scheduleName: string
  className: string
  timeSlots: CalendarTimeSlot[]
  days: CalendarDay[]
  isEmpty: boolean
}
```

### ScheduleOption
```typescript
interface ScheduleOption {
  id: string
  name: string
  status: 'draft' | 'active' | 'archived'
  weekNumber: number
  year: number
  isDefault: boolean
}
```

## Usage Examples

### Basic Implementation
```vue
<template>
  <div class=\"schedule-page\">
    <!-- Selection Controls -->
    <div class=\"selection-controls\">
      <ScheduleSelector
        :schedules=\"calendarStore.availableSchedules\"
        :selected-schedule-id=\"calendarStore.selectedScheduleId\"
        :loading=\"calendarStore.isLoading\"
        @schedule-selected=\"onScheduleSelected\"
      />
      
      <ClassSelector
        :classes=\"calendarStore.availableClasses\"
        :selected-class-id=\"calendarStore.selectedClassId\"
        :loading=\"calendarStore.isLoading\"
        @class-selected=\"onClassSelected\"
      />
      
      <CalendarNavigation
        :current-view-mode=\"calendarStore.viewMode\"
        :selected-day=\"calendarStore.selectedDay\"
        @view-mode-changed=\"onViewModeChanged\"
        @day-selected=\"onDaySelected\"
      />
    </div>
    
    <!-- Calendar Display -->
    <CalendarView
      :current-week=\"calendarStore.currentCalendarWeek\"
      :view-mode=\"calendarStore.viewMode\"
      :selected-day-of-week=\"calendarStore.selectedDay\"
      :loading=\"calendarStore.isLoading\"
      :error=\"calendarStore.error\"
      @lesson-clicked=\"onLessonClicked\"
    />
  </div>
</template>

<script setup lang=\"ts\">
import { useCalendarStore } from '../stores/calendar'

const calendarStore = useCalendarStore()

const onScheduleSelected = async (scheduleId: string) => {
  await calendarStore.selectSchedule(scheduleId)
}

const onClassSelected = async (classId: string) => {
  await calendarStore.selectClass(classId)
}

const onViewModeChanged = (mode: 'week' | 'day') => {
  calendarStore.setViewMode(mode)
}

const onDaySelected = (dayOfWeek: number) => {
  calendarStore.setSelectedDay(dayOfWeek)
}

const onLessonClicked = (lesson: CalendarLesson) => {
  // Handle lesson click
  console.log('Lesson clicked:', lesson)
}

// Initialize on mount
onMounted(async () => {
  await calendarStore.initialize()
})
</script>
```

### Programmatic Control
```typescript
// Initialize store
const calendarStore = useCalendarStore()

// Load data
await calendarStore.loadScheduleOptions()
await calendarStore.loadClassOptions()

// Select items programmatically
calendarStore.selectSchedule('schedule-123')
calendarStore.selectClass('class-456')

// Wait for calendar generation
await calendarStore.generateCalendarWeek()

// Change view
calendarStore.setViewMode('day')
calendarStore.setSelectedDay(3) // Wednesday

// Handle errors
if (calendarStore.error) {
  console.error(calendarStore.error)
  calendarStore.clearError()
}
```

## Styling and Theming

### CSS Grid Layout
The calendar uses CSS Grid for efficient layout:

```css
.calendar-grid {
  display: grid;
  grid-template-columns: 60px repeat(5, 1fr); /* Time column + 5 days */
  grid-template-rows: auto repeat(9, minmax(60px, auto)); /* Header + time slots */
  gap: 1px;
}
```

### Responsive Design
```css
@media (max-width: 767px) {
  .calendar-grid {
    font-size: 0.75rem;
  }
  
  .day-view {
    padding: 1rem 0.5rem;
  }
}
```

### Customization
Override CSS custom properties for theming:

```css
:root {
  --calendar-grid-gap: 1px;
  --calendar-time-width: 60px;
  --calendar-slot-height: 60px;
  --calendar-primary-color: #3b82f6;
  --calendar-border-color: #e5e7eb;
}
```

## Testing

### Unit Tests
```bash
# Run component tests
npm run test frontend/tests/components/schedule/

# Run store tests
npm run test frontend/tests/stores/calendar.test.ts
```

### Performance Tests
```bash
# Run performance benchmarks
npm run test frontend/tests/performance/calendar-performance.test.ts
```

### Accessibility Tests
```bash
# Run accessibility tests
npm run test frontend/tests/accessibility/calendar-accessibility.test.ts
```

## API Integration

### Service Layer
**Location**: `frontend/services/calendarService.ts`

```typescript
import calendarService from '../services/calendarService'

// Load calendar data
const calendarWeek = await calendarService.loadCalendarData(
  'schedule-id',
  'class-id'
)

// Load options
const schedules = await calendarService.loadScheduleOptions()
const classes = await calendarService.loadClassOptions()
```

## Performance Considerations

### Optimization Strategies
1. **Virtual Scrolling**: For large datasets (100+ lessons)
2. **Memoization**: Computed properties cache expensive calculations
3. **Event Delegation**: Efficient event handling for lesson cards
4. **Lazy Loading**: Load data only when needed

### Performance Metrics
- **Render Time**: < 100ms for small datasets (< 50 lessons)
- **Large Dataset**: < 200ms for 100+ lessons
- **View Switching**: < 50ms between week/day modes
- **Memory Usage**: Minimal memory leaks with proper cleanup

## Troubleshooting

### Common Issues

**Calendar not loading:**
```typescript
// Check store state
console.log(calendarStore.error)
console.log(calendarStore.canDisplayCalendar)

// Verify selections
console.log(calendarStore.selectedScheduleId)
console.log(calendarStore.selectedClassId)
```

**Performance issues:**
```typescript
// Monitor render times
console.time('calendar-render')
// ... calendar operations
console.timeEnd('calendar-render')
```

**Accessibility issues:**
```typescript
// Test keyboard navigation
// Use screen reader testing tools
// Check ARIA attributes in browser dev tools
```

## Browser Support

- **Modern Browsers**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **Mobile**: iOS Safari 14+, Chrome Mobile 88+
- **Accessibility**: NVDA, JAWS, VoiceOver screen readers

## Future Enhancements

### Planned Features
1. **Drag & Drop**: Lesson rescheduling
2. **Print View**: Optimized printing layout
3. **Export**: PDF and CSV export options
4. **Themes**: Dark mode and custom themes
5. **Internationalization**: Multi-language support

### API Enhancements
1. **Real-time Updates**: WebSocket integration
2. **Caching**: Redis-based caching
3. **Pagination**: Large dataset handling
4. **Filtering**: Advanced filtering options

---

## Support

For technical support or feature requests, please:
1. Check the troubleshooting section above
2. Review the test files for usage examples
3. Open an issue in the project repository
4. Contact the development team

**Documentation Version**: 1.0.0  
**Last Updated**: October 1, 2025  
**Feature Status**: ✅ Production Ready