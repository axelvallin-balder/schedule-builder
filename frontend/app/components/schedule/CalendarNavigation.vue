<template>
  <div class="calendar-navigation" data-testid="calendar-navigation">
    <!-- View mode toggle -->
    <div class="view-toggle mb-4">
      <div class="inline-flex rounded-lg border border-gray-200 bg-gray-50" role="group">
        <button
          type="button"
          data-mode="week"
          :class="[
            'px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            currentViewMode === 'week'
              ? 'bg-blue-600 text-white active'
              : 'bg-white text-gray-900 hover:bg-gray-50'
          ]"
          class="rounded-l-lg border-r border-gray-200"
          @click="switchViewMode('week')"
          @keydown="handleKeyNavigation"
        >
          <span class="flex items-center">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Week View
          </span>
        </button>
        <button
          type="button"
          data-mode="day"
          :class="[
            'px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            currentViewMode === 'day'
              ? 'bg-blue-600 text-white active'
              : 'bg-white text-gray-900 hover:bg-gray-50'
          ]"
          class="rounded-r-lg"
          @click="switchViewMode('day')"
          @keydown="handleKeyNavigation"
        >
          <span class="flex items-center">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Day View
          </span>
        </button>
      </div>
    </div>
    
    <!-- Day selector (shown only in day view) -->
    <div v-if="currentViewMode === 'day'" class="day-selector">
      <h3 class="text-sm font-medium text-gray-700 mb-2">Select Day</h3>
      <div class="grid grid-cols-5 gap-1">
        <button
          v-for="(day, index) in weekdays"
          :key="day.value"
          type="button"
          :class="[
            'day-button px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            selectedDay === day.value
              ? 'bg-blue-600 text-white selected'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          ]"
          @click="selectDay(day.value)"
          @keydown.enter="selectDay(day.value)"
          @keydown.space.prevent="selectDay(day.value)"
        >
          <div class="text-center">
            <div class="font-semibold">{{ day.short }}</div>
            <div class="text-xs opacity-75">{{ day.name }}</div>
          </div>
        </button>
      </div>
    </div>
    
    <!-- Mobile responsiveness indicator -->
    <div v-if="isMobileView" class="mt-3 text-xs text-gray-500">
      Mobile view automatically uses day mode
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Props {
  currentViewMode: 'week' | 'day'
  selectedDay: number
  availableDays?: number[]
}

interface Emits {
  'view-mode-changed': [mode: 'week' | 'day']
  'day-selected': [dayOfWeek: number]
}

const props = withDefaults(defineProps<Props>(), {
  availableDays: () => [1, 2, 3, 4, 5] // Monday to Friday
})

const emit = defineEmits<Emits>()

const isMobileView = ref(false)

// Weekday definitions
const weekdays = computed(() => [
  { value: 1, name: 'Monday', short: 'Mon' },
  { value: 2, name: 'Tuesday', short: 'Tue' },
  { value: 3, name: 'Wednesday', short: 'Wed' },
  { value: 4, name: 'Thursday', short: 'Thu' },
  { value: 5, name: 'Friday', short: 'Fri' }
].filter(day => props.availableDays.includes(day.value)))

// Methods
const switchViewMode = (mode: 'week' | 'day') => {
  emit('view-mode-changed', mode)
}

const selectDay = (dayOfWeek: number) => {
  emit('day-selected', dayOfWeek)
}

const handleKeyNavigation = (event: KeyboardEvent) => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault()
    const currentMode = props.currentViewMode
    const newMode = currentMode === 'week' ? 'day' : 'week'
    switchViewMode(newMode)
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    // Handle enter/space on the current button
  }
}

// Mobile detection
const checkMobileView = () => {
  isMobileView.value = window.innerWidth < 768 // Tailwind's md breakpoint
}

const handleResize = () => {
  checkMobileView()
  
  // Auto-switch to day view on mobile
  if (isMobileView.value && props.currentViewMode === 'week') {
    emit('view-mode-changed', 'day')
  }
}

// Lifecycle
onMounted(() => {
  checkMobileView()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.view-toggle button {
  min-width: 100px;
}

.day-button {
  min-height: 60px;
}

.day-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.day-button.selected {
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
}

@media (max-width: 767px) {
  .view-toggle {
    display: none; /* Hide view toggle on mobile */
  }
  
  .day-selector .grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 0.25rem;
  }
  
  .day-button {
    min-height: 50px;
    padding: 0.5rem 0.25rem;
  }
}
</style>