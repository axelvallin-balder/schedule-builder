# Research: Calendar Schedule Display

## Calendar Layout Approaches

### Decision: CSS Grid-based Calendar Component
**Rationale**: CSS Grid provides precise control over time slot positioning and automatic responsiveness. Well-suited for the 8:00-16:00 time range with custom configurable periods.

**Alternatives considered**:
- Table-based layout: Less flexible for responsive design
- Flexbox layout: More complex for two-dimensional grid
- Canvas/SVG: Overkill for static schedule display

## Vue Calendar Component Patterns

### Decision: Composition API with Reactive Time Slots
**Rationale**: Vue 3 Composition API provides better logic reusability and TypeScript integration. Reactive computed properties automatically update when schedule data changes.

**Best practices**:
- Use computed properties for derived calendar data
- Separate time slot generation from lesson rendering
- Implement virtual scrolling for performance with many lessons

## Horizontal Scrolling Implementation

### Decision: CSS `overflow-x: auto` with Flex Layout
**Rationale**: Native browser scrolling provides better accessibility and performance than custom scroll implementations.

**Implementation approach**:
- Time slots as flex containers
- Lesson cards as flex items with min-width
- CSS scroll-snap for better UX on time boundaries

## State Management for Calendar

### Decision: Dedicated Calendar Pinia Store
**Rationale**: Separates calendar-specific state from general schedule management. Enables better caching and performance optimization.

**Store structure**:
- Selected class/schedule state
- Computed calendar layout data
- UI state (selected time slots, view preferences)

## Performance Optimization Strategies

### Decision: Computed Properties + Memoization
**Rationale**: Vue's reactivity system combined with strategic memoization meets the <2s load requirement.

**Techniques**:
- Memoize time slot calculations
- Lazy load lesson details
- Virtual scrolling for large schedules
- Debounced search for class selector

## Integration with Existing Data Model

### Decision: Extend Existing API, No Backend Changes
**Rationale**: User requirement to keep backend unchanged. Existing data model from 001-schedule-builder provides all needed entities.

**API usage**:
- GET /schedules for schedule list
- GET /schedules/:id for schedule details with lessons
- GET /classes for class selector options
- Leverage existing Lesson, Class, Group relationships

## Accessibility Considerations

### Decision: ARIA Grid Pattern with Keyboard Navigation
**Rationale**: Screen readers can understand calendar structure. Keyboard navigation enables time slot selection.

**Implementation**:
- role="grid" on calendar container
- role="gridcell" on time slots
- ARIA labels for time/lesson information
- Tab navigation through lessons
- Arrow key navigation through time slots

## Responsive Design Strategy

### Decision: Mobile-first with Collapsible Days
**Rationale**: Calendar needs to work on tablets and phones. Stack days vertically on smaller screens.

**Breakpoints**:
- Mobile: Single day view with day selector
- Tablet: 3-day view with horizontal scroll
- Desktop: Full 5-day week view

## Component Architecture

### Decision: Composition of Specialized Components
**Rationale**: Follows existing component patterns in the app. Enables reusability and testing.

**Component hierarchy**:
```
CalendarGrid (main container)
├── ClassSelector (dropdown with search)
├── ScheduleSelector (dropdown)
├── CalendarHeader (day labels)
├── TimeSlotGrid (time labels + slots)
│   └── LessonCard (individual lessons)
└── EmptyState (no lessons message)
```

## Time Zone Handling

### Decision: Local Time Display Only
**Rationale**: School schedules are location-specific. No timezone conversion needed for MVP.

**Implementation**: Display times as received from backend without conversion.

## Error Handling Strategy

### Decision: Graceful Degradation with User Feedback
**Rationale**: Calendar should remain functional even with partial data failures.

**Error scenarios**:
- Schedule load failure: Show cached data + error message
- Class load failure: Disable selector + error message
- Lesson render failure: Show placeholder + retry option