<template>
  <div class="enhanced-lesson-card" data-testid="enhanced-lesson-card">
    <!-- Existing LessonCard for full data -->
    <LessonCard
      v-if="hasFullData"
      :lesson="lesson"
      :course="course"
      :teacher="teacher"
      :groups="groups"
      :subject="subject"
      :has-conflict="hasConflict"
      :is-selected="isSelected"
      :disabled="disabled"
      :compact="compact"
      :draggable="draggable"
      :view-mode="viewMode"
      :conflict-reason="conflictReason"
      @click="handleClick"
      @edit="handleEdit"
      @context-menu="handleContextMenu"
    />
    
    <!-- CalendarLessonCard for simplified calendar data -->
    <CalendarLessonCard
      v-else
      :lesson="calendarLesson"
      :view-mode="viewMode === 'normal' ? 'normal' : 'minimal'"
      :is-selected="isSelected"
      @lesson-clicked="handleCalendarClick"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarLesson } from '../../../types/calendar'
import LessonCard from './LessonCard.vue'
import CalendarLessonCard from './CalendarLessonCard.vue'

// Import backend types
interface Lesson {
  id: string
  courseId: string
  teacherId: string
  scheduleId: string
  dayOfWeek: number
  startTime: string
  duration: number
  roomId: string | null
  endTime: string
}

interface Course {
  id: string
  name: string
  subjectId: string
  groupIds: string[]
}

interface Teacher {
  id: string
  name: string
  email: string
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

interface Props {
  // For full lesson display
  lesson?: Lesson
  course?: Course
  teacher?: Teacher
  groups?: Group[]
  subject?: Subject
  
  // For calendar lesson display
  calendarLesson?: CalendarLesson
  
  // Common props
  hasConflict?: boolean
  isSelected?: boolean
  disabled?: boolean
  compact?: boolean
  draggable?: boolean
  viewMode?: 'normal' | 'minimal'
  conflictReason?: string
}

interface Emits {
  'lesson-clicked': [lesson: CalendarLesson | Lesson]
  'lesson-edit': [lesson: Lesson]
  'lesson-context-menu': [event: MouseEvent, lesson: Lesson]
}

const props = withDefaults(defineProps<Props>(), {
  hasConflict: false,
  isSelected: false,
  disabled: false,
  compact: false,
  draggable: false,
  viewMode: 'normal',
  conflictReason: ''
})

const emit = defineEmits<Emits>()

// Computed properties
const hasFullData = computed(() => {
  return !!(props.lesson && props.course && props.teacher && props.groups && props.subject)
})

// Methods
const handleClick = (lesson: Lesson) => {
  emit('lesson-clicked', lesson)
}

const handleEdit = (lesson: Lesson) => {
  emit('lesson-edit', lesson)
}

const handleContextMenu = (event: MouseEvent, lesson: Lesson) => {
  emit('lesson-context-menu', event, lesson)
}

const handleCalendarClick = (lesson: CalendarLesson) => {
  emit('lesson-clicked', lesson)
}
</script>

<style scoped>
.enhanced-lesson-card {
  width: 100%;
  height: 100%;
}
</style>