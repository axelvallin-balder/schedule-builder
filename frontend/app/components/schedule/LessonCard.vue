<template>
  <div
    :class="[
      'lesson-card',
      {
        'lesson-card--conflict': hasConflict,
        'lesson-card--selected': isSelected,
        'lesson-card--disabled': disabled,
        'lesson-card--compact': compact
      }
    ]"
    :style="cardStyle"
    :data-testid="'lesson-card'"
    :data-lesson-id="lesson.id"
    :data-day="lesson.dayOfWeek"
    :draggable="draggable"
    :aria-label="lessonAriaLabel"
    :role="'button'"
    :tabindex="disabled ? -1 : 0"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @contextmenu="handleContextMenu"
    @keydown="handleKeyDown"
    @mouseenter="showTooltip = true"
    @mouseleave="showTooltip = false"
  >
    <!-- Subject color indicator -->
    <div
      class="lesson-card__subject-indicator"
      :style="{ backgroundColor: subject.color }"
      :data-testid="'subject-indicator'"
    />
    
    <!-- Main content -->
    <div class="lesson-card__content">
      <!-- Time display -->
      <div class="lesson-card__time">
        {{ lesson.startTime }} - {{ lesson.endTime }}
      </div>
      
      <!-- Subject name -->
      <div class="lesson-card__subject">
        {{ subject.name }}
      </div>
      
      <!-- Teacher name (if not compact/minimal) -->
      <div
        v-if="!compact && viewMode !== 'minimal'"
        class="lesson-card__teacher"
        :data-testid="'teacher-name'"
      >
        {{ teacher.name }}
      </div>
      
      <!-- Classroom (if not compact/minimal) -->
      <div
        v-if="!compact && viewMode !== 'minimal' && lesson.classroom"
        class="lesson-card__classroom"
        :data-testid="'classroom'"
      >
        {{ lesson.classroom }}
      </div>
      
      <!-- Groups -->
      <div class="lesson-card__groups">
        <span
          v-for="group in groups"
          :key="group.id"
          class="lesson-card__group"
        >
          {{ group.name }}
        </span>
      </div>
    </div>
    
    <!-- Conflict indicator -->
    <div
      v-if="hasConflict"
      class="lesson-card__conflict-indicator"
      :data-testid="'conflict-indicator'"
      @mouseenter="showConflictTooltip = true"
      @mouseleave="showConflictTooltip = false"
    >
      ⚠️
    </div>
    
    <!-- Tooltip -->
    <div
      v-if="showTooltip"
      class="lesson-card__tooltip"
      :data-testid="'lesson-tooltip'"
    >
      <div><strong>{{ subject.name }}</strong></div>
      <div>{{ teacher.name }}</div>
      <div v-if="lesson.classroom">{{ lesson.classroom }}</div>
      <div>{{ lesson.startTime }} - {{ lesson.endTime }}</div>
      <div>{{ groups.map(g => g.name).join(', ') }}</div>
    </div>
    
    <!-- Conflict tooltip -->
    <div
      v-if="showConflictTooltip && hasConflict"
      class="lesson-card__conflict-tooltip"
      :data-testid="'conflict-tooltip'"
    >
      {{ conflictReason || 'Schedule conflict detected' }}
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
import { computed, ref, watch } from 'vue'

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
  lesson: Lesson
  course: Course
  teacher: Teacher
  groups: Group[]
  subject: Subject
  hasConflict?: boolean
  isSelected?: boolean
  disabled?: boolean
  compact?: boolean
  draggable?: boolean
  viewMode?: 'normal' | 'minimal'
  conflictReason?: string
}>(), {
  hasConflict: false,
  isSelected: false,
  disabled: false,
  compact: false,
  draggable: false,
  viewMode: 'normal',
  conflictReason: ''
})

// Emits
const emit = defineEmits<{
  click: [lesson: Lesson]
  edit: [lesson: Lesson]
  'context-menu': [event: MouseEvent, lesson: Lesson]
}>()

// Reactive state
const showTooltip = ref(false)
const showConflictTooltip = ref(false)
const screenReaderAnnouncement = ref('')

