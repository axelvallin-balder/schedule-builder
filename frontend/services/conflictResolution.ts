import { ref, reactive, computed } from 'vue'
import type { ConflictData, ScheduleUpdate, WebSocketService } from './websocket'
import type { Lesson, Schedule } from '../app/stores'

// Types for conflict resolution
export interface ConflictResolution {
  conflictId: string
  strategy: 'manual' | 'auto_latest' | 'auto_oldest' | 'merge'
  acceptedVersion?: any
  rejectedVersions?: any[]
  mergedData?: any
  resolvedBy: string
  timestamp: string
}

export interface ConflictResolutionStrategy {
  id: string
  name: string
  description: string
  automatic: boolean
  handler: (conflict: ConflictData) => ConflictResolution | Promise<ConflictResolution>
}

export interface ConflictMetadata {
  conflictId: string
  scheduleId: string
  lessonId: string
  fieldConflicts: FieldConflict[]
  involvedUsers: string[]
  timestamp: string
  severity: 'low' | 'medium' | 'high'
  autoResolvable: boolean
}

export interface FieldConflict {
  field: string
  values: Array<{
    value: any
    userId: string
    timestamp: string
    version: number
  }>
  recommended?: any
}

export class ConflictResolutionService {
  private wsService: WebSocketService
  private activeConflicts = reactive<Map<string, ConflictMetadata>>(new Map())
  private resolutionHistory = reactive<ConflictResolution[]>([])
  private autoResolutionEnabled = ref(true)
  private strategies: Map<string, ConflictResolutionStrategy> = new Map()

  constructor(wsService: WebSocketService) {
    this.wsService = wsService
    this.setupWebSocketListeners()
    this.registerDefaultStrategies()
  }

  private setupWebSocketListeners(): void {
    this.wsService.subscribe('conflict_detected', (conflict: ConflictData) => {
      this.handleConflictDetected(conflict)
    })

    this.wsService.subscribe('conflict_resolved', (resolution: any) => {
      this.handleConflictResolved(resolution)
    })
  }

  private registerDefaultStrategies(): void {
    // Strategy 1: Accept latest timestamp
    this.registerStrategy({
      id: 'latest_timestamp',
      name: 'Latest Change Wins',
      description: 'Automatically accept the change with the most recent timestamp',
      automatic: true,
      handler: async (conflict: ConflictData) => {
        const metadata = this.analyzeConflict(conflict)
        
        // Find the latest change across all fields
        let latestChange: any = null
        let latestTimestamp = ''
        
        metadata.fieldConflicts.forEach(fieldConflict => {
          fieldConflict.values.forEach(value => {
            if (value.timestamp > latestTimestamp) {
              latestTimestamp = value.timestamp
              latestChange = value
            }
          })
        })

        return {
          conflictId: conflict.conflictId,
          strategy: 'auto_latest',
          acceptedVersion: latestChange,
          resolvedBy: 'system',
          timestamp: new Date().toISOString()
        }
      }
    })

    // Strategy 2: Field-level intelligent merge
    this.registerStrategy({
      id: 'intelligent_merge',
      name: 'Intelligent Merge',
      description: 'Merge non-conflicting changes and resolve conflicts based on field priority',
      automatic: true,
      handler: async (conflict: ConflictData) => {
        const metadata = this.analyzeConflict(conflict)
        const mergedData: any = {}
        
        // Field priority for automatic resolution
        const fieldPriority: Record<string, number> = {
          'startTime': 10,
          'endTime': 10,
          'classroom': 8,
          'teacherId': 9,
          'groupIds': 7,
          'subject': 6
        }

        metadata.fieldConflicts.forEach(fieldConflict => {
          if (fieldConflict.values.length === 1) {
            // No conflict, use the single value
            mergedData[fieldConflict.field] = fieldConflict.values[0].value
          } else {
            // Resolve based on field priority and timestamps
            const priority = fieldPriority[fieldConflict.field] || 5
            
            if (priority >= 8) {
              // High priority: use latest timestamp
              const latest = fieldConflict.values.reduce((prev, curr) => 
                curr.timestamp > prev.timestamp ? curr : prev
              )
              mergedData[fieldConflict.field] = latest.value
            } else {
              // Lower priority: use first value (conservative approach)
              mergedData[fieldConflict.field] = fieldConflict.values[0].value
            }
          }
        })

        return {
          conflictId: conflict.conflictId,
          strategy: 'merge',
          mergedData,
          resolvedBy: 'system',
          timestamp: new Date().toISOString()
        }
      }
    })

    // Strategy 3: User-specific priority
    this.registerStrategy({
      id: 'user_priority',
      name: 'User Priority Resolution',
      description: 'Resolve conflicts based on user roles and permissions',
      automatic: true,
      handler: async (conflict: ConflictData) => {
        // In a real implementation, this would check user roles/permissions
        // For now, we'll use a simple heuristic
        const metadata = this.analyzeConflict(conflict)
        
        // Prefer changes from users with 'admin' or 'teacher' roles
        // This would typically query a user service
        const userPriorities = await this.getUserPriorities(metadata.involvedUsers)
        
        let bestUser = metadata.involvedUsers[0]
        let bestPriority = userPriorities[bestUser] || 0
        
        metadata.involvedUsers.forEach(userId => {
          const priority = userPriorities[userId] || 0
          if (priority > bestPriority) {
            bestPriority = priority
            bestUser = userId
          }
        })

        // Find changes made by the highest priority user
        const acceptedVersion = metadata.fieldConflicts.reduce((acc, fieldConflict) => {
          const userValue = fieldConflict.values.find(v => v.userId === bestUser)
          if (userValue) {
            acc[fieldConflict.field] = userValue.value
          }
          return acc
        }, {} as any)

        return {
          conflictId: conflict.conflictId,
          strategy: 'auto_latest',
          acceptedVersion,
          resolvedBy: 'system',
          timestamp: new Date().toISOString()
        }
      }
    })
  }

