// Calendar Schedule Display - TypeScript Interfaces
// Auto-generated from data-model.md specifications

export interface CalendarTimeSlot {
  startTime: string;        // HH:mm format
  endTime: string;          // HH:mm format
  dayOfWeek: number;        // 1-5 (Monday-Friday)
  lessons: CalendarLesson[]; // lessons in this slot
  isEmpty: boolean;
}

export interface CalendarLesson {
  id: string;
  subjectName: string;      // from Subject entity
  teacherName: string;      // from Teacher entity
  groupNames: string[];     // from Group entities via Course
  startTime: string;        // HH:mm format
  duration: number;         // in minutes
  roomId: string | null;
  dayOfWeek: number;
  // UI-specific properties
  gridRowStart: number;     // CSS grid positioning
  gridRowSpan: number;      // CSS grid span
  position: number;         // horizontal position for overlapping lessons
}

export interface CalendarWeek {
  scheduleId: string;
  scheduleName: string;
  className: string;
  timeSlots: CalendarTimeSlot[];
  days: CalendarDay[];
  isEmpty: boolean;
}

export interface CalendarDay {
  dayOfWeek: number;        // 1-5 (Monday-Friday)
  dayName: string;          // 'Monday', 'Tuesday', etc.
  date: string;             // ISO date string
  lessons: CalendarLesson[];
  isEmpty: boolean;
}

export interface ClassOption {
  id: string;
  name: string;
  groupCount: number;       // number of groups in class
  searchText: string;       // for dropdown filtering
}

export interface ScheduleOption {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'archived';
  weekNumber: number;
  year: number;
  isDefault: boolean;       // true for latest active schedule
}

// Calendar store state interface
export interface CalendarState {
  selectedScheduleId: string | null;
  selectedClassId: string | null;
  availableSchedules: ScheduleOption[];
  availableClasses: ClassOption[];
  currentCalendarWeek: CalendarWeek | null;
  isLoading: boolean;
  error: string | null;
  // UI state
  viewMode: 'week' | 'day';
  selectedDay: number; // for mobile day view
}

// Time utility types
export interface TimeRange {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

export interface GridPosition {
  rowStart: number;
  rowSpan: number;
  columnStart?: number;
  columnSpan?: number;
}

// Data transformation types
export interface LessonEnrichmentData {
  lesson: any; // Raw lesson from API
  course: any; // Raw course from API  
  teacher: any; // Raw teacher from API
  subject: any; // Raw subject from API
  groups: any[]; // Raw groups from API
}

export interface CalendarConfiguration {
  timeSlotDuration: number; // minutes
  displayTimeRange: TimeRange;
  workingDays: number[]; // [1,2,3,4,5] for Monday-Friday
  gridSlotHeight: number; // CSS grid row height in px
}