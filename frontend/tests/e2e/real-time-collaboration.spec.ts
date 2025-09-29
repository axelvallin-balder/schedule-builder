/// <reference types="cypress" />

// Test configuration for collaboration testing
const COLLAB_TEST_CONFIG = {
  websocketTimeout: 5000, // 5s for WebSocket connections
  syncTimeout: 2000, // 2s for state synchronization
  conflictResolutionTimeout: 3000, // 3s for conflict resolution
  reconnectionAttempts: 3
}

// Mock WebSocket for testing
class MockWebSocket {
  public url: string
  public readyState: number = WebSocket.CONNECTING
  public onopen: ((event: Event) => void) | null = null
  public onclose: ((event: CloseEvent) => void) | null = null
  public onmessage: ((event: MessageEvent) => void) | null = null
  public onerror: ((event: Event) => void) | null = null
  
  private messageQueue: any[] = []
  
  constructor(url: string) {
    this.url = url
    
    // Simulate connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 100)
  }
  
  send(data: string) {
    this.messageQueue.push(JSON.parse(data))
  }
  
  close() {
    this.readyState = WebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'))
    }
  }
  
  // Simulate receiving messages
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }
  
  getLastMessage() {
    return this.messageQueue[this.messageQueue.length - 1]
  }
  
  getAllMessages() {
    return this.messageQueue
  }
}

// Test utilities for multi-user simulation
function simulateMultipleUsers(userCount: number = 2) {
  const users = []
  for (let i = 0; i < userCount; i++) {
    users.push({
      id: `user-${i + 1}`,
      name: `Test User ${i + 1}`,
      websocket: new MockWebSocket(`ws://localhost:8080/collaboration`)
    })
  }
  return users
}