  private async getUserPriorities(userIds: string[]): Promise<Record<string, number>> {
    // Mock implementation - in real app, this would query user service
    // Higher numbers = higher priority
    const priorities: Record<string, number> = {}
    
    userIds.forEach(userId => {
      // Simple heuristic based on userId
      if (userId.includes('admin')) {
        priorities[userId] = 10
      } else if (userId.includes('teacher')) {
        priorities[userId] = 8
      } else if (userId.includes('coordinator')) {
        priorities[userId] = 6
      } else {
        priorities[userId] = 3
      }
    })
    
    return priorities
  }

  private handleConflictDetected(conflict: ConflictData): void {
    console.log('Conflict detected:', conflict)
    
    const metadata = this.analyzeConflict(conflict)
    this.activeConflicts.set(conflict.conflictId, metadata)

    // Attempt automatic resolution if enabled and conflict is auto-resolvable
    if (this.autoResolutionEnabled.value && metadata.autoResolvable) {
      this.attemptAutoResolution(conflict, metadata)
    }
  }

  private handleConflictResolved(resolution: any): void {
    console.log('Conflict resolved:', resolution)
    
    // Remove from active conflicts
    this.activeConflicts.delete(resolution.conflictId)
    
    // Add to resolution history
    this.resolutionHistory.unshift(resolution)
    
    // Keep only last 100 resolutions
    if (this.resolutionHistory.length > 100) {
      this.resolutionHistory.splice(100)
    }
  }

  private analyzeConflict(conflict: ConflictData): ConflictMetadata {
    const fieldConflicts: FieldConflict[] = []
    const involvedUsers: Set<string> = new Set()
    
    // Group conflicting versions by field
    const fieldGroups: Record<string, any[]> = {}
    
    conflict.conflictingVersions.forEach(version => {
      involvedUsers.add(version.userId)
      
      Object.keys(version.changes).forEach(field => {
        if (!fieldGroups[field]) {
          fieldGroups[field] = []
        }
        fieldGroups[field].push({
          value: version.changes[field],
          userId: version.userId,
          timestamp: version.timestamp,
          version: version.version
        })
      })
    })

    // Create field conflicts
    Object.keys(fieldGroups).forEach(field => {
      const values = fieldGroups[field]
      
      // Check if there's actually a conflict (different values)
      const uniqueValues = new Set(values.map(v => JSON.stringify(v.value)))
      
      if (uniqueValues.size > 1) {
        fieldConflicts.push({
          field,
          values,
          recommended: this.getRecommendedValue(field, values)
        })
      }
    })

    // Determine severity
    let severity: 'low' | 'medium' | 'high' = 'low'
    
    if (fieldConflicts.some(fc => ['startTime', 'endTime', 'teacherId'].includes(fc.field))) {
      severity = 'high'
    } else if (fieldConflicts.some(fc => ['classroom', 'groupIds'].includes(fc.field))) {
      severity = 'medium'
    }

    // Check if auto-resolvable
    const autoResolvable = severity !== 'high' && fieldConflicts.length <= 3

    return {
      conflictId: conflict.conflictId,
      scheduleId: conflict.scheduleId,
      lessonId: conflict.lessonId,
      fieldConflicts,
      involvedUsers: Array.from(involvedUsers),
      timestamp: conflict.timestamp,
      severity,
      autoResolvable
    }
  }

  private getRecommendedValue(field: string, values: any[]): any {
    // Simple heuristic for recommended values
    switch (field) {
      case 'startTime':
      case 'endTime':
        // For time fields, recommend the earliest start or latest end
        return field === 'startTime' 
          ? values.reduce((min, v) => v.value < min.value ? v : min).value
          : values.reduce((max, v) => v.value > max.value ? v : max).value
      
      case 'classroom':
        // For classroom, prefer the latest change
        return values.reduce((latest, v) => v.timestamp > latest.timestamp ? v : latest).value
      
      case 'teacherId':
        // For teacher, this is critical - no automatic recommendation
        return null
      
      default:
        // For other fields, recommend the latest change
        return values.reduce((latest, v) => v.timestamp > latest.timestamp ? v : latest).value
    }
  }

