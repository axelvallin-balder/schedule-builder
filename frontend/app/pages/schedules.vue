<template>
  <div class="schedules-page">
    <div class="container mx-auto px-4 py-8">
      <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold">Schedule Management</h1>
          <NuxtLink to="/schedules/generate" 
                   class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors">
            Generate New Schedule
          </NuxtLink>
        </div>

        <!-- Tab Navigation -->
        <div class="flex border-b border-gray-200 mb-6">
          <button 
            @click="activeTab = 'list'"
            :class="[
              'px-6 py-3 font-medium text-sm transition-colors',
              activeTab === 'list' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            ]"
          >
            Schedule List
          </button>
          <button 
            @click="activeTab = 'calendar'"
            :class="[
              'px-6 py-3 font-medium text-sm transition-colors',
              activeTab === 'calendar' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            ]"
          >
            Calendar View
          </button>
        </div>

        <!-- Schedule List Tab -->
        <div v-if="activeTab === 'list'" class="space-y-4">
          <div v-if="schedules.length === 0" class="text-center py-12">
            <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <h3 class="text-xl font-semibold text-gray-600 mb-2">No Schedules Yet</h3>
            <p class="text-gray-500 mb-4">Create your first schedule to get started</p>
            <NuxtLink to="/schedules/generate" 
                     class="inline-block bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors">
              Create Schedule
            </NuxtLink>
          </div>

          <div v-for="schedule in schedules" :key="schedule.id" 
               class="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-lg font-semibold">{{ schedule.name }}</h3>
                <p class="text-gray-600">Week {{ schedule.weekNumber }}, {{ schedule.year }}</p>
                <div class="flex items-center mt-2">
                  <span class="px-2 py-1 rounded-full text-xs"
                        :class="getStatusClass(schedule.status)">
                    {{ schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1) }}
                  </span>
                  <span class="text-gray-500 text-sm ml-4">
                    {{ schedule.lessons?.length || 0 }} lessons
                  </span>
                </div>
              </div>
              <div class="flex space-x-2">
                <button @click="viewScheduleInCalendar(schedule)" 
                        title="View in Calendar"
                        class="text-green-500 hover:text-green-700 p-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </button>
                <button @click="editSchedule(schedule)" 
                        title="Edit Schedule"
                        class="text-blue-500 hover:text-blue-700 p-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button @click="deleteSchedule(schedule)" 
                        title="Delete Schedule"
                        class="text-red-500 hover:text-red-700 p-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Calendar View Tab -->
        <div v-else-if="activeTab === 'calendar'" class="space-y-6">
          <!-- Error Display -->
          <div v-if="calendarStore.error" 
               class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {{ calendarStore.error }}
          </div>

          <!-- Selection Controls -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ScheduleSelector
              :schedules="calendarStore.availableSchedules"
              :selected-schedule-id="calendarStore.selectedScheduleId"
              :loading="calendarStore.isLoading"
              @schedule-selected="onScheduleSelected"
            />
            
            <ClassSelector
              :classes="calendarStore.availableClasses"
              :selected-class-id="calendarStore.selectedClassId"
              :loading="calendarStore.isLoading"
              :disabled="!calendarStore.selectedScheduleId"
              @class-selected="onClassSelected"
            />
          </div>

          <!-- Calendar Navigation -->
          <CalendarNavigation
            :current-view-mode="calendarStore.viewMode"
            :selected-day="calendarStore.selectedDay"
            :available-days="availableDays"
            @view-mode-changed="onViewModeChanged"
            @day-selected="onDaySelected"
          />

          <!-- Calendar Display -->
          <CalendarView
            :current-week="calendarStore.currentCalendarWeek"
            :view-mode="calendarStore.viewMode"
            :selected-day-of-week="calendarStore.selectedDay"
            :loading="calendarStore.isLoading"
            @lesson-clicked="onLessonClicked"
          />
        </div>
      </div>

      <!-- Lesson Detail Modal -->
      <div v-if="selectedLesson" 
           class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
           @click="closeModal">
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4" @click.stop>
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-lg font-semibold">{{ selectedLesson.subjectName }}</h3>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="space-y-3">
            <div>
              <span class="font-medium text-gray-700">Teacher:</span>
              <span class="ml-2">{{ selectedLesson.teacherName }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Time:</span>
              <span class="ml-2">{{ selectedLesson.startTime }} - {{ calculateEndTime(selectedLesson.startTime, selectedLesson.duration) }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Day:</span>
              <span class="ml-2">{{ getDayName(selectedLesson.dayOfWeek) }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Duration:</span>
              <span class="ml-2">{{ selectedLesson.duration }} minutes</span>
            </div>
            <div v-if="selectedLesson.groupNames.length > 0">
              <span class="font-medium text-gray-700">Groups:</span>
              <span class="ml-2">{{ selectedLesson.groupNames.join(', ') }}</span>
            </div>
            <div v-if="selectedLesson.roomId">
              <span class="font-medium text-gray-700">Room:</span>
              <span class="ml-2">{{ selectedLesson.roomId }}</span>
            </div>
          </div>
          
          <div class="mt-6 flex justify-end">
            <button @click="closeModal" 
                    class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>

      <!-- Performance Metrics -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-xl font-semibold mb-4">System Performance</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="text-center p-4 bg-blue-50 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">{{ performanceMetrics.avgGenerationTime }}s</div>
            <div class="text-sm text-gray-600">Avg Generation Time</div>
          </div>
          <div class="text-center p-4 bg-green-50 rounded-lg">
            <div class="text-2xl font-bold text-green-600">{{ performanceMetrics.cacheHitRate }}%</div>
            <div class="text-sm text-gray-600">Cache Hit Rate</div>
          </div>
          <div class="text-center p-4 bg-yellow-50 rounded-lg">
            <div class="text-2xl font-bold text-yellow-600">{{ performanceMetrics.memoryUsage }}MB</div>
            <div class="text-sm text-gray-600">Memory Usage</div>
          </div>
          <div class="text-center p-4 bg-purple-50 rounded-lg">
            <div class="text-2xl font-bold text-purple-600">{{ performanceMetrics.activeUsers }}</div>
            <div class="text-sm text-gray-600">Active Users</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCalendarStore } from '../stores/calendar'
import type { CalendarLesson } from '../../types/calendar'
import ScheduleSelector from '../components/schedule/ScheduleSelector.vue'
import ClassSelector from '../components/schedule/ClassSelector.vue'
import CalendarNavigation from '../components/schedule/CalendarNavigation.vue'
import CalendarView from '../components/schedule/CalendarView.vue'

// Page metadata
useHead({
  title: 'Schedule Builder - Schedules',
  meta: [
    { name: 'description', content: 'Manage and create academic schedules with advanced optimization tools.' }
  ]
})

// Stores
const calendarStore = useCalendarStore()

// Reactive data
const activeTab = ref('list')
const selectedLesson = ref<CalendarLesson | null>(null)

const schedules = ref([
  {
    id: '1',
    name: 'Fall Semester 2025',
    weekNumber: 1,
    year: 2025,
    status: 'active',
    lessons: new Array(45) // Mock 45 lessons
  },
  {
    id: '2',
    name: 'Spring Semester 2025 - Draft',
    weekNumber: 20,
    year: 2025,
    status: 'draft',
    lessons: new Array(38) // Mock 38 lessons
  }
])

const performanceMetrics = ref({
  avgGenerationTime: 3.2,
  cacheHitRate: 87,
  memoryUsage: 234,
  activeUsers: 12
})

// Computed properties
const availableDays = computed(() => {
  if (!calendarStore.currentCalendarWeek) return [1, 2, 3, 4, 5]
  return calendarStore.currentCalendarWeek.days.map(day => day.dayOfWeek)
})

// Methods for schedule list
const getStatusClass = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'draft':
      return 'bg-yellow-100 text-yellow-800'
    case 'archived':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const editSchedule = (schedule: any) => {
  console.log('Editing schedule:', schedule.id)
}

const deleteSchedule = (schedule: any) => {
  if (confirm(`Are you sure you want to delete "${schedule.name}"?`)) {
    const index = schedules.value.findIndex(s => s.id === schedule.id)
    if (index > -1) {
      schedules.value.splice(index, 1)
    }
  }
}

const viewScheduleInCalendar = async (schedule: any) => {
  // Switch to calendar tab and select the schedule
  activeTab.value = 'calendar'
  await calendarStore.selectSchedule(schedule.id)
  
  // Auto-load classes for the selected schedule
  if (calendarStore.availableClasses.length === 0) {
    await calendarStore.loadClassOptions()
  }
}

// Methods for calendar view
const onScheduleSelected = async (scheduleId: string) => {
  await calendarStore.selectSchedule(scheduleId)
  
  // Auto-load classes for the selected schedule
  if (calendarStore.availableClasses.length === 0) {
    await calendarStore.loadClassOptions()
  }
}

const onClassSelected = async (classId: string) => {
  await calendarStore.selectClass(classId)
  await loadCalendarData()
}

const onViewModeChanged = (mode: 'week' | 'day') => {
  calendarStore.setViewMode(mode)
}

const onDaySelected = (dayOfWeek: number) => {
  calendarStore.setSelectedDay(dayOfWeek)
}

const onLessonClicked = (lesson: CalendarLesson) => {
  selectedLesson.value = lesson
}

const closeModal = () => {
  selectedLesson.value = null
}

const loadCalendarData = async () => {
  if (calendarStore.selectedScheduleId && calendarStore.selectedClassId) {
    await calendarStore.generateCalendarWeek()
  }
}

const getDayName = (dayOfWeek: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayOfWeek] || 'Unknown'
}

const calculateEndTime = (startTime: string, duration: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number)
  const startMinutes = (hours || 0) * 60 + (minutes || 0)
  const endMinutes = startMinutes + duration
  const endHours = Math.floor(endMinutes / 60)
  const endMins = endMinutes % 60
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
}

// Load schedules on mount
onMounted(async () => {
  try {
    // Load initial schedule data
    console.log('Schedules loaded')
    
    // Load calendar options if on calendar tab
    if (activeTab.value === 'calendar') {
      await Promise.all([
        calendarStore.loadScheduleOptions(),
        calendarStore.loadClassOptions()
      ])
    }
  } catch (error) {
    console.error('Failed to load schedules:', error)
  }
})
</script>

<style scoped>
.schedules-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}
</style>