// Computed properties
const lessonAriaLabel = computed(() => {
  return `${props.subject.name} lesson with ${props.teacher.name} from ${props.lesson.startTime} to ${props.lesson.endTime} in ${props.lesson.classroom || 'unassigned room'} for ${props.groups.map(g => g.name).join(', ')}`
})

const cardStyle = computed(() => {
  // Calculate height based on lesson duration
  const startTime = new Date(`1970-01-01T${props.lesson.startTime}:00`)
  const endTime = new Date(`1970-01-01T${props.lesson.endTime}:00`)
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60)
  
  // Base height of 45 minutes = 60px, scale proportionally
  const height = Math.max(40, (durationMinutes / 45) * 60)
  
  return {
    height: `${height}px`,
    minHeight: '40px'
  }
})

// Event handlers
const handleClick = () => {
  if (!props.disabled) {
    emit('click', props.lesson)
  }
}

const handleDoubleClick = () => {
  if (!props.disabled) {
    emit('edit', props.lesson)
  }
}

const handleContextMenu = (event: MouseEvent) => {
  if (!props.disabled) {
    event.preventDefault()
    emit('context-menu', event, props.lesson)
  }
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (!props.disabled && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault()
    emit('click', props.lesson)
  }
}

// Watch for conflict changes to announce to screen readers
watch(() => props.hasConflict, (newValue, oldValue) => {
  if (newValue && !oldValue) {
    screenReaderAnnouncement.value = `Conflict detected for ${props.subject.name} lesson`
  } else if (!newValue && oldValue) {
    screenReaderAnnouncement.value = `Conflict resolved for ${props.subject.name} lesson`
  }
})
</script>

<style scoped>
.lesson-card {
  @apply relative bg-white border border-gray-200 rounded-lg shadow-sm cursor-pointer transition-all duration-200 overflow-hidden;
  @apply hover:shadow-md hover:border-gray-300;
}

.lesson-card--conflict {
  @apply border-red-500 bg-red-50;
}

.lesson-card--selected {
  @apply ring-2 ring-blue-500 border-blue-500;
}

.lesson-card--disabled {
  @apply cursor-not-allowed opacity-60;
}

.lesson-card--compact {
  @apply text-xs;
}

.lesson-card__subject-indicator {
  @apply absolute left-0 top-0 bottom-0 w-1;
}

.lesson-card__content {
  @apply p-2 pl-3;
}

.lesson-card__time {
  @apply text-xs font-medium text-gray-600 mb-1;
}

.lesson-card__subject {
  @apply text-sm font-semibold text-gray-900 mb-1 truncate;
}

.lesson-card__teacher {
  @apply text-xs text-gray-700 mb-1 truncate;
}

.lesson-card__classroom {
  @apply text-xs text-gray-600 mb-1 truncate;
}

.lesson-card__groups {
  @apply flex flex-wrap gap-1;
}

.lesson-card__group {
  @apply text-xs px-1 py-0.5 bg-gray-100 text-gray-700 rounded truncate;
}

.lesson-card__conflict-indicator {
  @apply absolute top-1 right-1 text-red-500 cursor-help;
}

.lesson-card__tooltip {
  @apply absolute z-50 bg-gray-900 text-white text-xs rounded px-2 py-1 bottom-full left-1/2 transform -translate-x-1/2 mb-1;
  @apply pointer-events-none opacity-0 transition-opacity duration-200;
}

.lesson-card:hover .lesson-card__tooltip {
  @apply opacity-100;
}

.lesson-card__conflict-tooltip {
  @apply absolute z-50 bg-red-600 text-white text-xs rounded px-2 py-1 bottom-full right-0 mb-1;
  @apply pointer-events-none opacity-0 transition-opacity duration-200;
}

.lesson-card__conflict-indicator:hover + .lesson-card__conflict-tooltip {
  @apply opacity-100;
}

.sr-only {
  @apply absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0;
  clip: rect(0, 0, 0, 0);
}

/* Compact mode adjustments */
.lesson-card--compact .lesson-card__content {
  @apply p-1 pl-2;
}

.lesson-card--compact .lesson-card__subject {
  @apply text-xs mb-0;
}

.lesson-card--compact .lesson-card__time {
  @apply text-xs mb-0;
}
</style>