describe('Real-time Collaboration E2E Tests', () => {
  beforeEach(() => {
    // Navigate to the schedule builder with collaboration enabled
    cy.visit('/?collaboration=true')
    
    // Set up mock WebSocket
    cy.window().then((win) => {
      ;(win as any).MockWebSocket = MockWebSocket
      ;(win as any).originalWebSocket = win.WebSocket
      win.WebSocket = MockWebSocket as any
    })
    
    // Clear any existing data
    cy.window().then((win) => {
      win.localStorage.clear()
      win.sessionStorage.clear()
    })
  })

  afterEach(() => {
    // Restore original WebSocket
    cy.window().then((win) => {
      if ((win as any).originalWebSocket) {
        win.WebSocket = (win as any).originalWebSocket
      }
    })
  })

  describe('WebSocket Connection and Presence', () => {
    it('should establish WebSocket connection and show user presence', () => {
      // Wait for WebSocket connection
      cy.get('[data-testid="collaboration-status"]', { timeout: COLLAB_TEST_CONFIG.websocketTimeout })
        .should('be.visible')
        .should('contain.text', 'Connected')
      
      // Verify connection indicator
      cy.get('[data-testid="connection-indicator"]')
        .should('have.class', 'connected')
        .should('have.attr', 'aria-label', 'Connected to collaboration server')
      
      // Check user presence display
      cy.get('[data-testid="current-user"]').should('be.visible')
      cy.get('[data-testid="user-avatar"]').should('be.visible')
      cy.get('[data-testid="user-name"]').should('contain.text', 'Test User')
      
      // Simulate another user joining
      cy.window().then((win) => {
        const mockWs = (win as any).collaborationWebSocket
        if (mockWs) {
          mockWs.simulateMessage({
            type: 'user_joined',
            data: {
              userId: 'user-2',
              userName: 'Collaborator',
              timestamp: new Date().toISOString()
            }
          })
        }
      })
      
      // Verify other user appears in presence list
      cy.get('[data-testid="active-users"]', { timeout: 2000 }).should('be.visible')
      cy.get('[data-testid="user-item-user-2"]')
        .should('be.visible')
        .should('contain.text', 'Collaborator')
      
      // Check user count
      cy.get('[data-testid="users-count"]').should('contain.text', '2')
    })

    it('should handle WebSocket disconnection and reconnection', () => {
      // Wait for initial connection
      cy.get('[data-testid="collaboration-status"]').should('contain.text', 'Connected')
      
      // Simulate disconnection
      cy.window().then((win) => {
        const mockWs = (win as any).collaborationWebSocket
        if (mockWs) {
          mockWs.close()
        }
      })
      
      // Should show disconnected state
      cy.get('[data-testid="collaboration-status"]')
        .should('contain.text', 'Disconnected')
      
      cy.get('[data-testid="connection-indicator"]')
        .should('have.class', 'disconnected')
      
      // Should show reconnection attempt
      cy.get('[data-testid="reconnection-status"]', { timeout: 2000 })
        .should('be.visible')
        .should('contain.text', 'Reconnecting')
      
      // Simulate successful reconnection
      cy.window().then((win) => {
        ;(win as any).collaborationWebSocket = new MockWebSocket('ws://localhost:8080/collaboration')
      })
      
      // Should restore connected state
      cy.get('[data-testid="collaboration-status"]', { timeout: COLLAB_TEST_CONFIG.websocketTimeout })
        .should('contain.text', 'Connected')
      
      cy.get('[data-testid="reconnection-notification"]')
        .should('be.visible')
        .should('contain.text', 'Reconnected')
    })

    it('should show real-time cursor positions and selections', () => {
      // Start editing a schedule
      cy.get('[data-testid="create-new-schedule"]').click()
      cy.get('[data-testid="schedule-name"]').click()
      
      // Simulate another user's cursor movement
      cy.window().then((win) => {
        const mockWs = (win as any).collaborationWebSocket
        if (mockWs) {
          mockWs.simulateMessage({
            type: 'cursor_moved',
            data: {
              userId: 'user-2',
              userName: 'Collaborator',
              elementId: 'schedule-name',
              position: { x: 100, y: 50 },
              timestamp: new Date().toISOString()
            }
          })
        }
      })
      
      // Should show other user's cursor
      cy.get('[data-testid="remote-cursor-user-2"]', { timeout: 2000 })
        .should('be.visible')
        .should('have.css', 'position', 'absolute')
      
      cy.get('[data-testid="cursor-label-user-2"]')
        .should('contain.text', 'Collaborator')
      
      // Simulate selection
      cy.window().then((win) => {
        const mockWs = (win as any).collaborationWebSocket
        if (mockWs) {
          mockWs.simulateMessage({
            type: 'selection_changed',
            data: {
              userId: 'user-2',
              elementId: 'schedule-name',
              selectionStart: 0,
              selectionEnd: 5,
              timestamp: new Date().toISOString()
            }
          })
        }
      })
      
      // Should show selection highlight
      cy.get('[data-testid="remote-selection-user-2"]')
        .should('be.visible')
        .should('have.class', 'selection-highlight')
    })
  })

  describe('Concurrent Schedule Editing', () => {
    beforeEach(() => {
      // Set up a basic schedule for editing
      cy.get('[data-testid="create-new-schedule"]').click()
      cy.get('[data-testid="schedule-name"]').type('Collaborative Schedule')
      cy.get('[data-testid="save-schedule"]').click()
      
      // Add a lesson to edit
      cy.get('[data-testid="add-lesson"]').click()
      cy.get('[data-testid="lesson-subject"]').select('Mathematics')
      cy.get('[data-testid="lesson-teacher"]').select('teacher1')
      cy.get('[data-testid="lesson-time"]').select('09:00')
      cy.get('[data-testid="lesson-day"]').select('Monday')
      cy.get('[data-testid="save-lesson"]').click()
    })

    it('should handle concurrent lesson modifications', () => {
      // Start editing a lesson
      cy.get('[data-testid="lesson-card"]').first().click()
      cy.get('[data-testid="edit-lesson"]').click()
      
      // Simulate another user editing the same lesson
      cy.window().then((win) => {
        const mockWs = (win as any).collaborationWebSocket
        if (mockWs) {
          mockWs.simulateMessage({
            type: 'lesson_locked',
            data: {
              lessonId: 'lesson-1',
              lockedBy: 'user-2',
              userName: 'Collaborator',
              timestamp: new Date().toISOString()
            }
          })
        }
      })
      
      // Should show lock notification
      cy.get('[data-testid="lesson-locked-warning"]')
        .should('be.visible')
        .should('contain.text', 'Collaborator is editing')
      
      // Should disable editing controls
      cy.get('[data-testid="lesson-subject"]').should('be.disabled')
      cy.get('[data-testid="lesson-teacher"]').should('be.disabled')
      
      // Should offer view-only mode or take over option
      cy.get('[data-testid="view-only-mode"]').should('be.visible')
      cy.get('[data-testid="request-takeover"]').should('be.visible')
      
      // Simulate lock release
      cy.window().then((win) => {
        const mockWs = (win as any).collaborationWebSocket
        if (mockWs) {
          mockWs.simulateMessage({
            type: 'lesson_unlocked',
            data: {
              lessonId: 'lesson-1',
              timestamp: new Date().toISOString()
            }
          })
        }
      })
      
      // Should re-enable editing
      cy.get('[data-testid="lesson-locked-warning"]').should('not.exist')
      cy.get('[data-testid="lesson-subject"]').should('not.be.disabled')
    })

    it('should synchronize real-time changes across users', () => {
      // Make a change to the schedule
      cy.get('[data-testid="lesson-card"]').first().click()
      cy.get('[data-testid="edit-lesson"]').click()
      cy.get('[data-testid="lesson-time"]').select('10:00')
      cy.get('[data-testid="save-lesson"]').click()
      
      // Verify change was sent via WebSocket
      cy.window().then((win) => {
        const mockWs = (win as any).collaborationWebSocket
        const messages = mockWs?.getAllMessages() || []
        const updateMessage = messages.find((msg: any) => msg.type === 'lesson_updated')
        
        expect(updateMessage).to.exist
        expect(updateMessage.data.changes.time).to.equal('10:00')
      })
      
      // Simulate receiving a change from another user
      cy.window().then((win) => {
        const mockWs = (win as any).collaborationWebSocket
        if (mockWs) {
          mockWs.simulateMessage({
            type: 'lesson_updated',
            data: {
              lessonId: 'lesson-1',
              changes: {
                teacher: 'teacher2',
                classroom: 'Room 201'
              },
              updatedBy: 'user-2',
              userName: 'Collaborator',
              timestamp: new Date().toISOString(),
              version: 2
            }
          })
        }
      })
      
      // Should update the UI automatically
      cy.get('[data-testid="lesson-card"]', { timeout: COLLAB_TEST_CONFIG.syncTimeout })
        .should('contain.text', 'teacher2')
        .should('contain.text', 'Room 201')
      
      // Should show update notification
      cy.get('[data-testid="remote-update-notification"]')
        .should('be.visible')
        .should('contain.text', 'Collaborator updated')
    })

    it('should handle batch operations and bulk changes', () => {
      // Add multiple lessons
      const lessons = [
        { subject: 'Physics', teacher: 'teacher2', time: '11:00', day: 'Monday' },
        { subject: 'Chemistry', teacher: 'teacher3', time: '12:00', day: 'Monday' },
        { subject: 'Biology', teacher: 'teacher4', time: '13:00', day: 'Monday' }
      ]
      
      lessons.forEach((lesson, index) => {
        cy.get('[data-testid="add-lesson"]').click()
        cy.get('[data-testid="lesson-subject"]').select(lesson.subject)
        cy.get('[data-testid="lesson-teacher"]').select(lesson.teacher)
        cy.get('[data-testid="lesson-time"]').select(lesson.time)
        cy.get('[data-testid="lesson-day"]').select(lesson.day)
        cy.get('[data-testid="save-lesson"]').click()
      })
      
      // Select multiple lessons for bulk operation
      cy.get('[data-testid="select-all-lessons"]').check()
      cy.get('[data-testid="selected-lessons-count"]').should('contain.text', '4')
      
      // Perform bulk move operation
      cy.get('[data-testid="bulk-actions"]').click()
      cy.get('[data-testid="move-to-day"]').click()
      cy.get('[data-testid="target-day"]').select('Tuesday')
      cy.get('[data-testid="confirm-bulk-move"]').click()
      
      // Should show progress for bulk operation
      cy.get('[data-testid="bulk-operation-progress"]').should('be.visible')
      cy.get('[data-testid="progress-bar"]').should('be.visible')
      
      // Simulate receiving bulk update from another user
      cy.window().then((win) => {
        const mockWs = (win as any).collaborationWebSocket
        if (mockWs) {
          mockWs.simulateMessage({
            type: 'bulk_update',
            data: {
              operation: 'move_lessons',
              lessonIds: ['lesson-2', 'lesson-3'],
              changes: { day: 'Wednesday' },
              updatedBy: 'user-2',
              userName: 'Collaborator',
              timestamp: new Date().toISOString()
            }
          })
        }
      })
      
      // Should handle concurrent bulk operations
      cy.get('[data-testid="bulk-conflict-notification"]')
        .should('be.visible')
        .should('contain.text', 'bulk operation conflict')
      
      cy.get('[data-testid="resolve-bulk-conflict"]').click()
      cy.get('[data-testid="conflict-resolution-modal"]').should('be.visible')
    })
  })

  describe('Conflict Detection and Resolution', () => {
    beforeEach(() => {
      // Set up a schedule with potential conflicts
      cy.get('[data-testid="create-new-schedule"]').click()
      cy.get('[data-testid="schedule-name"]').type('Conflict Test Schedule')
      cy.get('[data-testid="save-schedule"]').click()
      
      cy.get('[data-testid="add-lesson"]').click()
      cy.get('[data-testid="lesson-subject"]').select('Mathematics')
      cy.get('[data-testid="lesson-teacher"]').select('teacher1')
      cy.get('[data-testid="lesson-time"]').select('09:00')
      cy.get('[data-testid="lesson-day"]').select('Monday')
      cy.get('[data-testid="save-lesson"]').click()
    })

    it('should detect and display schedule conflicts', () => {
      // Start editing a lesson
      cy.get('[data-testid="lesson-card"]').first().click()
      cy.get('[data-testid="edit-lesson"]').click()
      cy.get('[data-testid="lesson-time"]').select('10:00')
      
      // Simulate another user making a conflicting change
      cy.window().then((win) => {
        const mockWs = (win as any).collaborationWebSocket
        if (mockWs) {
          mockWs.simulateMessage({
            type: 'conflict_detected',
            data: {
              conflictId: 'conflict-1',
              lessonId: 'lesson-1',
              conflictingVersions: [
                {
                  userId: 'current-user',
                  changes: { time: '10:00' },
                  timestamp: new Date().toISOString(),
                  version: 2
                },
                {
                  userId: 'user-2',
                  userName: 'Collaborator',
                  changes: { time: '11:00', classroom: 'Room 301' },
                  timestamp: new Date(Date.now() + 1000).toISOString(),
                  version: 3
                }
              ],
              timestamp: new Date().toISOString()
            }
          })
        }
      })
      
      // Should show conflict notification
      cy.get('[data-testid="conflict-detected"]', { timeout: COLLAB_TEST_CONFIG.conflictResolutionTimeout })
        .should('be.visible')
      
      cy.get('[data-testid="conflict-message"]')
        .should('contain.text', 'Collaborator')
        .should('contain.text', 'same lesson')
      
      // Should show conflict details
      cy.get('[data-testid="conflict-details"]').click()
      cy.get('[data-testid="conflict-comparison"]').should('be.visible')
      
      // Should show both versions
      cy.get('[data-testid="your-version"]')
        .should('contain.text', '10:00')
      
      cy.get('[data-testid="their-version"]')
        .should('contain.text', '11:00')
        .should('contain.text', 'Room 301')
      
      // Should show resolution options
      cy.get('[data-testid="resolution-options"]').should('be.visible')
      cy.get('[data-testid="accept-their-changes"]').should('be.visible')
      cy.get('[data-testid="keep-your-changes"]').should('be.visible')
      cy.get('[data-testid="merge-changes"]').should('be.visible')
    })

    it('should handle manual conflict resolution', () => {
      // Trigger a conflict scenario
      cy.window().then((win) => {
        const mockWs = (win as any).collaborationWebSocket
        if (mockWs) {
          mockWs.simulateMessage({
            type: 'conflict_detected',
            data: {
              conflictId: 'conflict-manual',
              lessonId: 'lesson-1',
              conflictingVersions: [
                {
                  userId: 'current-user',
                  changes: { teacher: 'teacher1', time: '09:00' },
                  timestamp: new Date().toISOString(),
                  version: 1
                },
                {
                  userId: 'user-2',
                  userName: 'Collaborator',
                  changes: { teacher: 'teacher2', classroom: 'Room 205' },
                  timestamp: new Date(Date.now() + 500).toISOString(),
                  version: 2
                }
              ],
              timestamp: new Date().toISOString()
            }
          })
        }
      })
      
      cy.get('[data-testid="conflict-detected"]').should('be.visible')
      
      // Choose manual merge
      cy.get('[data-testid="merge-changes"]').click()
      cy.get('[data-testid="merge-editor"]').should('be.visible')
      
      // Should show field-by-field resolution
      cy.get('[data-testid="field-teacher"]').within(() => {
        cy.get('[data-testid="your-value"]').should('contain.text', 'teacher1')
        cy.get('[data-testid="their-value"]').should('contain.text', 'teacher2')
        cy.get('[data-testid="select-their"]').click()
      })
      
      cy.get('[data-testid="field-classroom"]').within(() => {
        cy.get('[data-testid="your-value"]').should('be.empty')
        cy.get('[data-testid="their-value"]').should('contain.text', 'Room 205')
        cy.get('[data-testid="select-their"]').click()
      })
      
      // Finalize merge
      cy.get('[data-testid="apply-merge"]').click()
      
      // Should show success notification
      cy.get('[data-testid="conflict-resolved-notification"]')
        .should('be.visible')
        .should('contain.text', 'successfully merged')
      
      // Should update the lesson with merged changes
      cy.get('[data-testid="lesson-card"]')
        .should('contain.text', 'teacher2')
        .should('contain.text', 'Room 205')
    })

    it('should support automatic conflict resolution strategies', () => {
      // Enable automatic resolution
      cy.get('[data-testid="collaboration-settings"]').click()
      cy.get('[data-testid="auto-resolution"]').check()
      cy.get('[data-testid="resolution-strategy"]').select('latest-wins')
      cy.get('[data-testid="save-settings"]').click()
      
      // Trigger a conflict that should be auto-resolved
      cy.window().then((win) => {
        const mockWs = (win as any).collaborationWebSocket
        if (mockWs) {
          mockWs.simulateMessage({
            type: 'conflict_detected',
            data: {
              conflictId: 'conflict-auto',
              lessonId: 'lesson-1',
              conflictingVersions: [
                {
                  userId: 'current-user',
                  changes: { time: '09:00' },
                  timestamp: new Date(Date.now() - 1000).toISOString(),
                  version: 1
                },
                {
                  userId: 'user-2',
                  userName: 'Collaborator',
                  changes: { time: '10:00' },
                  timestamp: new Date().toISOString(),
                  version: 2
                }
              ],
              timestamp: new Date().toISOString(),
              autoResolvable: true
            }
          })
        }
      })
      
      // Should auto-resolve without user intervention
      cy.get('[data-testid="auto-resolution-notification"]', { timeout: 2000 })
        .should('be.visible')
        .should('contain.text', 'automatically resolved')
      
      // Should apply the latest change
      cy.get('[data-testid="lesson-card"]')
        .should('contain.text', '10:00')
      
      // Should show resolution history
      cy.get('[data-testid="resolution-history"]').click()
      cy.get('[data-testid="resolution-entry"]')
        .should('contain.text', 'latest-wins')
        .should('contain.text', 'conflict-auto')
    })
  })

  describe('State Synchronization and Recovery', () => {
    it('should synchronize complete schedule state on reconnection', () => {
      // Set up initial state
      cy.get('[data-testid="create-new-schedule"]').click()
      cy.get('[data-testid="schedule-name"]').type('Sync Test Schedule')
      cy.get('[data-testid="save-schedule"]').click()
      
      // Add some lessons
      const lessons = [
        { subject: 'Math', teacher: 'teacher1', time: '09:00', day: 'Monday' },
        { subject: 'Physics', teacher: 'teacher2', time: '10:00', day: 'Monday' }
      ]
      
      lessons.forEach((lesson) => {
        cy.get('[data-testid="add-lesson"]').click()
        cy.get('[data-testid="lesson-subject"]').select(lesson.subject)
        cy.get('[data-testid="lesson-teacher"]').select(lesson.teacher)
        cy.get('[data-testid="lesson-time"]').select(lesson.time)
        cy.get('[data-testid="lesson-day"]').select(lesson.day)
        cy.get('[data-testid="save-lesson"]').click()
      })
      
      // Simulate disconnection
      cy.window().then((win) => {
        const mockWs = (win as any).collaborationWebSocket
        if (mockWs) {
          mockWs.close()
        }
      })
      
      cy.get('[data-testid="collaboration-status"]').should('contain.text', 'Disconnected')
      
      // Simulate changes while disconnected (from other users)
      const missedChanges = [
        {
          type: 'lesson_added',
          data: {
            lesson: {
              id: 'lesson-offline-1',
              subject: 'Chemistry',
              teacher: 'teacher3',
              time: '11:00',
              day: 'Monday'
            },
            addedBy: 'user-2',
            timestamp: new Date().toISOString()
          }
        },
        {
          type: 'lesson_updated',
          data: {
            lessonId: 'lesson-1',
            changes: { classroom: 'Room 101' },
            updatedBy: 'user-3',
            timestamp: new Date().toISOString()
          }
        }
      ]
      
      // Reconnect and sync
      cy.window().then((win) => {
        const newWs = new MockWebSocket('ws://localhost:8080/collaboration')
        ;(win as any).collaborationWebSocket = newWs
        
        // Simulate receiving sync data
        setTimeout(() => {
          newWs.simulateMessage({
            type: 'sync_complete',
            data: {
              schedule: {
                id: 'sync-test-schedule',
                lessons: [
                  { id: 'lesson-1', subject: 'Math', teacher: 'teacher1', time: '09:00', day: 'Monday', classroom: 'Room 101' },
                  { id: 'lesson-2', subject: 'Physics', teacher: 'teacher2', time: '10:00', day: 'Monday' },
                  { id: 'lesson-offline-1', subject: 'Chemistry', teacher: 'teacher3', time: '11:00', day: 'Monday' }
                ]
              },
              missedEvents: missedChanges,
              serverVersion: 5
            }
          })
        }, 100)
      })
      
      // Should show sync in progress
      cy.get('[data-testid="synchronizing"]', { timeout: 2000 }).should('be.visible')
      
      // Should update UI with synced state
      cy.get('[data-testid="sync-complete"]', { timeout: 3000 }).should('be.visible')
      
      // Verify synced changes
      cy.get('[data-testid="lesson-card"]').should('have.length', 3)
      cy.get('[data-testid="lesson-card"]').contains('Chemistry').should('be.visible')
      cy.get('[data-testid="lesson-card"]').contains('Room 101').should('be.visible')
      
      // Should show sync notification with missed events
      cy.get('[data-testid="missed-events-notification"]')
        .should('be.visible')
        .should('contain.text', '2 changes')
    })

    it('should handle state conflicts during synchronization', () => {
      // Set up conflicting local changes
      cy.get('[data-testid="create-new-schedule"]').click()
      cy.get('[data-testid="schedule-name"]').type('Conflict Sync Schedule')
      cy.get('[data-testid="save-schedule"]').click()
      
      // Make local changes while "disconnected"
      cy.get('[data-testid="add-lesson"]').click()
      cy.get('[data-testid="lesson-subject"]').select('Mathematics')
      cy.get('[data-testid="lesson-teacher"]').select('teacher1')
      cy.get('[data-testid="lesson-time"]').select('09:00')
      cy.get('[data-testid="lesson-day"]').select('Monday')
      cy.get('[data-testid="save-lesson"]').click()
      
      // Simulate sync with conflicting server state
      cy.window().then((win) => {
        const mockWs = (win as any).collaborationWebSocket
        if (mockWs) {
          mockWs.simulateMessage({
            type: 'sync_conflict',
            data: {
              conflicts: [
                {
                  type: 'lesson_conflict',
                  localVersion: {
                    id: 'lesson-1',
                    subject: 'Mathematics',
                    teacher: 'teacher1',
                    time: '09:00',
                    day: 'Monday'
                  },
                  serverVersion: {
                    id: 'lesson-1',
                    subject: 'Mathematics',
                    teacher: 'teacher2',
                    time: '09:00',
                    day: 'Monday',
                    classroom: 'Room 203'
                  }
                }
              ],
              resolutionRequired: true
            }
          })
        }
      })
      
      // Should show sync conflict resolution interface
      cy.get('[data-testid="sync-conflict-modal"]').should('be.visible')
      cy.get('[data-testid="conflict-count"]').should('contain.text', '1')
      
      // Should offer resolution options
      cy.get('[data-testid="accept-server-version"]').should('be.visible')
      cy.get('[data-testid="keep-local-version"]').should('be.visible')
      cy.get('[data-testid="merge-versions"]').should('be.visible')
      
      // Choose to merge
      cy.get('[data-testid="merge-versions"]').click()
      cy.get('[data-testid="merge-interface"]').should('be.visible')
      
      // Resolve field conflicts
      cy.get('[data-testid="field-teacher"]').within(() => {
        cy.get('[data-testid="keep-local"]').click() // Keep teacher1
      })
      
      cy.get('[data-testid="field-classroom"]').within(() => {
        cy.get('[data-testid="use-server"]').click() // Use Room 203
      })
      
      cy.get('[data-testid="apply-merge"]').click()
      
      // Should complete sync with merged state
      cy.get('[data-testid="sync-resolved"]').should('be.visible')
      cy.get('[data-testid="lesson-card"]')
        .should('contain.text', 'teacher1')
        .should('contain.text', 'Room 203')
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle high-frequency updates efficiently', () => {
      // Set up performance monitoring
      cy.window().then((win) => {
        ;(win as any).performanceMetrics = {
          messageCount: 0,
          processingTimes: [],
          maxMemoryUsage: 0
        }
      })
      
      // Simulate rapid updates
      const updateCount = 50
      const startTime = Date.now()
      
      for (let i = 0; i < updateCount; i++) {
        cy.window().then((win) => {
          const mockWs = (win as any).collaborationWebSocket
          if (mockWs) {
            const messageStart = performance.now()
            
            mockWs.simulateMessage({
              type: 'lesson_updated',
              data: {
                lessonId: 'lesson-1',
                changes: { classroom: `Room ${100 + i}` },
                updatedBy: 'user-2',
                timestamp: new Date().toISOString(),
                version: i + 1
              }
            })
            
            // Track performance
            const messageEnd = performance.now()
            const metrics = (win as any).performanceMetrics
            metrics.messageCount++
            metrics.processingTimes.push(messageEnd - messageStart)
            
            if ('memory' in win.performance) {
              const memory = (win.performance as any).memory
              metrics.maxMemoryUsage = Math.max(metrics.maxMemoryUsage, memory.usedJSHeapSize)
            }
          }
        })
      }
      
      const endTime = Date.now()
      const totalTime = endTime - startTime
      
      // Verify performance metrics
      cy.window().then((win) => {
        const metrics = (win as any).performanceMetrics
        
        expect(metrics.messageCount).to.equal(updateCount)
        expect(totalTime).to.be.lessThan(5000) // Should process 50 updates in under 5 seconds
        
        const avgProcessingTime = metrics.processingTimes.reduce((sum: number, time: number) => sum + time, 0) / metrics.processingTimes.length
        expect(avgProcessingTime).to.be.lessThan(50) // Each message should process in under 50ms
        
        // Memory usage should be reasonable
        expect(metrics.maxMemoryUsage).to.be.lessThan(100 * 1024 * 1024) // Under 100MB
      })
      
      // UI should remain responsive
      cy.get('[data-testid="lesson-card"]')
        .should('contain.text', `Room ${100 + updateCount - 1}`) // Should show latest update
      
      // Test UI responsiveness during updates
      cy.get('[data-testid="add-lesson"]').click()
      cy.get('[data-testid="lesson-form"]').should('be.visible') // Should still be responsive
    })

    it('should manage memory usage with long collaboration sessions', () => {
      // Simulate a long session with many events
      const eventCount = 200
      const eventTypes = ['lesson_updated', 'user_joined', 'user_left', 'cursor_moved']
      
      // Track initial memory
      cy.window().then((win) => {
        if ('memory' in win.performance) {
          ;(win as any).initialMemory = (win.performance as any).memory.usedJSHeapSize
        }
      })
      
      // Generate many events
      for (let i = 0; i < eventCount; i++) {
        cy.window().then((win) => {
          const mockWs = (win as any).collaborationWebSocket
          if (mockWs) {
            const eventType = eventTypes[i % eventTypes.length]
            
            mockWs.simulateMessage({
              type: eventType,
              data: {
                id: `event-${i}`,
                timestamp: new Date().toISOString(),
                userId: `user-${i % 5}`,
                // Event-specific data
                ...(eventType === 'lesson_updated' && {
                  lessonId: 'lesson-1',
                  changes: { note: `Update ${i}` }
                }),
                ...(eventType === 'cursor_moved' && {
                  position: { x: i % 100, y: i % 50 }
                })
              }
            })
          }
        })
      }
      
      // Wait for all events to be processed
      cy.wait(2000)
      
      // Check memory usage
      cy.window().then((win) => {
        if ('memory' in win.performance && (win as any).initialMemory) {
          const currentMemory = (win.performance as any).memory.usedJSHeapSize
          const memoryIncrease = currentMemory - (win as any).initialMemory
          
          // Memory increase should be reasonable for the number of events
          expect(memoryIncrease).to.be.lessThan(50 * 1024 * 1024) // Less than 50MB increase
        }
      })
      
      // Check that old events are being cleaned up
      cy.window().then((win) => {
        const collaborationState = (win as any).collaborationState
        if (collaborationState && collaborationState.eventHistory) {
          // Should not keep all events in memory indefinitely
          expect(collaborationState.eventHistory.length).to.be.lessThan(100)
        }
      })
    })
  })
})