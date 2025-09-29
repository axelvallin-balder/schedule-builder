import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { nextTick } from 'vue'
import { ConflictResolutionService, useConflictResolution, useConflictResolutionState } from '../../services/conflictResolution'
import type { WebSocketService, ConflictData } from '../../services/websocket'

// Mock WebSocket service
const mockWebSocketService = {
  subscribe: vi.fn(),
  resolveConflict: vi.fn(),
  emit: vi.fn(),
  connected: { value: true },
  users: { value: [] },
  currentUser: { value: null }
} as unknown as WebSocketService

describe('ConflictResolutionService', () => {
  let conflictService: ConflictResolutionService
  let mockConflictDetectedCallback: Mock
  let mockConflictResolvedCallback: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset callbacks
    mockConflictDetectedCallback = vi.fn()
    mockConflictResolvedCallback = vi.fn()
    
    // Setup WebSocket service mock
    ;(mockWebSocketService.subscribe as Mock).mockImplementation((event: string, callback: Function) => {
      if (event === 'conflict_detected') {
        mockConflictDetectedCallback = callback as Mock
      } else if (event === 'conflict_resolved') {
        mockConflictResolvedCallback = callback as Mock
      }
    })
    
    conflictService = new ConflictResolutionService(mockWebSocketService)
  })

  describe('initialization', () => {
    it('should initialize with default settings', () => {
      expect(conflictService.isAutoResolutionEnabled()).toBe(true)
      expect(conflictService.activeConflictCount).toBe(0)
      expect(conflictService.highPriorityConflictCount).toBe(0)
    })

    it('should register default resolution strategies', () => {
      const strategies = conflictService.getAvailableStrategies()
      expect(strategies).toHaveLength(3)
      
      const strategyIds = strategies.map((s: any) => s.id)
      expect(strategyIds).toContain('latest_timestamp')
      expect(strategyIds).toContain('intelligent_merge')
      expect(strategyIds).toContain('user_priority')
    })

    it('should setup WebSocket listeners', () => {
      expect(mockWebSocketService.subscribe).toHaveBeenCalledWith('conflict_detected', expect.any(Function))
      expect(mockWebSocketService.subscribe).toHaveBeenCalledWith('conflict_resolved', expect.any(Function))
    })
  })

  describe('conflict detection handling', () => {
    const mockConflict: ConflictData = {
      conflictId: 'conflict-1',
      scheduleId: 'schedule-1',
      lessonId: 'lesson-1',
      conflictingVersions: [
        {
          userId: 'user1',
          timestamp: '2024-01-01T10:00:00Z',
          version: 1,
          changes: {
            startTime: '09:00',
            classroom: 'A101'
          }
        },
        {
          userId: 'user2',
          timestamp: '2024-01-01T10:01:00Z',
          version: 2,
          changes: {
            startTime: '09:30',
            classroom: 'B202'
          }
        }
      ],
      timestamp: '2024-01-01T10:02:00Z'
    }

    it('should handle conflict detection', async () => {
      mockConflictDetectedCallback(mockConflict)
      await nextTick()

      expect(conflictService.activeConflictCount).toBe(1)
      
      const metadata = conflictService.getConflictMetadata('conflict-1')
      expect(metadata).toBeDefined()
      expect(metadata?.conflictId).toBe('conflict-1')
      expect(metadata?.involvedUsers).toEqual(['user1', 'user2'])
      expect(metadata?.fieldConflicts).toHaveLength(2)
    })

    it('should analyze conflict metadata correctly', async () => {
      mockConflictDetectedCallback(mockConflict)
      await nextTick()

      const metadata = conflictService.getConflictMetadata('conflict-1')
      expect(metadata?.severity).toBe('high') // startTime is high priority
      expect(metadata?.fieldConflicts[0].field).toBe('startTime')
      expect(metadata?.fieldConflicts[0].values).toHaveLength(2)
      expect(metadata?.fieldConflicts[1].field).toBe('classroom')
    })

    it('should attempt auto-resolution for resolvable conflicts', async () => {
      const lowPriorityConflict: ConflictData = {
        ...mockConflict,
        conflictingVersions: [
          {
            userId: 'user1',
            timestamp: '2024-01-01T10:00:00Z',
            version: 1,
            changes: { subject: 'Math' }
          },
          {
            userId: 'user2',
            timestamp: '2024-01-01T10:01:00Z',
            version: 2,
            changes: { subject: 'Physics' }
          }
        ]
      }

      mockConflictDetectedCallback(lowPriorityConflict)
      await nextTick()

      // Should attempt auto-resolution for low priority conflicts
      expect(mockWebSocketService.resolveConflict).toHaveBeenCalled()
    })

    it('should not auto-resolve high priority conflicts', async () => {
      // High priority conflict with teacher and time changes
      const highPriorityConflict: ConflictData = {
        ...mockConflict,
        conflictingVersions: [
          {
            userId: 'user1',
            timestamp: '2024-01-01T10:00:00Z',
            version: 1,
            changes: {
              startTime: '09:00',
              teacherId: 'teacher1'
            }
          },
          {
            userId: 'user2',
            timestamp: '2024-01-01T10:01:00Z',
            version: 2,
            changes: {
              startTime: '09:30',
              teacherId: 'teacher2'
            }
          }
        ]
      }

      mockConflictDetectedCallback(highPriorityConflict)
      await nextTick()

      // Should not auto-resolve high priority conflicts
      expect(mockWebSocketService.resolveConflict).not.toHaveBeenCalled()
    })
  })

  describe('conflict resolution strategies', () => {
    it('should resolve with latest timestamp strategy', async () => {
      const strategies = conflictService.getAvailableStrategies()
      const latestStrategy = strategies.find((s: any) => s.id === 'latest_timestamp')!

      const mockConflict: ConflictData = {
        conflictId: 'conflict-1',
        scheduleId: 'schedule-1',
        lessonId: 'lesson-1',
        conflictingVersions: [
          {
            userId: 'user1',
            timestamp: '2024-01-01T10:00:00Z',
            version: 1,
            changes: { classroom: 'A101' }
          },
          {
            userId: 'user2',
            timestamp: '2024-01-01T10:01:00Z',
            version: 2,
            changes: { classroom: 'B202' }
          }
        ],
        timestamp: '2024-01-01T10:02:00Z'
      }

      const resolution = await latestStrategy.handler(mockConflict)

      expect(resolution.conflictId).toBe('conflict-1')
      expect(resolution.strategy).toBe('auto_latest')
      expect(resolution.acceptedVersion.userId).toBe('user2') // Latest timestamp
    })

    it('should resolve with intelligent merge strategy', async () => {
      const strategies = conflictService.getAvailableStrategies()
      const mergeStrategy = strategies.find((s: any) => s.id === 'intelligent_merge')!

      const mockConflict: ConflictData = {
        conflictId: 'conflict-1',
        scheduleId: 'schedule-1',
        lessonId: 'lesson-1',
        conflictingVersions: [
          {
            userId: 'user1',
            timestamp: '2024-01-01T10:00:00Z',
            version: 1,
            changes: {
              startTime: '09:00',
              subject: 'Math'
            }
          },
          {
            userId: 'user2',
            timestamp: '2024-01-01T10:01:00Z',
            version: 2,
            changes: {
              startTime: '09:30',
              classroom: 'B202'
            }
          }
        ],
        timestamp: '2024-01-01T10:02:00Z'
      }

      const resolution = await mergeStrategy.handler(mockConflict)

      expect(resolution.conflictId).toBe('conflict-1')
      expect(resolution.strategy).toBe('merge')
      expect(resolution.mergedData).toBeDefined()
      expect(resolution.mergedData.startTime).toBe('09:30') // Latest for high priority field
    })

    it('should resolve with user priority strategy', async () => {
      const strategies = conflictService.getAvailableStrategies()
      const userPriorityStrategy = strategies.find((s: any) => s.id === 'user_priority')!

      const mockConflict: ConflictData = {
        conflictId: 'conflict-1',
        scheduleId: 'schedule-1',
        lessonId: 'lesson-1',
        conflictingVersions: [
          {
            userId: 'admin_user',
            timestamp: '2024-01-01T10:00:00Z',
            version: 1,
            changes: { classroom: 'A101' }
          },
          {
            userId: 'regular_user',
            timestamp: '2024-01-01T10:01:00Z',
            version: 2,
            changes: { classroom: 'B202' }
          }
        ],
        timestamp: '2024-01-01T10:02:00Z'
      }

      const resolution = await userPriorityStrategy.handler(mockConflict)

      expect(resolution.conflictId).toBe('conflict-1')
      expect(resolution.strategy).toBe('auto_latest')
      expect(resolution.acceptedVersion.classroom).toBe('A101') // Admin user has priority
    })
  })

  describe('manual conflict resolution', () => {
    it('should resolve conflict manually', async () => {
      const acceptedValues = {
        startTime: '09:15',
        classroom: 'C303'
      }

      await conflictService.resolveConflictManually('conflict-1', acceptedValues, 'user1')

      expect(mockWebSocketService.resolveConflict).toHaveBeenCalledWith(
        'conflict-1',
        expect.objectContaining({
          conflictId: 'conflict-1',
          strategy: 'manual',
          acceptedVersion: acceptedValues,
          resolvedBy: 'user1'
        })
      )
    })

    it('should handle resolution errors', async () => {
      (mockWebSocketService.resolveConflict as Mock).mockRejectedValue(new Error('Network error'))

      await expect(
        conflictService.resolveConflictManually('conflict-1', {}, 'user1')
      ).rejects.toThrow('Network error')
    })
  })

  describe('conflict resolution handling', () => {
    it('should handle conflict resolved event', async () => {
      // First add a conflict
      const mockConflict: ConflictData = {
        conflictId: 'conflict-1',
        scheduleId: 'schedule-1',
        lessonId: 'lesson-1',
        conflictingVersions: [],
        timestamp: '2024-01-01T10:00:00Z'
      }

      mockConflictDetectedCallback(mockConflict)
      await nextTick()

      expect(conflictService.activeConflictCount).toBe(1)

      // Then resolve it
      const resolution = {
        conflictId: 'conflict-1',
        strategy: 'manual',
        resolvedBy: 'user1',
        timestamp: '2024-01-01T10:05:00Z'
      }

      mockConflictResolvedCallback(resolution)
      await nextTick()

      expect(conflictService.activeConflictCount).toBe(0)
      expect(conflictService.getResolutionHistory()).toHaveLength(1)
      expect(conflictService.getResolutionHistory()[0]).toEqual(resolution)
    })

    it('should limit resolution history', async () => {
      // Add 105 resolutions
      for (let i = 0; i < 105; i++) {
        const resolution = {
          conflictId: `conflict-${i}`,
          strategy: 'manual',
          resolvedBy: 'user1',
          timestamp: new Date().toISOString()
        }
        mockConflictResolvedCallback(resolution)
        await nextTick()
      }

      // Should keep only last 100
      expect(conflictService.getResolutionHistory()).toHaveLength(100)
    })
  })

  describe('configuration and state', () => {
    it('should toggle auto-resolution setting', () => {
      expect(conflictService.isAutoResolutionEnabled()).toBe(true)

      conflictService.setAutoResolutionEnabled(false)
      expect(conflictService.isAutoResolutionEnabled()).toBe(false)

      conflictService.setAutoResolutionEnabled(true)
      expect(conflictService.isAutoResolutionEnabled()).toBe(true)
    })

    it('should group conflicts by schedule', async () => {
      const conflict1: ConflictData = {
        conflictId: 'conflict-1',
        scheduleId: 'schedule-1',
        lessonId: 'lesson-1',
        conflictingVersions: [],
        timestamp: '2024-01-01T10:00:00Z'
      }

      const conflict2: ConflictData = {
        conflictId: 'conflict-2',
        scheduleId: 'schedule-1',
        lessonId: 'lesson-2',
        conflictingVersions: [],
        timestamp: '2024-01-01T10:01:00Z'
      }

      const conflict3: ConflictData = {
        conflictId: 'conflict-3',
        scheduleId: 'schedule-2',
        lessonId: 'lesson-3',
        conflictingVersions: [],
        timestamp: '2024-01-01T10:02:00Z'
      }

      mockConflictDetectedCallback(conflict1)
      mockConflictDetectedCallback(conflict2)
      mockConflictDetectedCallback(conflict3)
      await nextTick()

      const conflictsBySchedule = conflictService.conflictsBySchedule
      expect(conflictsBySchedule.size).toBe(2)
      expect(conflictsBySchedule.get('schedule-1')).toHaveLength(2)
      expect(conflictsBySchedule.get('schedule-2')).toHaveLength(1)
    })

    it('should count high priority conflicts', async () => {
      const highPriorityConflict: ConflictData = {
        conflictId: 'conflict-1',
        scheduleId: 'schedule-1',
        lessonId: 'lesson-1',
        conflictingVersions: [
          {
            userId: 'user1',
            timestamp: '2024-01-01T10:00:00Z',
            version: 1,
            changes: { startTime: '09:00' }
          },
          {
            userId: 'user2',
            timestamp: '2024-01-01T10:01:00Z',
            version: 2,
            changes: { startTime: '09:30' }
          }
        ],
        timestamp: '2024-01-01T10:02:00Z'
      }

      const lowPriorityConflict: ConflictData = {
        conflictId: 'conflict-2',
        scheduleId: 'schedule-1',
        lessonId: 'lesson-2',
        conflictingVersions: [
          {
            userId: 'user1',
            timestamp: '2024-01-01T10:00:00Z',
            version: 1,
            changes: { subject: 'Math' }
          },
          {
            userId: 'user2',
            timestamp: '2024-01-01T10:01:00Z',
            version: 2,
            changes: { subject: 'Physics' }
          }
        ],
        timestamp: '2024-01-01T10:02:00Z'
      }

      mockConflictDetectedCallback(highPriorityConflict)
      mockConflictDetectedCallback(lowPriorityConflict)
      await nextTick()

      expect(conflictService.activeConflictCount).toBe(2)
      expect(conflictService.highPriorityConflictCount).toBe(1)
    })
  })

  describe('custom strategies', () => {
    it('should allow registering custom strategies', () => {
      const customStrategy = {
        id: 'custom_strategy',
        name: 'Custom Strategy',
        description: 'A custom resolution strategy',
        automatic: true,
        handler: vi.fn().mockResolvedValue({
          conflictId: 'test',
          strategy: 'custom',
          resolvedBy: 'system',
          timestamp: new Date().toISOString()
        })
      }

      conflictService.registerStrategy(customStrategy)

      const strategies = conflictService.getAvailableStrategies()
      expect(strategies).toHaveLength(4)
      expect(strategies.find((s: any) => s.id === 'custom_strategy')).toBeDefined()
    })
  })
})

