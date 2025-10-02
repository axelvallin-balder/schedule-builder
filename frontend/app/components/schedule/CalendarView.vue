<template>
  <div class="calendar-view" data-testid="calendar-view" role="application" aria-label="Schedule Calendar View">
    <!-- Calendar header -->
    <div class="calendar-header mb-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 class="text-lg font-semibold text-gray-900" id="calendar-title">
          {{ viewMode === 'week' ? 'Weekly Schedule' : 'Daily Schedule' }}
        </h2>
        <div class="flex items-center space-x-2 text-sm text-gray-600" aria-describedby="calendar-title">
          <span v-if="currentWeek">{{ formatWeekLabel(currentWeek) }}</span>
          <span v-if="viewMode === 'day' && selectedDayName">{{ selectedDayName }}</span>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-container flex items-center justify-center h-64" data-testid="calendar-loading" role="status" aria-live="polite">
      <div class="text-center">
        <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" aria-hidden="true"></div>
        <p class="text-gray-600">Loading schedule data, please wait...</p>
        <span class="sr-only">Loading schedule information</span>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error-container" data-testid="calendar-error">
      <div class="bg-red-50 border border-red-200 rounded-md p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error loading schedule</h3>
            <p class="mt-1 text-sm text-red-700">{{ error }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!currentWeek || (viewMode === 'week' && currentWeek.days.length === 0)" class="empty-state" data-testid="calendar-empty">
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No schedule data</h3>
        <p class="mt-1 text-sm text-gray-500">Select a schedule and class to view the calendar</p>
      </div>
    </div>

    <!-- Calendar grid -->
    <div v-else class="calendar-container">
      <!-- Week view -->
      <div v-if="viewMode === 'week'" class="week-view" data-testid="week-view">
        <div 
          class="calendar-grid" 
          :style="gridStyle"
          role="grid"
          :aria-labelledby="'calendar-title'"
          :aria-rowcount="timeSlots.length + 1"
          :aria-colcount="currentWeek.days.length + 1"
          @keydown="handleGridKeyDown"
          tabindex="0"
        >
          <!-- Time column header -->
          <div class="time-header grid-time-header"></div>

          <!-- Day headers -->
          <div
            v-for="day in currentWeek.days"
            :key="day.dayOfWeek"
            class="day-header grid-day-header"
            :class="{ 'today': isToday(day) }"
          >
            <div class="day-name">{{ getDayName(day.dayOfWeek) }}</div>
            <div class="day-date">{{ formatDate(day.date) }}</div>
            <div v-if="day.lessons.length > 0" class="lesson-count">
              {{ day.lessons.length }} lessons
            </div>
          </div>

          <!-- Time slots -->
          <template v-for="(timeSlot, index) in timeSlots" :key="`${timeSlot.startTime}-${timeSlot.endTime}`">
            <!-- Time label -->
            <div class="time-slot grid-time-slot" :style="{ gridRow: index + 2 }">
              <div class="time-label">
                <span class="time-start">{{ timeSlot.startTime }}</span>
                <span class="time-end">{{ timeSlot.endTime }}</span>
              </div>
            </div>

            <!-- Lesson cards for each day -->
            <template v-for="day in currentWeek.days" :key="`${timeSlot.startTime}-${day.dayOfWeek}`">
              <CalendarLessonCard
                v-for="lesson in getLessonsForTimeSlot(day, timeSlot)"
                :key="lesson.id"
                :lesson="lesson"
                :view-mode="viewMode === 'week' ? 'normal' : 'minimal'"
                :class="'lesson-card'"
                :style="getLessonStyle(lesson)"
                @lesson-clicked="onLessonClick"
              />
            </template>
          </template>
        </div>
      </div>

      <!-- Day view -->
      <div v-else class="day-view" data-testid="day-view">
        <div v-if="selectedDay" class="day-container">
          <div class="day-schedule">
            <!-- Time slots for selected day -->
            <div
              v-for="(timeSlot, index) in timeSlots"
              :key="`${timeSlot.startTime}-${timeSlot.endTime}`"
              class="time-slot-row"
              :class="{ 'has-lessons': getLessonsForTimeSlot(selectedDay, timeSlot).length > 0 }"
            >
              <div class="time-label">
                <span class="time-range">{{ timeSlot.startTime }} - {{ timeSlot.endTime }}</span>
              </div>
              <div class="lesson-content">
                <CalendarLessonCard
                  v-for="lesson in getLessonsForTimeSlot(selectedDay, timeSlot)"
                  :key="lesson.id"
                  :lesson="lesson"
                  :view-mode="'normal'"
                  class="mb-2"
                  @lesson-clicked="onLessonClick"
                />
                <div v-if="getLessonsForTimeSlot(selectedDay, timeSlot).length === 0" class="empty-slot">
                  <span class="text-gray-400 text-sm">No lessons</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { CalendarWeek, CalendarDay, CalendarTimeSlot, CalendarLesson } from '../../../types/calendar'
import CalendarLessonCard from './CalendarLessonCard.vue'

interface Props {
  currentWeek: CalendarWeek | null
  viewMode: 'week' | 'day'
  selectedDayOfWeek: number
  loading?: boolean
  error?: string | null
}

interface Emits {
  'lesson-clicked': [lesson: CalendarLesson]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null
})

