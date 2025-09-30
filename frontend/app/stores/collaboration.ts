import { defineStore } from 'pinia'

interface User {
  id: string
  name: string
  color: string
  status: 'online' | 'away' | 'busy'
  currentAction?: string
}

interface Participant extends User {
  isOwner: boolean
  joinedAt: string
}

interface CollaborationSession {
  id: string
  name: string
  description?: string
  ownerId: string
  participants: Participant[]
  scheduleId?: string
  isPublic: boolean
  maxParticipants: number
  createdAt: string
  settings: {
    allowAnonymousJoin: boolean
    autoResolveConflicts: boolean
    maxParticipants: number
    sessionTimeout: number
  }
}

interface Conflict {
  id: string
  title: string
  type: 'schedule_edit' | 'rule_violation' | 'assignment_conflict'
  description: string
  involvedUsers: string[]
  resolutionOptions: {
    id: string
    description: string
    votes: number
  }[]
  selectedResolution?: string
  status: 'active' | 'resolved'
  createdAt: string
}

interface Activity {
  id: string
  type: 'join' | 'leave' | 'edit' | 'conflict' | 'resolution'
  message: string
  user: User
  timestamp: string
  conflictId?: string
}

interface ChatMessage {
  id: string
  text: string
  userId: string
  user: User
  sessionId: string
  timestamp: string
  attachments?: {
    id: string
    name: string
    url: string
  }[]
}

