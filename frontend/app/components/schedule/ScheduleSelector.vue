<template>
  <div class="schedule-selector" data-testid="schedule-selector">
    <label for="schedule-select" class="block text-sm font-medium text-gray-700 mb-2">
      <span class="sr-only">Select a schedule from the dropdown menu</span>
      Select Schedule
    </label>
    <div class="relative">
      <select
        id="schedule-select"
        name="schedule"
        v-model="selectedValue"
        @change="onSelectionChange"
        :disabled="loading || schedules.length === 0"
        :aria-describedby="error ? 'schedule-error' : undefined"
        :aria-invalid="!!error"
        :aria-expanded="false"
        :aria-label="`Schedule selector. ${schedules.length} schedules available. Current selection: ${selectedScheduleName || 'None selected'}`"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="" disabled>
          {{ loading ? 'Loading schedules...' : 'Choose a schedule' }}
        </option>
        <option
          v-for="schedule in schedules"
          :key="schedule.id"
          :value="schedule.id"
          :class="{ 'font-semibold': schedule.isDefault }"
        >
          {{ schedule.name }}
          <span v-if="schedule.isDefault" class="text-sm text-blue-600">(Default)</span>
        </option>
      </select>
      
      <!-- Loading spinner -->
      <div
        v-if="loading"
        class="absolute inset-y-0 right-0 flex items-center pr-3"
        data-testid="schedule-loading"
      >
        <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    </div>
    
    <!-- Empty state -->
    <div v-if="!loading && schedules.length === 0" class="empty-schedules mt-2 text-sm text-gray-500">
      No schedules available
    </div>
    
    <!-- Error state -->
    <div v-if="error" class="mt-2 text-sm text-red-600" id="schedule-error" role="alert" aria-live="polite">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { ScheduleOption } from '../../../types/calendar'

interface Props {
  schedules: ScheduleOption[]
  selectedScheduleId: string | null
  loading?: boolean
  error?: string | null
}

interface Emits {
  'schedule-selected': [scheduleId: string]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null
})

const emit = defineEmits<Emits>()

const selectedValue = ref(props.selectedScheduleId || '')

// Watch for external changes to selectedScheduleId
watch(() => props.selectedScheduleId, (newValue) => {
  selectedValue.value = newValue || ''
})

// Auto-select default schedule if none selected
watch(() => props.schedules, (newSchedules) => {
  if (!selectedValue.value && newSchedules.length > 0) {
    const defaultSchedule = newSchedules.find(s => s.isDefault)
    if (defaultSchedule) {
      selectedValue.value = defaultSchedule.id
      emit('schedule-selected', defaultSchedule.id)
    }
  }
}, { immediate: true })

const onSelectionChange = () => {
  if (selectedValue.value) {
    emit('schedule-selected', selectedValue.value)
  }
}

// Computed properties for better performance
const visibleSchedules = computed(() => {
  // Filter out draft schedules by default
  return props.schedules.filter(s => s.status !== 'draft')
})

const selectedScheduleName = computed(() => {
  const selected = props.schedules.find(s => s.id === selectedValue.value)
  return selected?.name || null
})
</script>

<style scoped>
.schedule-selector select:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.default-option {
  background-color: #eff6ff;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>