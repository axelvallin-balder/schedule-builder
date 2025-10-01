import { ref, reactive, computed } from 'vue'
import { useScheduleStore, useRulesStore, useEntitiesStore } from '../app/stores'

// Types
export interface WebSocketMessage {
  type: string
  data?: any
}

export interface ScheduleUpdate {
  scheduleId: string
  lessonId: string
  changes: Record<string, any>
  userId: string
  timestamp: string
  version: number
}

export interface RuleChange {
  ruleId: string
  action: 'created' | 'updated' | 'deleted' | 'toggled'
  rule?: any
  userId: string
  timestamp: string
}

export interface UserPresence {
  userId: string
  status: 'online' | 'offline' | 'away'
  lastSeen: string
  currentSchedule?: string
}

export interface ConflictData {
  conflictId: string
  scheduleId: string
  lessonId: string
  conflictingVersions: any[]
  timestamp: string
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

// WebSocket Service Class
export class WebSocketService {
  private ws: WebSocket | null = null
  private url: string
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map()
  
  // Reactive state
  public connectionState = ref<ConnectionState>('disconnected')
  public lastError = ref<string | null>(null)
  public isAuthenticated = ref(false)
  public currentUserId = ref<string | null>(null)
  public connectedUsers = reactive<Map<string, UserPresence>>(new Map())
  public activeConflicts = reactive<ConflictData[]>([])

  // Connection management
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private heartbeatInterval: number | null = null
  private authToken: string | null = null

  constructor(url: string) {
    this.url = url
  }