export const useCollaborationStore = defineStore('collaboration', {
  state: () => ({
    currentSession: null as CollaborationSession | null,
    activeUsers: [] as User[],
    activeConflicts: [] as Conflict[],
    recentActivities: [] as Activity[],
    chatMessages: [] as ChatMessage[],
    typingUsers: [] as User[],
    publicSessions: [] as CollaborationSession[],
    isConnected: false
  }),

  getters: {
    sessionParticipants: (state) => state.currentSession?.participants || [],
    isSessionOwner: (state) => (userId: string) => 
      state.currentSession?.ownerId === userId,
    unreadMessagesCount: (state) => {
      // In a real app, this would track read status
      return 0
    }
  },

  actions: {
    async createSession(sessionData: Partial<CollaborationSession>) {
      try {
        // Mock API call
        const session: CollaborationSession = {
          id: `session-${Date.now()}`,
          name: sessionData.name || '',
          description: sessionData.description,
          ownerId: sessionData.ownerId || '',
          participants: [{
            id: sessionData.ownerId || '',
            name: 'Current User',
            color: '#3b82f6',
            status: 'online',
            isOwner: true,
            joinedAt: new Date().toISOString()
          }],
          scheduleId: sessionData.scheduleId,
          isPublic: sessionData.isPublic || false,
          maxParticipants: sessionData.maxParticipants || 10,
          createdAt: new Date().toISOString(),
          settings: {
            allowAnonymousJoin: false,
            autoResolveConflicts: true,
            maxParticipants: sessionData.maxParticipants || 10,
            sessionTimeout: 8
          }
        }

        this.currentSession = session
        this.isConnected = true

        // Add activity
        this.addActivity({
          type: 'join',
          message: 'Session created',
          user: session.participants[0],
          timestamp: new Date().toISOString()
        })

        return session
      } catch (error) {
        console.error('Failed to create session:', error)
        throw error
      }
    },

    async joinSession(sessionId: string, userId: string) {
      try {
        // Mock API call
        const user: Participant = {
          id: userId,
          name: 'Joining User',
          color: '#10b981',
          status: 'online',
          isOwner: false,
          joinedAt: new Date().toISOString()
        }

        if (this.currentSession) {
          this.currentSession.participants.push(user)
        } else {
          // Load session from API
          this.currentSession = {
            id: sessionId,
            name: 'Existing Session',
            ownerId: 'other-user',
            participants: [user],
            isPublic: true,
            maxParticipants: 10,
            createdAt: new Date().toISOString(),
            settings: {
              allowAnonymousJoin: false,
              autoResolveConflicts: true,
              maxParticipants: 10,
              sessionTimeout: 8
            }
          }
        }

        this.isConnected = true

        // Add activity
        this.addActivity({
          type: 'join',
          message: `${user.name} joined the session`,
          user,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        console.error('Failed to join session:', error)
        throw error
      }
    },

    async leaveSession(userId: string) {
      try {
        if (!this.currentSession) return

        const participant = this.currentSession.participants.find(p => p.id === userId)
        if (participant) {
          this.currentSession.participants = this.currentSession.participants.filter(p => p.id !== userId)
          
          // Add activity
          this.addActivity({
            type: 'leave',
            message: `${participant.name} left the session`,
            user: participant,
            timestamp: new Date().toISOString()
          })
        }

        if (this.currentSession.ownerId === userId || this.currentSession.participants.length === 0) {
          this.currentSession = null
        }

        this.isConnected = false
      } catch (error) {
        console.error('Failed to leave session:', error)
        throw error
      }
    },

    async endSession() {
      try {
        if (!this.currentSession) return

        // Add activity
        this.addActivity({
          type: 'leave',
          message: 'Session ended',
          user: this.currentSession.participants.find(p => p.isOwner)!,
          timestamp: new Date().toISOString()
        })

        this.currentSession = null
        this.activeConflicts = []
        this.chatMessages = []
        this.isConnected = false
      } catch (error) {
        console.error('Failed to end session:', error)
        throw error
      }
    },

    async kickParticipant(participantId: string) {
      try {
        if (!this.currentSession) return

        const participant = this.currentSession.participants.find(p => p.id === participantId)
        if (participant) {
          this.currentSession.participants = this.currentSession.participants.filter(p => p.id !== participantId)
          
          // Add activity
          this.addActivity({
            type: 'leave',
            message: `${participant.name} was removed from the session`,
            user: participant,
            timestamp: new Date().toISOString()
          })
        }
      } catch (error) {
        console.error('Failed to kick participant:', error)
        throw error
      }
    },

    async findSessionByCode(code: string) {
      try {
        // Mock API call - in real app would validate code
        return `session-${code}`
      } catch (error) {
        console.error('Failed to find session by code:', error)
        throw error
      }
    },

    async fetchPublicSessions() {
      try {
        // Mock API call
        this.publicSessions = [
          {
            id: 'public-1',
            name: 'Math Department Planning',
            description: 'Planning schedule for mathematics courses',
            ownerId: 'teacher-1',
            participants: [
              {
                id: 'teacher-1',
                name: 'John Smith',
                color: '#3b82f6',
                status: 'online',
                isOwner: true,
                joinedAt: new Date().toISOString()
              }
            ],
            isPublic: true,
            maxParticipants: 5,
            createdAt: new Date().toISOString(),
            settings: {
              allowAnonymousJoin: false,
              autoResolveConflicts: true,
              maxParticipants: 5,
              sessionTimeout: 8
            }
          }
        ]
      } catch (error) {
        console.error('Failed to fetch public sessions:', error)
        throw error
      }
    },

    addConflict(conflict: Partial<Conflict>) {
      const newConflict: Conflict = {
        id: `conflict-${Date.now()}`,
        title: conflict.title || 'Schedule Conflict',
        type: conflict.type || 'schedule_edit',
        description: conflict.description || '',
        involvedUsers: conflict.involvedUsers || [],
        resolutionOptions: conflict.resolutionOptions || [],
        status: 'active',
        createdAt: new Date().toISOString()
      }

      this.activeConflicts.push(newConflict)

      // Add activity
      this.addActivity({
        type: 'conflict',
        message: `New conflict: ${newConflict.title}`,
        user: this.currentSession?.participants[0]!,
        timestamp: new Date().toISOString(),
        conflictId: newConflict.id
      })
    },

    async resolveConflict(conflictId: string) {
      try {
        const conflictIndex = this.activeConflicts.findIndex(c => c.id === conflictId)
        if (conflictIndex !== -1) {
          const conflict = this.activeConflicts[conflictIndex]
          conflict.status = 'resolved'
          this.activeConflicts.splice(conflictIndex, 1)

          // Add activity
          this.addActivity({
            type: 'resolution',
            message: `Conflict resolved: ${conflict.title}`,
            user: this.currentSession?.participants[0]!,
            timestamp: new Date().toISOString()
          })
        }
      } catch (error) {
        console.error('Failed to resolve conflict:', error)
        throw error
      }
    },

    async voteForResolution(conflictId: string, resolutionId: string, userId: string) {
      try {
        const conflict = this.activeConflicts.find(c => c.id === conflictId)
        if (conflict) {
          const option = conflict.resolutionOptions.find(o => o.id === resolutionId)
          if (option) {
            option.votes = (option.votes || 0) + 1
            
            // Auto-resolve if majority votes
            const totalVotes = conflict.resolutionOptions.reduce((sum, o) => sum + (o.votes || 0), 0)
            const participantCount = this.currentSession?.participants.length || 1
            
            if (option.votes > participantCount / 2) {
              await this.resolveConflict(conflictId)
            }
          }
        }
      } catch (error) {
        console.error('Failed to vote for resolution:', error)
        throw error
      }
    },

    async forceResolveConflict(conflictId: string) {
      try {
        await this.resolveConflict(conflictId)
      } catch (error) {
        console.error('Failed to force resolve conflict:', error)
        throw error
      }
    },

    sendMessage(message: Partial<ChatMessage>) {
      const chatMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        text: message.text || '',
        userId: message.userId || '',
        user: this.currentSession?.participants.find(p => p.id === message.userId) || {
          id: message.userId || '',
          name: 'Unknown User',
          color: '#6b7280',
          status: 'online'
        },
        sessionId: message.sessionId || '',
        timestamp: new Date().toISOString(),
        attachments: message.attachments
      }

      this.chatMessages.push(chatMessage)

      // Keep only last 100 messages
      if (this.chatMessages.length > 100) {
        this.chatMessages = this.chatMessages.slice(-100)
      }
    },

    addActivity(activity: Partial<Activity>) {
      const newActivity: Activity = {
        id: `activity-${Date.now()}`,
        type: activity.type || 'edit',
        message: activity.message || '',
        user: activity.user || this.currentSession?.participants[0]!,
        timestamp: new Date().toISOString(),
        conflictId: activity.conflictId
      }

      this.recentActivities.unshift(newActivity)

      // Keep only last 50 activities
      if (this.recentActivities.length > 50) {
        this.recentActivities = this.recentActivities.slice(0, 50)
      }
    },

    setTypingUsers(users: User[]) {
      this.typingUsers = users
    },

    async updateSessionSettings(settings: Partial<CollaborationSession['settings']>) {
      try {
        if (!this.currentSession) return

        this.currentSession.settings = {
          ...this.currentSession.settings,
          ...settings
        }

        // Add activity
        this.addActivity({
          type: 'edit',
          message: 'Session settings updated',
          user: this.currentSession.participants.find(p => p.isOwner)!,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        console.error('Failed to update session settings:', error)
        throw error
      }
    },

    updateUserStatus(userId: string, status: User['status']) {
      if (this.currentSession) {
        const participant = this.currentSession.participants.find(p => p.id === userId)
        if (participant) {
          participant.status = status
        }
      }
      
      const activeUser = this.activeUsers.find(u => u.id === userId)
      if (activeUser) {
        activeUser.status = status
      }
    },

    updateUserAction(userId: string, action?: string) {
      if (this.currentSession) {
        const participant = this.currentSession.participants.find(p => p.id === userId)
        if (participant) {
          participant.currentAction = action
        }
      }
      
      const activeUser = this.activeUsers.find(u => u.id === userId)
      if (activeUser) {
        activeUser.currentAction = action
      }
    }
  }
})