  private async attemptAutoResolution(conflict: ConflictData, metadata: ConflictMetadata): Promise<void> {
    try {
      // Choose resolution strategy based on conflict characteristics
      let strategy: ConflictResolutionStrategy | undefined
      
      if (metadata.severity === 'low' && metadata.fieldConflicts.length === 1) {
        strategy = this.strategies.get('latest_timestamp')
      } else if (metadata.severity === 'medium') {
        strategy = this.strategies.get('intelligent_merge')
      } else if (metadata.involvedUsers.length <= 2) {
        strategy = this.strategies.get('user_priority')
      }

      if (strategy) {
        console.log(`Attempting auto-resolution with strategy: ${strategy.name}`)
        
        const resolution = await strategy.handler(conflict)
        await this.resolveConflict(resolution)
        
        console.log('Auto-resolution successful')
      } else {
        console.log('No suitable auto-resolution strategy found')
      }
    } catch (error) {
      console.error('Auto-resolution failed:', error)
      // Conflict will remain active for manual resolution
    }
  }

  // Public methods
  public registerStrategy(strategy: ConflictResolutionStrategy): void {
    this.strategies.set(strategy.id, strategy)
  }

  public getAvailableStrategies(): ConflictResolutionStrategy[] {
    return Array.from(this.strategies.values())
  }

  public async resolveConflict(resolution: ConflictResolution): Promise<void> {
    try {
      // Send resolution to WebSocket service
      this.wsService.resolveConflict(resolution.conflictId, resolution)
      
      console.log('Conflict resolution sent:', resolution)
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
      throw error
    }
  }

  public async resolveConflictManually(
    conflictId: string, 
    acceptedValues: Record<string, any>,
    resolvedBy: string
  ): Promise<void> {
    const resolution: ConflictResolution = {
      conflictId,
      strategy: 'manual',
      acceptedVersion: acceptedValues,
      resolvedBy,
      timestamp: new Date().toISOString()
    }

    await this.resolveConflict(resolution)
  }

  public getConflictMetadata(conflictId: string): ConflictMetadata | undefined {
    return this.activeConflicts.get(conflictId)
  }

  public getAllActiveConflicts(): ConflictMetadata[] {
    return Array.from(this.activeConflicts.values())
  }

  public getResolutionHistory(limit: number = 20): ConflictResolution[] {
    return this.resolutionHistory.slice(0, limit)
  }

  public setAutoResolutionEnabled(enabled: boolean): void {
    this.autoResolutionEnabled.value = enabled
  }

  public isAutoResolutionEnabled(): boolean {
    return this.autoResolutionEnabled.value
  }

  // Computed properties
  public get activeConflictCount(): number {
    return this.activeConflicts.size
  }

  public get highPriorityConflictCount(): number {
    return Array.from(this.activeConflicts.values())
      .filter(c => c.severity === 'high').length
  }

  public get conflictsBySchedule(): Map<string, ConflictMetadata[]> {
    const bySchedule = new Map<string, ConflictMetadata[]>()
    
    this.activeConflicts.forEach(conflict => {
      if (!bySchedule.has(conflict.scheduleId)) {
        bySchedule.set(conflict.scheduleId, [])
      }
      bySchedule.get(conflict.scheduleId)!.push(conflict)
    })
    
    return bySchedule
  }
}

// Global conflict resolution service instance
let conflictServiceInstance: ConflictResolutionService | null = null

export function useConflictResolution(wsService?: WebSocketService): ConflictResolutionService {
  if (!conflictServiceInstance) {
    if (!wsService) {
      throw new Error('WebSocket service is required to initialize conflict resolution service')
    }
    conflictServiceInstance = new ConflictResolutionService(wsService)
  }
  return conflictServiceInstance
}

// Composable for reactive conflict resolution state
export function useConflictResolutionState() {
  const conflictService = useConflictResolution()
  
  return {
    activeConflicts: computed(() => conflictService.getAllActiveConflicts()),
    activeConflictCount: computed(() => conflictService.activeConflictCount),
    highPriorityConflictCount: computed(() => conflictService.highPriorityConflictCount),
    conflictsBySchedule: computed(() => conflictService.conflictsBySchedule),
    resolutionHistory: computed(() => conflictService.getResolutionHistory()),
    isAutoResolutionEnabled: computed(() => conflictService.isAutoResolutionEnabled()),
    availableStrategies: computed(() => conflictService.getAvailableStrategies())
  }
}

export default ConflictResolutionService