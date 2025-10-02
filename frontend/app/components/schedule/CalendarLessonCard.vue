<template>
  <div
    :class="[
      'calendar-lesson-card',
      {
        'calendar-lesson-card--selected': isSelected,
        'calendar-lesson-card--minimal': viewMode === 'minimal'
      }
    ]"
    :data-testid="'calendar-lesson-card'"
    :data-lesson-id="lesson.id"
    :data-day="lesson.dayOfWeek"
    :role="'button'"
    :tabindex="0"
    @click="handleClick"
    @keydown="handleKeyDown"
  >
    <!-- Main content -->
    <div class="calendar-lesson-card__content">
      <!-- Time display -->
      <div class="calendar-lesson-card__time">
        {{ lesson.startTime }} - {{ endTime }}
      </div>
      
      <!-- Subject name -->
      <div class="calendar-lesson-card__subject">
        {{ lesson.subjectName }}
      </div>
      
      <!-- Teacher name (if not minimal) -->
      <div
        v-if="viewMode !== 'minimal'"
        class="calendar-lesson-card__teacher"
      >
        {{ lesson.teacherName }}
      </div>
      
      <!-- Groups (if not minimal) -->
      <div
        v-if="viewMode !== 'minimal' && lesson.groupNames.length > 0"
        class="calendar-lesson-card__groups"
      >
        {{ lesson.groupNames.join(', ') }}
      </div>
      
      <!-- Room (if available) -->
      <div
        v-if="lesson.roomId && viewMode !== 'minimal'"
        class="calendar-lesson-card__room"
      >
        Room: {{ lesson.roomId }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarLesson } from '../../../types/calendar'

interface Props {
  lesson: CalendarLesson
  viewMode?: 'normal' | 'minimal'
  isSelected?: boolean
}

interface Emits {
  'lesson-clicked': [lesson: CalendarLesson]
}

const props = withDefaults(defineProps<Props>(), {
  viewMode: 'normal',
  isSelected: false
})

const emit = defineEmits<Emits>()

// Computed properties
const endTime = computed(() => {
  const timeParts = props.lesson.startTime.split(':')
  const hours = parseInt(timeParts[0] || '0', 10)
  const minutes = parseInt(timeParts[1] || '0', 10)
  const totalMinutes = hours * 60 + minutes + props.lesson.duration
  const endHours = Math.floor(totalMinutes / 60)
  const endMins = totalMinutes % 60
  return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
})

// Methods
const handleClick = () => {
  emit('lesson-clicked', props.lesson)
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleClick()
  }
}
</script>

<style scoped>
.calendar-lesson-card {
  @apply bg-white border border-gray-200 rounded-md p-2 shadow-sm cursor-pointer transition-all duration-200;
  @apply hover:bg-blue-50 hover:border-blue-300 hover:shadow-md;
}

.calendar-lesson-card:focus {
  @apply outline-none ring-2 ring-blue-500 ring-offset-1;
}

.calendar-lesson-card--selected {
  @apply bg-blue-100 border-blue-400;
}

.calendar-lesson-card--minimal {
  @apply p-1;
}

.calendar-lesson-card__content {
  @apply space-y-1;
}

.calendar-lesson-card__time {
  @apply text-xs font-medium text-gray-600;
}

.calendar-lesson-card__subject {
  @apply text-sm font-semibold text-gray-900 truncate;
}

.calendar-lesson-card__teacher {
  @apply text-xs text-gray-700 truncate;
}

.calendar-lesson-card__groups {
  @apply text-xs text-blue-600 truncate;
}

.calendar-lesson-card__room {
  @apply text-xs text-gray-500;
}

/* Minimal view adjustments */
.calendar-lesson-card--minimal .calendar-lesson-card__content {
  @apply space-y-0;
}

.calendar-lesson-card--minimal .calendar-lesson-card__time {
  @apply text-xs;
}

.calendar-lesson-card--minimal .calendar-lesson-card__subject {
  @apply text-xs font-medium;
}
</style>