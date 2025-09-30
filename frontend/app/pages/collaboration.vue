<template>
  <div class="collaboration-page">
    <div class="container mx-auto px-4 py-8">
      <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold">Real-time Collaboration</h1>
          <button @click="createNewSession" 
                  class="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors">
            Start New Session
          </button>
        </div>

        <!-- Active Sessions -->
        <div class="mb-8">
          <h2 class="text-xl font-semibold mb-4">Active Collaboration Sessions</h2>
          
          <div v-if="activeSessions.length === 0" class="text-center py-12">
            <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <h3 class="text-xl font-semibold text-gray-600 mb-2">No Active Sessions</h3>
            <p class="text-gray-500 mb-4">Start a collaboration session to work with your team</p>
            <button @click="createNewSession" 
                    class="inline-block bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors">
              Start Session
            </button>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="session in activeSessions" :key="session.id" 
                 class="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div class="flex justify-between items-start mb-3">
                <h3 class="text-lg font-semibold">{{ session.name }}</h3>
                <span class="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  Active
                </span>
              </div>
              
              <p class="text-gray-600 text-sm mb-3">{{ session.description }}</p>
              
              <!-- Participants -->
              <div class="mb-4">
                <div class="text-sm text-gray-600 mb-2">Participants ({{ session.participants.length }})</div>
                <div class="flex -space-x-2">
                  <div v-for="participant in session.participants.slice(0, 5)" :key="participant.id"
                       class="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                       :title="participant.name">
                    {{ participant.name.charAt(0).toUpperCase() }}
                  </div>
                  <div v-if="session.participants.length > 5" 
                       class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-semibold border-2 border-white">
                    +{{ session.participants.length - 5 }}
                  </div>
                </div>
              </div>

              <!-- Session Info -->
              <div class="text-xs text-gray-500 mb-4">
                <div>Started: {{ formatTime(session.startedAt) }}</div>
                <div>Last Activity: {{ formatTime(session.lastActivity) }}</div>
              </div>

              <!-- Actions -->
              <div class="flex space-x-2">
                <NuxtLink :to="`/collaboration/session/${session.id}`" 
                         class="flex-1 bg-purple-500 text-white text-center py-2 rounded hover:bg-purple-600 transition-colors text-sm">
                  Join Session
                </NuxtLink>
                <button @click="copySessionLink(session)" 
                        class="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Sessions -->
        <div>
          <h2 class="text-xl font-semibold mb-4">Recent Sessions</h2>
          <div class="space-y-3">
            <div v-for="session in recentSessions" :key="session.id" 
                 class="flex justify-between items-center p-3 border rounded-lg">
              <div>
                <h4 class="font-medium">{{ session.name }}</h4>
                <p class="text-sm text-gray-600">{{ session.participants.length }} participants • {{ formatDate(session.endedAt) }}</p>
              </div>
              <div class="flex items-center space-x-2">
                <span class="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                  Ended
                </span>
                <button @click="viewSessionHistory(session)" 
                        class="text-blue-500 hover:text-blue-700 p-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Collaboration Features -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-xl font-semibold mb-4">Collaboration Features</h2>
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="text-center p-4 border rounded-lg">
            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 class="font-semibold mb-2">Real-time Updates</h3>
            <p class="text-gray-600 text-sm">See changes instantly as team members edit schedules</p>
          </div>

          <div class="text-center p-4 border rounded-lg">
            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <h3 class="font-semibold mb-2">Team Chat</h3>
            <p class="text-gray-600 text-sm">Communicate directly within the collaboration session</p>
          </div>

          <div class="text-center p-4 border rounded-lg">
            <div class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <h3 class="font-semibold mb-2">Conflict Prevention</h3>
            <p class="text-gray-600 text-sm">Automatic locking prevents simultaneous edits</p>
          </div>

          <div class="text-center p-4 border rounded-lg">
            <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <h3 class="font-semibold mb-2">Change History</h3>
            <p class="text-gray-600 text-sm">Track all modifications with detailed change logs</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// Page metadata
useHead({
  title: 'Schedule Builder - Collaboration',
  meta: [
    { name: 'description', content: 'Collaborate in real-time with your team to create and modify schedules together.' }
  ]
})

// Reactive data
const activeSessions = ref([
  {
    id: 'session_1',
    name: 'Fall 2025 Schedule Planning',
    description: 'Working on the main fall semester schedule',
    participants: [
      { id: '1', name: 'Alice Johnson' },
      { id: '2', name: 'Bob Smith' },
      { id: '3', name: 'Carol Davis' }
    ],
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    lastActivity: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
  },
  {
    id: 'session_2',
    name: 'Math Department Review',
    description: 'Reviewing math course scheduling conflicts',
    participants: [
      { id: '4', name: 'David Wilson' },
      { id: '5', name: 'Emma Brown' }
    ],
    startedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
    lastActivity: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
  }
])

const recentSessions = ref([
  {
    id: 'session_3',
    name: 'Spring 2025 Prep Session',
    participants: [
      { id: '1', name: 'Alice Johnson' },
      { id: '6', name: 'Frank Miller' }
    ],
    endedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
  },
  {
    id: 'session_4',
    name: 'Emergency Schedule Fix',
    participants: [
      { id: '2', name: 'Bob Smith' },
      { id: '3', name: 'Carol Davis' },
      { id: '4', name: 'David Wilson' }
    ],
    endedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
  }
])

// Methods
const formatTime = (date) => {
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

const createNewSession = () => {
  // Generate a new session ID and navigate to it
  const sessionId = `session_${Date.now()}`
  console.log('Creating new collaboration session:', sessionId)
  // You could navigate to the session or open a modal to configure it
  navigateTo(`/collaboration/session/${sessionId}`)
}

const copySessionLink = async (session) => {
  const link = `${window.location.origin}/collaboration/session/${session.id}`
  try {
    await navigator.clipboard.writeText(link)
    // You could show a toast notification here
    console.log('Session link copied to clipboard')
  } catch (error) {
    console.error('Failed to copy link:', error)
  }
}

const viewSessionHistory = (session) => {
  console.log('Viewing history for session:', session.id)
  // Navigate to session history view or open modal
}

// Load sessions on mount
onMounted(async () => {
  try {
    // Here you would typically fetch active sessions from the API
    // const response = await $fetch('/api/collaboration/sessions')
    // activeSessions.value = response.active
    // recentSessions.value = response.recent
    console.log('Collaboration sessions loaded')
  } catch (error) {
    console.error('Failed to load collaboration sessions:', error)
  }
})
</script>

<style scoped>
.collaboration-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f3e7f3 0%, #e1bee7 100%);
}
</style>