const emit = defineEmits<Emits>()

// Computed properties
const selectedDay = computed(() => {
  if (!props.currentWeek || props.viewMode !== 'day') return null
  return props.currentWeek.days.find(day => day.dayOfWeek === props.selectedDayOfWeek) || null
})

const selectedDayName = computed(() => {
  if (!selectedDay.value) return ''
  return getDayName(selectedDay.value.dayOfWeek)
})

const timeSlots = computed(() => {
  if (!props.currentWeek) return []
  return props.currentWeek.timeSlots || []
})

const gridStyle = computed(() => {
  if (!props.currentWeek || props.viewMode !== 'week') return {}
  
  const dayCount = props.currentWeek.days.length
  const maxTimeSlots = timeSlots.value.length
  
  return {
    gridTemplateColumns: `60px repeat(${dayCount}, 1fr)`,
    gridTemplateRows: `auto repeat(${maxTimeSlots}, minmax(60px, auto))`
  }
})

// Methods
const getDayName = (dayOfWeek: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayOfWeek] || 'Unknown'
}

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })
}

const formatWeekLabel = (week: CalendarWeek): string => {
  if (week.days.length > 0) {
    const firstDay = new Date(week.days[0]?.date || '')
    const lastDay = new Date(week.days[week.days.length - 1]?.date || '')
    return `${firstDay.toLocaleDateString()} - ${lastDay.toLocaleDateString()}`
  }
  return ''
}

const isToday = (day: CalendarDay): boolean => {
  const today = new Date()
  const dayDate = new Date(day.date)
  return today.toDateString() === dayDate.toDateString()
}

const getLessonsForTimeSlot = (day: CalendarDay, timeSlot: CalendarTimeSlot): CalendarLesson[] => {
  return day.lessons.filter(lesson => 
    lesson.startTime >= timeSlot.startTime && lesson.startTime < timeSlot.endTime
  )
}

const getLessonStyle = (lesson: CalendarLesson) => {
  return {
    gridRow: `${lesson.gridRowStart} / span ${lesson.gridRowSpan}`,
    gridColumn: lesson.position + 2 // +2 to account for time column and 1-based grid
  }
}

const onLessonClick = (lesson: CalendarLesson) => {
  emit('lesson-clicked', lesson)
}

const handleGridKeyDown = (event: KeyboardEvent) => {
  // Basic keyboard navigation for accessibility
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'ArrowDown':
      event.preventDefault()
      // Focus management for grid navigation
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      // Activate focused cell
      break
    case 'Escape':
      event.preventDefault()
      // Return focus to parent
      break
  }
}

// Watchers
watch(() => props.currentWeek, (newWeek) => {
  if (newWeek) {
    console.log('Calendar week updated:', newWeek)
  }
}, { immediate: true })
</script>

<style scoped>
.calendar-view {
  @apply w-full max-w-full;
}

.calendar-grid {
  @apply grid gap-1 min-h-0;
  grid-auto-rows: minmax(60px, auto);
}

.grid-time-header {
  @apply bg-gray-50 border-r border-gray-200 p-2;
  grid-column: 1;
  grid-row: 1;
}

.grid-day-header {
  @apply bg-blue-50 border border-blue-200 p-3 text-center rounded-t-md;
  grid-row: 1;
}

.grid-day-header.today {
  @apply bg-blue-100 border-blue-300;
}

.day-name {
  @apply font-semibold text-gray-900 text-sm;
}

.day-date {
  @apply text-xs text-gray-600 mt-1;
}

.lesson-count {
  @apply text-xs text-blue-600 mt-1 font-medium;
}

.grid-time-slot {
  @apply bg-gray-50 border-r border-gray-200 p-2 text-xs text-gray-600;
  grid-column: 1;
}

.time-label {
  @apply text-center;
}

.time-start {
  @apply block font-medium;
}

.time-end {
  @apply block text-gray-500;
}

.lesson-card {
  @apply z-10;
  grid-column-start: var(--grid-column);
  grid-row-start: var(--grid-row-start);
  grid-row-end: span var(--grid-row-span);
}

/* Day view styles */
.day-view .time-slot-row {
  @apply border-b border-gray-200 py-4 flex;
}

.day-view .time-slot-row.has-lessons {
  @apply bg-blue-50;
}

.day-view .time-label {
  @apply w-24 flex-shrink-0 pr-4 text-right;
}

.day-view .time-range {
  @apply text-sm font-medium text-gray-900;
}

.day-view .lesson-content {
  @apply flex-1 pl-4;
}

.day-view .empty-slot {
  @apply flex items-center h-12;
}

/* Responsive design */
@media (max-width: 767px) {
  .calendar-grid {
    font-size: 0.75rem;
  }
  
  .grid-day-header {
    @apply p-2;
  }
  
  .grid-time-slot {
    @apply p-1;
  }
  
  .day-view .time-label {
    @apply w-20 text-xs;
  }
}

/* Loading animation */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>