describe('useConflictResolution composable', () => {
  it('should return the same instance', () => {
    const service1 = useConflictResolution(mockWebSocketService)
    const service2 = useConflictResolution()

    expect(service1).toBe(service2)
  })

  it('should throw error if no WebSocket service provided initially', () => {
    // Reset singleton
    ;(useConflictResolution as any).conflictServiceInstance = null

    expect(() => useConflictResolution()).toThrow(
      'WebSocket service is required to initialize conflict resolution service'
    )
  })
})

describe('useConflictResolutionState composable', () => {
  beforeEach(() => {
    // Ensure service is initialized
    useConflictResolution(mockWebSocketService)
  })

  it('should provide reactive state', () => {
    const state = useConflictResolutionState()

    expect(state.activeConflicts).toBeDefined()
    expect(state.activeConflictCount).toBeDefined()
    expect(state.highPriorityConflictCount).toBeDefined()
    expect(state.conflictsBySchedule).toBeDefined()
    expect(state.resolutionHistory).toBeDefined()
    expect(state.isAutoResolutionEnabled).toBeDefined()
    expect(state.availableStrategies).toBeDefined()

    // Should be reactive
    expect(state.activeConflictCount.value).toBe(0)
    expect(state.isAutoResolutionEnabled.value).toBe(true)
    expect(state.availableStrategies.value).toHaveLength(3)
  })
})