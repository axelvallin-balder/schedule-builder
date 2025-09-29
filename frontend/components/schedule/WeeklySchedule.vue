<template>
  <div
    class="weekly-schedule"
    :class="{
      'weekly-schedule--mobile': viewMode === 'mobile'
    }"
    :data-testid="'weekly-schedule-grid'"
    :role="'grid'"
    :aria-label="'Weekly Schedule'"
    :tabindex="0"
    @keydown="handleKeyDown"
  >
    <!-- Desktop Grid View -->
    <div
      v-if="viewMode !== 'mobile'"
      class="weekly-schedule__desktop-grid"
      :data-testid="'desktop-schedule-grid'"
    >
      <!-- Header row with day names -->
      <div class="weekly-schedule__header">
        <div class="weekly-schedule__time-column-header">Time</div>
        <div
          v-for="day in weekdays"
          :key="day.number"
          class="weekly-schedule__day-header"
          :data-testid="'day-header'"
        >
          {{ day.name }}
        </div>
      </div>
      
      <!-- Time slots and lessons -->
      <div class="weekly-schedule__grid-body">
        <div
          v-for="timeSlot in timeSlots"
          :key="timeSlot.time"
          class="weekly-schedule__time-row"
        >
          <!-- Time label -->
          <div
            class="weekly-schedule__time-label"
            :data-testid="'time-slot'"
            :data-time="timeSlot.time"
          >
            {{ timeSlot.time }}
          </div>
          
          <!-- Day columns -->
          <div
            v-for="day in weekdays"
            :key="`${timeSlot.time}-${day.number}`"
            class="weekly-schedule__day-cell"
            :class="{
              'weekly-schedule__day-cell--current': isCurrentTimeSlot(day.number, timeSlot.time)
            }"
            @click="handleTimeSlotClick(day.number, timeSlot.time)"
          >
            <!-- Current time indicator -->
            <div
              v-if="highlightCurrentTime && isCurrentTimeSlot(day.number, timeSlot.time)"
              class="weekly-schedule__current-time-indicator"
              :data-testid="'current-time-indicator'"
            />
            
            <!-- Lessons in this time slot -->
            <div
              v-for="lesson in getLessonsForSlot(day.number, timeSlot.time)"
              :key="lesson.id"
              class="weekly-schedule__lesson-container"
              :class="{
                'weekly-schedule__lesson-container--conflict': hasLessonConflict(lesson)
              }"
            >
              <LessonCard
                :lesson="lesson"
                :course="getCourseForLesson(lesson)"
                :teacher="getTeacherForLesson(lesson)"
                :groups="getGroupsForLesson(lesson)"
                :subject="getSubjectForLesson(lesson)"
                :has-conflict="hasLessonConflict(lesson)"
                :is-selected="selectedLessonId === lesson.id"
                :compact="true"
                @click="handleLessonClick"
              />
            </div>
            
            <!-- Empty slot indicator -->
            <div
              v-if="getLessonsForSlot(day.number, timeSlot.time).length === 0"
              class="weekly-schedule__empty-slot"
              :data-testid="'empty-slot'"
              :data-day="day.number"
              :data-time="timeSlot.time"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- Mobile View -->
    <div
      v-else
      class="weekly-schedule__mobile-view"
      :data-testid="'mobile-schedule-view'"
    >
      <div
        v-for="day in weekdays"
        :key="day.number"
        class="weekly-schedule__mobile-day"
      >
        <h3 class="weekly-schedule__mobile-day-header">{{ day.name }}</h3>
        <div class="weekly-schedule__mobile-lessons">
          <LessonCard
            v-for="lesson in getLessonsForDay(day.number)"
            :key="lesson.id"
            :lesson="lesson"
            :course="getCourseForLesson(lesson)"
            :teacher="getTeacherForLesson(lesson)"
            :groups="getGroupsForLesson(lesson)"
            :subject="getSubjectForLesson(lesson)"
            :has-conflict="hasLessonConflict(lesson)"
            :is-selected="selectedLessonId === lesson.id"
            @click="handleLessonClick"
          />
        </div>
      </div>
    </div>
    
    <!-- Conflict indicators summary -->
    <div
      v-if="conflictedLessons.length > 0"
      class="weekly-schedule__conflicts"
    >
      <div
        v-for="conflict in conflictedLessons"
        :key="conflict.id"
        class="weekly-schedule__conflict"
        :data-testid="'conflict-indicator'"
      >
        Conflict: {{ getSubjectForLesson(conflict).name }} at {{ conflict.startTime }}
      </div>
    </div>
    
    <!-- Screen reader announcements -->
    <div
      class="sr-only"
      :aria-live="'polite'"
    >
      {{ screenReaderAnnouncement }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import LessonCard from './LessonCard.vue'

// Types
interface Lesson {
  id: string
  courseId: string
  teacherId: string
  groupIds: string[]
  startTime: string
  endTime: string
  dayOfWeek: number
  classroom?: string
}

interface Schedule {
  id: string
  name: string
  weekNumber: number
  year: number
  status: 'draft' | 'active' | 'archived'
  lessons: Lesson[]
}

interface Course {
  id: string
  subjectId: string
  teacherId: string | null
  groupIds: string[]
  weeklyHours: number
  numberOfLessons: number
}

interface Teacher {
  id: string
  name: string
  subjectIds: string[]
}

interface Group {
  id: string
  name: string
  classId: string
}

interface Subject {
  id: string
  name: string
  color: string
}

// Props
const props = withDefaults(defineProps<{
  schedule: Schedule
  courses?: Course[]
  teachers?: Teacher[]
  groups?: Group[]
  subjects?: Subject[]
  viewMode?: 'desktop' | 'mobile'
  highlightCurrentTime?: boolean
  virtualizeRows?: boolean
}>(), {
  courses: () => [],
  teachers: () => [],
  groups: () => [],
  subjects: () => [],
  viewMode: 'desktop',
  highlightCurrentTime: false,
  virtualizeRows: false
})

// Emits
const emit = defineEmits<{
  'lesson-click': [lesson: Lesson]
  'time-slot-click': [slot: { dayOfWeek: number; time: string }]
  navigate: [direction: string]
}>()

// Reactive state
const selectedLessonId = ref<string | null>(null)
const screenReaderAnnouncement = ref('')

// Constants
const weekdays = [
  { number: 1, name: 'Monday' },
  { number: 2, name: 'Tuesday' },
  { number: 3, name: 'Wednesday' },
  { number: 4, name: 'Thursday' },
  { number: 5, name: 'Friday' }
]

// Generate time slots from 08:15 to 16:00 in 45-minute intervals
const timeSlots = computed(() => {
  const slots = []
  const startHour = 8
  const startMinute = 15
  const endHour = 16
  const endMinute = 0
  
  for (let hour = startHour; hour <= endHour; hour++) {
    if (hour === startHour) {
      slots.push({ time: `${hour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}` })
    } else if (hour === endHour) {
      if (endMinute > 0) {
        slots.push({ time: `${hour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}` })
      }
    } else {
      slots.push({ time: `${hour.toString().padStart(2, '0')}:00` })
      if (hour < endHour - 1 || (hour === endHour - 1 && endMinute > 45)) {
        slots.push({ time: `${hour.toString().padStart(2, '0')}:45` })
      }
    }
  }
  
  return slots
})

// Computed properties
const conflictedLessons = computed(() => {
  return props.schedule.lessons.filter(lesson => hasLessonConflict(lesson))
})

// Mock data for now - in real implementation, these would come from props or stores
const mockCourses: Course[] = [
  { id: 'course-1', subjectId: 'subject-1', teacherId: 'teacher-1', groupIds: ['group-1'], weeklyHours: 3, numberOfLessons: 2 },
  { id: 'course-2', subjectId: 'subject-2', teacherId: 'teacher-2', groupIds: ['group-1'], weeklyHours: 3, numberOfLessons: 2 }
]

const mockTeachers: Teacher[] = [
  { id: 'teacher-1', name: 'John Doe', subjectIds: ['subject-1'] },
  { id: 'teacher-2', name: 'Jane Smith', subjectIds: ['subject-2'] }
]

const mockGroups: Group[] = [
  { id: 'group-1', name: 'Class 9A', classId: 'class-1' },
  { id: 'group-2', name: 'Class 9B', classId: 'class-1' }
]

const mockSubjects: Subject[] = [
  { id: 'subject-1', name: 'Mathematics', color: '#3B82F6' },
  { id: 'subject-2', name: 'English', color: '#10B981' }
]

// Helper functions
const getLessonsForSlot = (dayOfWeek: number, time: string) => {
  return props.schedule.lessons.filter(lesson => {
    return lesson.dayOfWeek === dayOfWeek && lesson.startTime <= time && lesson.endTime > time
  })
}

const getLessonsForDay = (dayOfWeek: number) => {
  return props.schedule.lessons
    .filter(lesson => lesson.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

const getCourseForLesson = (lesson: Lesson): Course => {
  const course = (props.courses.length > 0 ? props.courses : mockCourses)
    .find(c => c.id === lesson.courseId)
  return course || mockCourses[0]
}

const getTeacherForLesson = (lesson: Lesson): Teacher => {
  const teacher = (props.teachers.length > 0 ? props.teachers : mockTeachers)
    .find(t => t.id === lesson.teacherId)
  return teacher || mockTeachers[0]
}

const getGroupsForLesson = (lesson: Lesson): Group[] => {
  const groups = (props.groups.length > 0 ? props.groups : mockGroups)
    .filter(g => lesson.groupIds.includes(g.id))
  return groups.length > 0 ? groups : [mockGroups[0]]
}

const getSubjectForLesson = (lesson: Lesson): Subject => {
  const course = getCourseForLesson(lesson)
  const subject = (props.subjects.length > 0 ? props.subjects : mockSubjects)
    .find(s => s.id === course.subjectId)
  return subject || mockSubjects[0]
}

const hasLessonConflict = (lesson: Lesson): boolean => {
  // Check for overlapping lessons with same groups
  return props.schedule.lessons.some(otherLesson => {
    if (otherLesson.id === lesson.id) return false
    if (otherLesson.dayOfWeek !== lesson.dayOfWeek) return false
    
    // Check time overlap
    const timeOverlap = (
      (lesson.startTime < otherLesson.endTime && lesson.endTime > otherLesson.startTime)
    )
    
    // Check group overlap
    const groupOverlap = lesson.groupIds.some(groupId => 
      otherLesson.groupIds.includes(groupId)
    )
    
    return timeOverlap && groupOverlap
  })
}

const isCurrentTimeSlot = (dayOfWeek: number, time: string): boolean => {
  if (!props.highlightCurrentTime) return false
  
  const now = new Date()
  const currentDay = now.getDay() === 0 ? 7 : now.getDay() // Convert Sunday from 0 to 7
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  
  return dayOfWeek === currentDay && time === currentTime
}

// Event handlers
const handleLessonClick = (lesson: Lesson) => {
  selectedLessonId.value = lesson.id
  emit('lesson-click', lesson)
}

const handleTimeSlotClick = (dayOfWeek: number, time: string) => {
  emit('time-slot-click', { dayOfWeek, time })
}

const handleKeyDown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowRight':
      emit('navigate', 'right')
      break
    case 'ArrowLeft':
      emit('navigate', 'left')
      break
    case 'ArrowUp':
      emit('navigate', 'up')
      break
    case 'ArrowDown':
      emit('navigate', 'down')
      break
  }
}

// Watch for schedule changes to announce to screen readers
watch(() => props.schedule.lessons.length, (newCount, oldCount) => {
  if (newCount > oldCount) {
    screenReaderAnnouncement.value = `Schedule updated: ${newCount - oldCount} lesson(s) added`
  } else if (newCount < oldCount) {
    screenReaderAnnouncement.value = `Schedule updated: ${oldCount - newCount} lesson(s) removed`
  }
})
</script>

<style scoped>
.weekly-schedule {
  @apply w-full h-full overflow-auto;
}

.weekly-schedule__desktop-grid {
  @apply min-w-full;
}

.weekly-schedule__header {
  @apply sticky top-0 z-10 bg-gray-50 border-b border-gray-200 grid grid-cols-6 gap-0;
}

.weekly-schedule__time-column-header {
  @apply p-3 text-sm font-medium text-gray-700 border-r border-gray-200;
}

.weekly-schedule__day-header {
  @apply p-3 text-sm font-medium text-gray-700 text-center border-r border-gray-200;
}

.weekly-schedule__grid-body {
  @apply divide-y divide-gray-200;
}

.weekly-schedule__time-row {
  @apply grid grid-cols-6 gap-0 min-h-16;
}

.weekly-schedule__time-label {
  @apply p-2 text-xs text-gray-600 border-r border-gray-200 flex items-start justify-center;
}

.weekly-schedule__day-cell {
  @apply relative border-r border-gray-200 min-h-16 p-1 cursor-pointer transition-colors;
  @apply hover:bg-gray-50;
}

.weekly-schedule__day-cell--current {
  @apply bg-blue-50 border-blue-200;
}

.weekly-schedule__current-time-indicator {
  @apply absolute top-0 left-0 right-0 h-0.5 bg-red-500 z-20;
}

.weekly-schedule__lesson-container {
  @apply relative mb-1;
}

.weekly-schedule__lesson-container--conflict {
  @apply animate-pulse;
}

.weekly-schedule__empty-slot {
  @apply absolute inset-0 opacity-0 hover:opacity-10 hover:bg-blue-200 transition-opacity;
}

.weekly-schedule__mobile-view {
  @apply space-y-4;
}

.weekly-schedule__mobile-day {
  @apply bg-white rounded-lg shadow p-4;
}

.weekly-schedule__mobile-day-header {
  @apply text-lg font-semibold text-gray-900 mb-3;
}

.weekly-schedule__mobile-lessons {
  @apply space-y-2;
}

.weekly-schedule__conflicts {
  @apply mt-4 p-3 bg-red-50 border border-red-200 rounded-lg;
}

.weekly-schedule__conflict {
  @apply text-sm text-red-700 mb-1;
}

.sr-only {
  @apply absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0;
  clip: rect(0, 0, 0, 0);
}

/* Mobile responsive adjustments */
.weekly-schedule--mobile .weekly-schedule__desktop-grid {
  @apply hidden;
}

@media (max-width: 768px) {
  .weekly-schedule__desktop-grid {
    @apply text-xs;
  }
  
  .weekly-schedule__time-row {
    @apply min-h-12;
  }
  
  .weekly-schedule__day-cell {
    @apply min-h-12 p-0.5;
  }
}
</style>