<template>
  <div class="collaboration-workflow" data-testid="collaboration-workflow">
    <!-- Workflow Header -->
    <div class="workflow-header">
      <h2 class="workflow-title">Collaboration Workflow</h2>
      <div class="collaboration-status" data-testid="collaboration-status">
        <div class="status-indicator" :class="connectionStatus">
          <span class="status-dot"></span>
          <span class="status-text">{{ connectionStatusText }}</span>
        </div>
        <div class="active-users" data-testid="active-users">
          <span class="users-count">{{ activeUsers.length }} active users</span>
          <div class="users-avatars">
            <div 
              v-for="user in activeUsers.slice(0, 5)" 
              :key="user.id"
              class="user-avatar"
              :style="{ backgroundColor: user.color }"
              :title="user.name"
            >
              {{ user.name.charAt(0) }}
            </div>
            <div v-if="activeUsers.length > 5" class="more-users">
              +{{ activeUsers.length - 5 }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Session Controls -->
    <div class="session-controls" data-testid="session-controls">
      <div class="session-info">
        <h3>Collaboration Session</h3>
        <p v-if="currentSession">
          Session: <strong>{{ currentSession.name }}</strong> 
          ({{ currentSession.participants.length }} participants)
        </p>
        <p v-else class="no-session">No active collaboration session</p>
      </div>
      
      <div class="session-actions">
        <button 
          v-if="!currentSession" 
          class="btn-primary" 
          @click="showCreateSession = true"
          data-testid="create-session"
        >
          Start Collaboration
        </button>
        <button 
          v-if="!currentSession" 
          class="btn-secondary" 
          @click="showJoinSession = true"
          data-testid="join-session"
        >
          Join Session
        </button>
        <button 
          v-if="currentSession" 
          class="btn-secondary" 
          @click="leaveSession"
          data-testid="leave-session"
        >
          Leave Session
        </button>
        <button 
          v-if="currentSession && isSessionOwner" 
          class="btn-danger" 
          @click="endSession"
          data-testid="end-session"
        >
          End Session
        </button>
      </div>
    </div>

    <!-- Collaboration Content -->
    <div v-if="currentSession" class="collaboration-content">
      <!-- Participants Panel -->
      <div class="participants-panel" data-testid="participants-panel">
        <h4>Participants ({{ currentSession.participants.length }})</h4>
        <div class="participants-list">
          <div 
            v-for="participant in currentSession.participants" 
            :key="participant.id"
            class="participant-item"
            :class="{ owner: participant.isOwner, current: participant.id === currentUser.id }"
            :data-testid="`participant-${participant.id}`"
          >
            <div class="participant-avatar" :style="{ backgroundColor: participant.color }">
              {{ participant.name.charAt(0) }}
            </div>
            <div class="participant-info">
              <div class="participant-name">
                {{ participant.name }}
                <span v-if="participant.isOwner" class="owner-badge">Owner</span>
                <span v-if="participant.id === currentUser.id" class="current-badge">You</span>
              </div>
              <div class="participant-status">
                <span class="status-indicator" :class="participant.status">
                  {{ participant.status }}
                </span>
                <span v-if="participant.currentAction" class="current-action">
                  {{ participant.currentAction }}
                </span>
              </div>
            </div>
            <div class="participant-actions">
              <button 
                v-if="isSessionOwner && participant.id !== currentUser.id"
                class="btn-icon"
                @click="kickParticipant(participant.id)"
                data-testid="kick-participant"
                title="Remove participant"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Activity Feed -->
      <div class="activity-feed" data-testid="activity-feed">
        <h4>Live Activity</h4>
        <div class="activity-list">
          <div 
            v-for="activity in recentActivities" 
            :key="activity.id"
            class="activity-item"
            :class="activity.type"
            :data-testid="`activity-${activity.id}`"
          >
            <div class="activity-avatar" :style="{ backgroundColor: activity.user.color }">
              {{ activity.user.name.charAt(0) }}
            </div>
            <div class="activity-content">
              <div class="activity-message">{{ activity.message }}</div>
              <div class="activity-time">{{ formatTime(activity.timestamp) }}</div>
            </div>
            <div v-if="activity.type === 'conflict'" class="activity-actions">
              <button 
                class="btn-small" 
                @click="resolveConflict(activity.conflictId)"
                data-testid="resolve-conflict"
              >
                Resolve
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Conflict Resolution -->
      <div v-if="activeConflicts.length > 0" class="conflicts-panel" data-testid="conflicts-panel">
        <h4>Active Conflicts ({{ activeConflicts.length }})</h4>
        <div class="conflicts-list">
          <div 
            v-for="conflict in activeConflicts" 
            :key="conflict.id"
            class="conflict-item"
            :data-testid="`conflict-${conflict.id}`"
          >
            <div class="conflict-header">
              <h5>{{ conflict.title }}</h5>
              <span class="conflict-type">{{ conflict.type }}</span>
            </div>
            
            <div class="conflict-description">
              {{ conflict.description }}
            </div>
            
            <div class="conflict-participants">
              <strong>Involved users:</strong>
              <span 
                v-for="userId in conflict.involvedUsers" 
                :key="userId"
                class="conflict-user"
              >
                {{ getUserName(userId) }}
              </span>
            </div>
            
            <div class="conflict-options">
              <h6>Resolution Options:</h6>
              <div class="resolution-options">
                <label 
                  v-for="option in conflict.resolutionOptions" 
                  :key="option.id"
                  class="resolution-option"
                >
                  <input
                    type="radio"
                    :name="`conflict-${conflict.id}`"
                    :value="option.id"
                    v-model="conflict.selectedResolution"
                    data-testid="resolution-option"
                  />
                  <span>{{ option.description }}</span>
                  <small>({{ option.votes || 0 }} votes)</small>
                </label>
              </div>
            </div>
            
            <div class="conflict-actions">
              <button 
                class="btn-primary" 
                @click="voteForResolution(conflict)"
                :disabled="!conflict.selectedResolution"
                data-testid="vote-resolution"
              >
                Vote
              </button>
              <button 
                v-if="isSessionOwner" 
                class="btn-secondary" 
                @click="forceResolveConflict(conflict.id)"
                data-testid="force-resolve"
              >
                Force Resolve
              </button>
              <button 
                class="btn-secondary" 
                @click="discussConflict(conflict.id)"
                data-testid="discuss-conflict"
              >
                Discuss
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Chat -->
      <div class="chat-panel" data-testid="chat-panel">
        <h4>Session Chat</h4>
        <div class="chat-messages" ref="chatMessagesContainer">
          <div 
            v-for="message in chatMessages" 
            :key="message.id"
            class="chat-message"
            :class="{ own: message.userId === currentUser.id }"
            :data-testid="`message-${message.id}`"
          >
            <div class="message-avatar" :style="{ backgroundColor: message.user.color }">
              {{ message.user.name.charAt(0) }}
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="message-author">{{ message.user.name }}</span>
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              </div>
              <div class="message-text">{{ message.text }}</div>
              <div v-if="message.attachments" class="message-attachments">
                <div 
                  v-for="attachment in message.attachments" 
                  :key="attachment.id"
                  class="attachment-item"
                >
                  {{ attachment.name }}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="chat-input" data-testid="chat-input">
          <input
            v-model="newMessage"
            type="text"
            placeholder="Type a message..."
            @keyup.enter="sendMessage"
            @input="handleTyping"
            data-testid="message-input"
          />
          <button 
            class="btn-primary" 
            @click="sendMessage"
            :disabled="!newMessage.trim()"
            data-testid="send-message"
          >
            Send
          </button>
        </div>
        
        <div v-if="typingUsers.length > 0" class="typing-indicator" data-testid="typing-indicator">
          <span>{{ formatTypingUsers() }} typing...</span>
        </div>
      </div>

      <!-- Session Settings -->
      <div v-if="isSessionOwner" class="session-settings" data-testid="session-settings">
        <h4>Session Settings</h4>
        <div class="settings-form">
          <div class="setting-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="sessionSettings.allowAnonymousJoin"
                @change="updateSessionSettings"
                data-testid="allow-anonymous"
              />
              <span>Allow anonymous users to join</span>
            </label>
          </div>
          
          <div class="setting-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="sessionSettings.autoResolveConflicts"
                @change="updateSessionSettings"
                data-testid="auto-resolve"
              />
              <span>Auto-resolve conflicts after 5 minutes</span>
            </label>
          </div>
          
          <div class="setting-group">
            <label for="max-participants">Maximum participants</label>
            <input
              id="max-participants"
              type="number"
              v-model.number="sessionSettings.maxParticipants"
              min="2"
              max="20"
              @change="updateSessionSettings"
              data-testid="max-participants"
            />
          </div>
          
          <div class="setting-group">
            <label for="session-timeout">Session timeout (hours)</label>
            <input
              id="session-timeout"
              type="number"
              v-model.number="sessionSettings.sessionTimeout"
              min="1"
              max="24"
              @change="updateSessionSettings"
              data-testid="session-timeout"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Create Session Modal -->
    <div v-if="showCreateSession" class="modal-overlay" @click="closeCreateSessionModal">
      <div class="modal-content" @click.stop data-testid="create-session-modal">
        <div class="modal-header">
          <h3>Start Collaboration Session</h3>
          <button class="btn-icon" @click="closeCreateSessionModal">×</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="createSession">
            <div class="form-group">
              <label for="session-name">Session Name *</label>
              <input
                id="session-name"
                v-model="newSessionData.name"
                type="text"
                required
                data-testid="session-name-input"
                placeholder="Enter session name"
              />
            </div>
            
            <div class="form-group">
              <label for="session-description">Description</label>
              <textarea
                id="session-description"
                v-model="newSessionData.description"
                data-testid="session-description-input"
                placeholder="Optional session description"
                rows="3"
              ></textarea>
            </div>
            
            <div class="form-group">
              <label for="session-schedule">Schedule to collaborate on</label>
              <select
                id="session-schedule"
                v-model="newSessionData.scheduleId"
                data-testid="session-schedule-select"
              >
                <option value="">Select a schedule</option>
                <option v-for="schedule in availableSchedules" :key="schedule.id" :value="schedule.id">
                  {{ schedule.name }}
                </option>
              </select>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="newSessionData.isPublic"
                    data-testid="session-public"
                  />
                  <span>Make session public</span>
                </label>
              </div>
              
              <div class="form-group">
                <label for="max-participants-create">Max participants</label>
                <input
                  id="max-participants-create"
                  type="number"
                  v-model.number="newSessionData.maxParticipants"
                  min="2"
                  max="20"
                  data-testid="max-participants-create"
                />
              </div>
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeCreateSessionModal">Cancel</button>
          <button 
            class="btn-primary" 
            @click="createSession"
            :disabled="!newSessionData.name"
            data-testid="confirm-create-session"
          >
            Start Session
          </button>
        </div>
      </div>
    </div>

    <!-- Join Session Modal -->
    <div v-if="showJoinSession" class="modal-overlay" @click="closeJoinSessionModal">
      <div class="modal-content" @click.stop data-testid="join-session-modal">
        <div class="modal-header">
          <h3>Join Collaboration Session</h3>
          <button class="btn-icon" @click="closeJoinSessionModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="join-options">
            <div class="join-by-code">
              <h4>Join by Session Code</h4>
              <div class="code-input-group">
                <input
                  v-model="joinSessionCode"
                  type="text"
                  placeholder="Enter session code"
                  data-testid="session-code-input"
                />
                <button 
                  class="btn-primary" 
                  @click="joinByCode"
                  :disabled="!joinSessionCode"
                  data-testid="join-by-code"
                >
                  Join
                </button>
              </div>
            </div>
            
            <div class="divider">OR</div>
            
            <div class="public-sessions">
              <h4>Public Sessions</h4>
              <div v-if="publicSessions.length === 0" class="no-sessions">
                No public sessions available
              </div>
              <div v-else class="sessions-list" data-testid="public-sessions">
                <div 
                  v-for="session in publicSessions" 
                  :key="session.id"
                  class="session-item"
                  :data-testid="`public-session-${session.id}`"
                >
                  <div class="session-info">
                    <h5>{{ session.name }}</h5>
                    <p>{{ session.description }}</p>
                    <div class="session-meta">
                      <span>{{ session.participants.length }}/{{ session.maxParticipants }} participants</span>
                      <span>Created {{ formatTime(session.createdAt) }}</span>
                    </div>
                  </div>
                  <button 
                    class="btn-primary" 
                    @click="joinSession(session.id)"
                    :disabled="session.participants.length >= session.maxParticipants"
                    data-testid="join-public-session"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeJoinSessionModal">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useCollaborationStore } from '~/stores/collaboration'
import { useScheduleStore } from '~/stores/schedule'
import { useWebSocket } from '~/composables/useWebSocket'

// Store instances
const collaborationStore = useCollaborationStore()
const scheduleStore = useScheduleStore()

// WebSocket connection
const { connect, disconnect, send, isConnected } = useWebSocket()

// Component state
const showCreateSession = ref(false)
const showJoinSession = ref(false)
const joinSessionCode = ref('')
const newMessage = ref('')
const chatMessagesContainer = ref<HTMLElement | null>(null)

// Session data
const newSessionData = ref({
  name: '',
  description: '',
  scheduleId: '',
  isPublic: false,
  maxParticipants: 10
})

// Current user (would come from auth store in real app)
const currentUser = ref({
  id: 'user-1',
  name: 'Current User',
  color: '#3b82f6'
})

// Computed properties
const currentSession = computed(() => collaborationStore.currentSession)
const activeUsers = computed(() => collaborationStore.activeUsers)
const activeConflicts = computed(() => collaborationStore.activeConflicts)
const recentActivities = computed(() => collaborationStore.recentActivities)
const chatMessages = computed(() => collaborationStore.chatMessages)
const typingUsers = computed(() => collaborationStore.typingUsers)
const publicSessions = computed(() => collaborationStore.publicSessions)
const availableSchedules = computed(() => scheduleStore.schedules)

const connectionStatus = computed(() => isConnected.value ? 'connected' : 'disconnected')
const connectionStatusText = computed(() => isConnected.value ? 'Connected' : 'Disconnected')

const isSessionOwner = computed(() => {
  if (!currentSession.value) return false
  return currentSession.value.ownerId === currentUser.value.id
})

const sessionSettings = computed({
  get: () => currentSession.value?.settings || {
    allowAnonymousJoin: false,
    autoResolveConflicts: true,
    maxParticipants: 10,
    sessionTimeout: 8
  },
  set: (value) => {
    if (currentSession.value) {
      collaborationStore.updateSessionSettings(value)
    }
  }
})

// Methods
const createSession = async () => {
  try {
    const session = await collaborationStore.createSession({
      ...newSessionData.value,
      ownerId: currentUser.value.id
    })
    
    // Connect to WebSocket for this session
    connect(`/ws/collaboration/${session.id}`)
    
    closeCreateSessionModal()
    resetNewSessionData()
  } catch (error) {
    console.error('Failed to create session:', error)
  }
}

const joinSession = async (sessionId: string) => {
  try {
    await collaborationStore.joinSession(sessionId, currentUser.value.id)
    
    // Connect to WebSocket for this session
    connect(`/ws/collaboration/${sessionId}`)
    
    closeJoinSessionModal()
  } catch (error) {
    console.error('Failed to join session:', error)
  }
}

const joinByCode = async () => {
  try {
    const sessionId = await collaborationStore.findSessionByCode(joinSessionCode.value)
    await joinSession(sessionId)
    joinSessionCode.value = ''
  } catch (error) {
    console.error('Failed to join by code:', error)
  }
}

const leaveSession = async () => {
  try {
    await collaborationStore.leaveSession(currentUser.value.id)
    disconnect()
  } catch (error) {
    console.error('Failed to leave session:', error)
  }
}

const endSession = async () => {
  if (confirm('Are you sure you want to end this session? All participants will be disconnected.')) {
    try {
      await collaborationStore.endSession()
      disconnect()
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }
}

const kickParticipant = async (participantId: string) => {
  try {
    await collaborationStore.kickParticipant(participantId)
  } catch (error) {
    console.error('Failed to kick participant:', error)
  }
}

const sendMessage = () => {
  if (!newMessage.value.trim()) return
  
  const message = {
    text: newMessage.value.trim(),
    userId: currentUser.value.id,
    sessionId: currentSession.value.id,
    timestamp: new Date().toISOString()
  }
  
  collaborationStore.sendMessage(message)
  send('chat_message', message)
  
  newMessage.value = ''
  
  // Scroll to bottom
  nextTick(() => {
    if (chatMessagesContainer.value) {
      chatMessagesContainer.value.scrollTop = chatMessagesContainer.value.scrollHeight
    }
  })
}

let typingTimeout: NodeJS.Timeout | null = null

const handleTyping = () => {
  // Send typing indicator
  send('user_typing', {
    userId: currentUser.value.id,
    sessionId: currentSession.value.id
  })
  
  // Clear existing timeout
  if (typingTimeout) {
    clearTimeout(typingTimeout)
  }
  
  // Set new timeout to stop typing indicator
  typingTimeout = setTimeout(() => {
    send('user_stop_typing', {
      userId: currentUser.value.id,
      sessionId: currentSession.value.id
    })
  }, 1000)
}

const resolveConflict = async (conflictId: string) => {
  try {
    await collaborationStore.resolveConflict(conflictId)
  } catch (error) {
    console.error('Failed to resolve conflict:', error)
  }
}

const voteForResolution = async (conflict: any) => {
  try {
    await collaborationStore.voteForResolution(conflict.id, conflict.selectedResolution, currentUser.value.id)
  } catch (error) {
    console.error('Failed to vote for resolution:', error)
  }
}

const forceResolveConflict = async (conflictId: string) => {
  try {
    await collaborationStore.forceResolveConflict(conflictId)
  } catch (error) {
    console.error('Failed to force resolve conflict:', error)
  }
}

const discussConflict = (conflictId: string) => {
  // Open discussion interface for the conflict
  // This would typically open a separate discussion panel or modal
  console.log('Opening discussion for conflict:', conflictId)
}

const updateSessionSettings = async () => {
  try {
    await collaborationStore.updateSessionSettings(sessionSettings.value)
  } catch (error) {
    console.error('Failed to update session settings:', error)
  }
}

const closeCreateSessionModal = () => {
  showCreateSession.value = false
  resetNewSessionData()
}

const closeJoinSessionModal = () => {
  showJoinSession.value = false
  joinSessionCode.value = ''
}

const resetNewSessionData = () => {
  newSessionData.value = {
    name: '',
    description: '',
    scheduleId: '',
    isPublic: false,
    maxParticipants: 10
  }
}

const getUserName = (userId: string) => {
  const participant = currentSession.value?.participants.find(p => p.id === userId)
  return participant?.name || 'Unknown User'
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatTypingUsers = () => {
  const names = typingUsers.value.map(user => user.name)
  if (names.length === 1) return names[0] + ' is'
  if (names.length === 2) return names.join(' and ') + ' are'
  return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1] + ' are'
}

// Initialize on mount
onMounted(async () => {
  await Promise.all([
    collaborationStore.fetchPublicSessions(),
    scheduleStore.fetchSchedules()
  ])
})

// Cleanup on unmount
onUnmounted(() => {
  if (typingTimeout) {
    clearTimeout(typingTimeout)
  }
  disconnect()
})
</script>

<style scoped>
.collaboration-workflow {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.workflow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
}

.workflow-title {
  font-size: 2rem;
  margin: 0;
}

.collaboration-status {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}

.status-indicator.connected .status-dot {
  background: #10b981;
}

.active-users {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.users-avatars {
  display: flex;
  gap: 0.25rem;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 0.875rem;
}

.more-users {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #6b7280;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

.session-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.session-info h3 {
  margin: 0 0 0.5rem 0;
}

.session-info p {
  margin: 0;
  color: #6b7280;
}

.no-session {
  font-style: italic;
}

.session-actions {
  display: flex;
  gap: 1rem;
}

.collaboration-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.participants-panel,
.activity-feed,
.conflicts-panel,
.chat-panel,
.session-settings {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  height: fit-content;
}

.participants-panel h4,
.activity-feed h4,
.conflicts-panel h4,
.chat-panel h4,
.session-settings h4 {
  margin: 0 0 1rem 0;
  color: #374151;
}

.participants-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.participant-item.owner {
  border-color: #fbbf24;
  background: #fffbeb;
}

.participant-item.current {
  border-color: #3b82f6;
  background: #eff6ff;
}

.participant-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
}

.participant-info {
  flex: 1;
}

.participant-name {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.owner-badge {
  background: #fbbf24;
  color: #92400e;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.current-badge {
  background: #3b82f6;
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.participant-status {
  font-size: 0.875rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-indicator {
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-indicator.online { background: #d1fae5; color: #047857; }
.status-indicator.away { background: #fef3c7; color: #92400e; }
.status-indicator.busy { background: #fecaca; color: #991b1b; }

.activity-list {
  max-height: 300px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: start;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-message {
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.activity-time {
  font-size: 0.75rem;
  color: #6b7280;
}

.activity-item.conflict {
  background: #fef2f2;
  border-radius: 6px;
  padding: 0.75rem;
  border: 1px solid #fecaca;
}

.conflicts-panel {
  grid-column: 1 / -1;
}

.conflicts-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.conflict-item {
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 1.5rem;
  background: #fffbeb;
}

.conflict-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.conflict-type {
  background: #f59e0b;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.conflict-description {
  margin-bottom: 1rem;
  color: #374151;
}

.conflict-participants {
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.conflict-user {
  display: inline-block;
  background: #e5e7eb;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin-left: 0.5rem;
  font-weight: 500;
}

.resolution-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0.5rem 0 1rem 0;
}

.resolution-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.conflict-actions {
  display: flex;
  gap: 1rem;
}

.chat-panel {
  display: flex;
  flex-direction: column;
  height: 500px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 1rem;
  padding-right: 0.5rem;
}

.chat-message {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.chat-message.own {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.message-content {
  max-width: 70%;
}

.chat-message.own .message-content {
  text-align: right;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.chat-message.own .message-header {
  justify-content: flex-end;
}

.message-author {
  font-weight: 500;
  font-size: 0.875rem;
}

.message-time {
  font-size: 0.75rem;
  color: #6b7280;
}

.message-text {
  background: #f3f4f6;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
}

.chat-message.own .message-text {
  background: #3b82f6;
  color: white;
}

.chat-input {
  display: flex;
  gap: 0.5rem;
}

.chat-input input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}

.typing-indicator {
  font-size: 0.75rem;
  color: #6b7280;
  font-style: italic;
  margin-top: 0.5rem;
}

.session-settings {
  grid-column: 1 / -1;
}

.settings-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.btn-primary, .btn-secondary, .btn-danger {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #f9fafb;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-small {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
}

.btn-icon {
  padding: 0.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1.2rem;
  border-radius: 4px;
}

.btn-icon:hover {
  background: #f3f4f6;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.form-group {
  margin-bottom: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

input, select, textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 1rem;
}

.join-options {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.code-input-group {
  display: flex;
  gap: 0.5rem;
}

.divider {
  text-align: center;
  position: relative;
  color: #6b7280;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #e5e7eb;
  z-index: -1;
}

.divider::after {
  content: attr(data-text);
  background: white;
  padding: 0 1rem;
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.session-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.no-sessions {
  text-align: center;
  color: #6b7280;
  font-style: italic;
  padding: 2rem;
}

@media (max-width: 768px) {
  .workflow-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .collaboration-status {
    justify-content: space-between;
  }
  
  .session-controls {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .collaboration-content {
    grid-template-columns: 1fr;
  }
  
  .conflicts-panel,
  .session-settings {
    grid-column: 1;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>