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

        <!-- Schedule List -->
        <div class="space-y-4">
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
                <button @click="editSchedule(schedule)" 
                        class="text-blue-500 hover:text-blue-700 p-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button @click="deleteSchedule(schedule)" 
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

    <!-- Router outlet for child routes -->
    <RouterView />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// Page metadata
useHead({
  title: 'Schedule Builder - Schedules',
  meta: [
    { name: 'description', content: 'Manage and create academic schedules with advanced optimization tools.' }
  ]
})

// Reactive data
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

// Methods
const getStatusClass = (status) => {
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

const editSchedule = (schedule) => {
  // Navigate to edit mode or open modal
  console.log('Editing schedule:', schedule.id)
  // You could navigate to an edit route or open a modal
}

const deleteSchedule = (schedule) => {
  if (confirm(`Are you sure you want to delete "${schedule.name}"?`)) {
    const index = schedules.value.findIndex(s => s.id === schedule.id)
    if (index > -1) {
      schedules.value.splice(index, 1)
    }
  }
}

// Load schedules on mount
onMounted(async () => {
  try {
    // Here you would typically fetch schedules from the API
    // const response = await $fetch('/api/schedules')
    // schedules.value = response
    console.log('Schedules loaded')
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