  async connect(userId: string, token: string): Promise<void> {
    if (this.connectionState.value === 'connecting' || this.connectionState.value === 'connected') {
      return
    }

    this.currentUserId.value = userId
    this.authToken = token
    this.connectionState.value = 'connecting'
    this.lastError.value = null

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.connectionState.value = 'connected'
          this.reconnectAttempts = 0
          this.startHeartbeat()
          
          // Authenticate immediately after connection
          this.authenticate(userId, token)
          resolve()
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason)
          this.handleDisconnection(event.code !== 1000) // Unexpected if not normal close
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.connectionState.value = 'error'
          this.lastError.value = 'Connection failed'
          reject(new Error('WebSocket connection failed'))
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }
      } catch (error) {
        this.connectionState.value = 'error'
        this.lastError.value = 'Failed to create WebSocket connection'
        reject(error)
      }
    })
  }

  disconnect(): void {
    this.stopHeartbeat()
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect')
      this.ws = null
    }
    
    this.connectionState.value = 'disconnected'
    this.isAuthenticated.value = false
    this.currentUserId.value = null
    this.authToken = null
    this.connectedUsers.clear()
    this.activeConflicts.splice(0)
  }

  private handleDisconnection(unexpected: boolean): void {
    this.stopHeartbeat()
    this.connectionState.value = 'disconnected'
    this.isAuthenticated.value = false
    
    if (unexpected && this.reconnectAttempts < this.maxReconnectAttempts && this.currentUserId.value && this.authToken) {
      // Attempt reconnection
      this.reconnectAttempts++
      this.connectionState.value = 'reconnecting'
      
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000)
      console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`)
      
      setTimeout(() => {
        if (this.currentUserId.value && this.authToken) {
          this.connect(this.currentUserId.value, this.authToken).catch(error => {
            console.error('Reconnection failed:', error)
          })
        }
      }, delay)
    }
  }

  private authenticate(userId: string, token: string): void {
    this.send({
      type: 'authenticate',
      data: { userId, token }
    })
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'connection_established':
        console.log('WebSocket connection established')
        break

      case 'authenticated':
        this.isAuthenticated.value = true
        this.emitEvent('authenticated', message.data)
        break

      case 'schedule_update':
        this.handleScheduleUpdate(message.data)
        break

      case 'rule_change':
        this.handleRuleChange(message.data)
        break

      case 'user_presence':
        this.handleUserPresence(message.data)
        break

      case 'user_joined_schedule':
        this.emitEvent('user_joined_schedule', message.data)
        break

      case 'user_left_schedule':
        this.emitEvent('user_left_schedule', message.data)
        break

      case 'conflict_detected':
        this.handleConflictDetected(message.data)
        break

      case 'conflict_resolved':
        this.handleConflictResolved(message.data)
        break

      case 'update_confirmed':
        this.emitEvent('update_confirmed', message.data)
        break

      case 'schedule_state':
        this.emitEvent('schedule_state', message.data)
        break

      case 'system_message':
        this.emitEvent('system_message', message.data)
        break

      case 'heartbeat_ack':
        // Heartbeat acknowledged
        break

      case 'presence_data':
        this.handlePresenceData(message.data)
        break

      case 'error':
        this.handleError(message.data)
        break

      default:
        console.warn('Unknown message type:', message.type)
    }
  }

  private handleScheduleUpdate(data: ScheduleUpdate): void {
    // Update local store with the changes
    const scheduleStore = useScheduleStore()
    
    if (scheduleStore.currentSchedule?.id === data.scheduleId) {
      // Find and update the lesson
      const lesson = scheduleStore.currentSchedule.lessons.find(l => l.id === data.lessonId)
      if (lesson) {
        Object.assign(lesson, data.changes)
        
        // Update version if provided
        if (data.version) {
          scheduleStore.currentSchedule.version = data.version
        }
      }
    }

    this.emitEvent('schedule_update', data)
  }

  private handleRuleChange(data: RuleChange): void {
    const rulesStore = useRulesStore()
    
    switch (data.action) {
      case 'created':
        if (data.rule) {
          rulesStore.rules.unshift(data.rule)
        }
        break
      
      case 'updated':
        if (data.rule) {
          const index = rulesStore.rules.findIndex(r => r.id === data.ruleId)
          if (index !== -1) {
            rulesStore.rules[index] = data.rule
          }
        }
        break
      
      case 'deleted':
        rulesStore.rules = rulesStore.rules.filter(r => r.id !== data.ruleId)
        break
      
      case 'toggled':
        const rule = rulesStore.rules.find(r => r.id === data.ruleId)
        if (rule && data.rule) {
          rule.enabled = data.rule.enabled
        }
        break
    }

    this.emitEvent('rule_change', data)
  }

  private handleUserPresence(data: UserPresence): void {
    if (data.status === 'offline') {
      this.connectedUsers.delete(data.userId)
    } else {
      this.connectedUsers.set(data.userId, data)
    }
    
    this.emitEvent('user_presence', data)
  }

  private handlePresenceData(data: { users: UserPresence[]; timestamp: string }): void {
    // Update connected users list
    this.connectedUsers.clear()
    data.users.forEach(user => {
      this.connectedUsers.set(user.userId, user)
    })
    
    this.emitEvent('presence_data', data)
  }

  private handleConflictDetected(data: ConflictData): void {
    this.activeConflicts.push(data)
    this.emitEvent('conflict_detected', data)
  }

  private handleConflictResolved(data: any): void {
    const index = this.activeConflicts.findIndex(c => c.conflictId === data.conflictId)
    if (index !== -1) {
      this.activeConflicts.splice(index, 1)
    }
    
    this.emitEvent('conflict_resolved', data)
  }

  private handleError(data: { error: string; timestamp: string }): void {
    this.lastError.value = data.error
    console.error('WebSocket error:', data.error)
    this.emitEvent('error', data)
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'heartbeat' })
      }
    }, 30000) // Send heartbeat every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private emitEvent(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error)
        }
      })
    }
  }

  // Public methods
  send(message: WebSocketMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }
    
    this.ws.send(JSON.stringify(message))
  }

  subscribe(eventType: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(callback)
  }

  unsubscribe(eventType: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN && this.isAuthenticated.value
  }

  // Schedule collaboration methods
  sendScheduleUpdate(update: Omit<ScheduleUpdate, 'userId' | 'timestamp'>): void {
    this.send({
      type: 'schedule_update',
      data: update
    })
  }

  sendRuleChange(change: Omit<RuleChange, 'userId' | 'timestamp'>): void {
    this.send({
      type: 'rule_change',
      data: change
    })
  }

  joinSchedule(scheduleId: string): void {
    this.send({
      type: 'join_schedule',
      data: { scheduleId }
    })
  }

  leaveSchedule(scheduleId: string): void {
    this.send({
      type: 'leave_schedule',
      data: { scheduleId }
    })
  }

  resolveConflict(conflictId: string, resolution: any): void {
    this.send({
      type: 'conflict_resolution',
      data: {
        conflictId,
        resolution
      }
    })
  }

  requestPresence(userIds?: string[]): void {
    this.send({
      type: 'get_presence',
      data: { userIds }
    })
  }

  // Computed properties for reactive access
  get connectedUsersList(): UserPresence[] {
    return Array.from(this.connectedUsers.values())
  }

  get onlineUsersCount(): number {
    return this.connectedUsersList.filter(user => user.status === 'online').length
  }

  get hasActiveConflicts(): boolean {
    return this.activeConflicts.length > 0
  }
}

// Global WebSocket service instance
let wsServiceInstance: WebSocketService | null = null

export function useWebSocket(): WebSocketService {
  if (!wsServiceInstance) {
    // Get WebSocket URL from runtime config or environment
    const wsUrl = process.env.NUXT_PUBLIC_WS_URL || 'ws://localhost:3001'
    wsServiceInstance = new WebSocketService(wsUrl)
  }
  return wsServiceInstance
}

// Composable for reactive WebSocket state
export function useWebSocketState() {
  const ws = useWebSocket()
  
  return {
    connectionState: computed(() => ws.connectionState.value),
    isConnected: computed(() => ws.isConnected()),
    isAuthenticated: computed(() => ws.isAuthenticated.value),
    currentUserId: computed(() => ws.currentUserId.value),
    lastError: computed(() => ws.lastError.value),
    connectedUsers: computed(() => ws.connectedUsersList),
    onlineUsersCount: computed(() => ws.onlineUsersCount),
    activeConflicts: computed(() => ws.activeConflicts),
    hasActiveConflicts: computed(() => ws.hasActiveConflicts)
  }
}

// Composable for WebSocket events
export function useWebSocketEvents() {
  const ws = useWebSocket()
  
  return {
    subscribe: ws.subscribe.bind(ws),
    unsubscribe: ws.unsubscribe.bind(ws),
    send: ws.send.bind(ws)
  }
}

// Composable for schedule collaboration
export function useScheduleCollaboration() {
  const ws = useWebSocket()
  
  return {
    sendScheduleUpdate: ws.sendScheduleUpdate.bind(ws),
    sendRuleChange: ws.sendRuleChange.bind(ws),
    joinSchedule: ws.joinSchedule.bind(ws),
    leaveSchedule: ws.leaveSchedule.bind(ws),
    resolveConflict: ws.resolveConflict.bind(ws),
    requestPresence: ws.requestPresence.bind(ws)
  }
}

export default WebSocketService