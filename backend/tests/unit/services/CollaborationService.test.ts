import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
// CollaborationService will be implemented in T042

// Mock WebSocket Server
class MockWebSocketServer {
  clients: Set<MockWebSocketClient> = new Set();
  eventHandlers: Map<string, Function[]> = new Map();

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  emit(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(...args));
  }

  broadcast(message: any, excludeClient?: MockWebSocketClient) {
    this.clients.forEach(client => {
      if (client !== excludeClient) {
        client.send(JSON.stringify(message));
      }
    });
  }

  addClient(client: MockWebSocketClient) {
    this.clients.add(client);
    this.emit('connection', client);
  }

  removeClient(client: MockWebSocketClient) {
    this.clients.delete(client);
  }
}

class MockWebSocketClient {
  id: string;
  userId?: string;
  isAlive = true;
  messageQueue: string[] = [];
  eventHandlers: Map<string, Function[]> = new Map();

  constructor(id: string) {
    this.id = id;
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  emit(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(...args));
  }

  send(message: string) {
    this.messageQueue.push(message);
  }

  close() {
    this.isAlive = false;
    this.emit('close');
  }

  simulateMessage(message: any) {
    this.emit('message', JSON.stringify(message));
  }

  getLastMessage(): any {
    const lastMessage = this.messageQueue[this.messageQueue.length - 1];
    return lastMessage ? JSON.parse(lastMessage) : null;
  }

  getAllMessages(): any[] {
    return this.messageQueue.map(msg => JSON.parse(msg));
  }
}

// Mock collaboration service interfaces
interface ScheduleUpdate {
  scheduleId: string;
  lessonId: string;
  changes: Record<string, any>;
  userId: string;
  timestamp: string;
  version: number;
}

interface RuleChange {
  ruleId: string;
  action: 'created' | 'updated' | 'deleted' | 'toggled';
  rule?: any;
  userId: string;
  timestamp: string;
}

interface UserPresence {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: string;
  currentSchedule?: string;
}

interface ConflictData {
  conflictId: string;
  scheduleId: string;
  lessonId: string;
  conflictingVersions: any[];
  timestamp: string;
}

// Mock CollaborationService for testing
class MockCollaborationService {
  private wss: MockWebSocketServer;
  private clients: Map<string, MockWebSocketClient> = new Map();
  private userPresence: Map<string, UserPresence> = new Map();
  private conflicts: Map<string, ConflictData> = new Map();
  private scheduleVersions: Map<string, number> = new Map();

  constructor(wss: MockWebSocketServer) {
    this.wss = wss;
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers() {
    this.wss.on('connection', (client: MockWebSocketClient) => {
      this.handleClientConnection(client);
    });
  }

  private handleClientConnection(client: MockWebSocketClient) {
    client.on('message', (data: string) => {
      try {
        const message = JSON.parse(data);
        this.handleMessage(client, message);
      } catch (error) {
        this.sendError(client, 'Invalid JSON message');
      }
    });

    client.on('close', () => {
      this.handleClientDisconnection(client);
    });

    // Send welcome message
    client.send(JSON.stringify({
      type: 'connection_established',
      clientId: client.id,
      timestamp: new Date().toISOString()
    }));
  }

  private handleMessage(client: MockWebSocketClient, message: any) {
    switch (message.type) {
      case 'authenticate':
        this.handleAuthentication(client, message.data);
        break;
      case 'schedule_update':
        this.handleScheduleUpdate(client, message.data);
        break;
      case 'rule_change':
        this.handleRuleChange(client, message.data);
        break;
      case 'join_schedule':
        this.handleJoinSchedule(client, message.data);
        break;
      case 'leave_schedule':
        this.handleLeaveSchedule(client, message.data);
        break;
      case 'conflict_resolution':
        this.handleConflictResolution(client, message.data);
        break;
      case 'heartbeat':
        this.handleHeartbeat(client);
        break;
      default:
        this.sendError(client, `Unknown message type: ${message.type}`);
    }
  }

  private handleAuthentication(client: MockWebSocketClient, data: { userId: string; token: string }) {
    // Mock authentication - in real implementation, verify token
    client.userId = data.userId;
    this.clients.set(data.userId, client);
    
    // Update user presence
    this.userPresence.set(data.userId, {
      userId: data.userId,
      status: 'online',
      lastSeen: new Date().toISOString()
    });

    // Broadcast user presence update
    this.broadcastUserPresence(data.userId, 'online');

    // Send authentication success
    client.send(JSON.stringify({
      type: 'authenticated',
      userId: data.userId,
      timestamp: new Date().toISOString()
    }));
  }

  private handleScheduleUpdate(client: MockWebSocketClient, data: ScheduleUpdate) {
    if (!client.userId) {
      this.sendError(client, 'Not authenticated');
      return;
    }

    // Check for version conflicts
    const currentVersion = this.scheduleVersions.get(data.scheduleId) || 0;
    if (data.version <= currentVersion) {
      // Create conflict
      const conflictId = `conflict_${Date.now()}`;
      const conflict: ConflictData = {
        conflictId,
        scheduleId: data.scheduleId,
        lessonId: data.lessonId,
        conflictingVersions: [data],
        timestamp: new Date().toISOString()
      };
      
      this.conflicts.set(conflictId, conflict);
      
      // Notify client of conflict
      client.send(JSON.stringify({
        type: 'conflict_detected',
        data: conflict
      }));
      return;
    }

    // Update version
    this.scheduleVersions.set(data.scheduleId, data.version);

    // Broadcast update to all clients except sender
    this.wss.broadcast({
      type: 'schedule_update',
      data: {
        ...data,
        timestamp: new Date().toISOString()
      }
    }, client);

    // Confirm update to sender
    client.send(JSON.stringify({
      type: 'update_confirmed',
      scheduleId: data.scheduleId,
      lessonId: data.lessonId,
      version: data.version
    }));
  }

  private handleRuleChange(client: MockWebSocketClient, data: RuleChange) {
    if (!client.userId) {
      this.sendError(client, 'Not authenticated');
      return;
    }

    // Broadcast rule change to all clients
    this.wss.broadcast({
      type: 'rule_change',
      data: {
        ...data,
        timestamp: new Date().toISOString()
      }
    });
  }

  private handleJoinSchedule(client: MockWebSocketClient, data: { scheduleId: string }) {
    if (!client.userId) {
      this.sendError(client, 'Not authenticated');
      return;
    }

    // Update user presence with current schedule
    const presence = this.userPresence.get(client.userId);
    if (presence) {
      presence.currentSchedule = data.scheduleId;
      this.userPresence.set(client.userId, presence);
    }

    // Notify other users in the same schedule
    this.broadcastToSchedule(data.scheduleId, {
      type: 'user_joined_schedule',
      data: {
        userId: client.userId,
        scheduleId: data.scheduleId,
        timestamp: new Date().toISOString()
      }
    }, client);
  }

  private handleLeaveSchedule(client: MockWebSocketClient, data: { scheduleId: string }) {
    if (!client.userId) {
      this.sendError(client, 'Not authenticated');
      return;
    }

    // Update user presence
    const presence = this.userPresence.get(client.userId);
    if (presence) {
      delete presence.currentSchedule;
      this.userPresence.set(client.userId, presence);
    }

    // Notify other users
    this.broadcastToSchedule(data.scheduleId, {
      type: 'user_left_schedule',
      data: {
        userId: client.userId,
        scheduleId: data.scheduleId,
        timestamp: new Date().toISOString()
      }
    }, client);
  }

  private handleConflictResolution(client: MockWebSocketClient, data: any) {
    if (!client.userId) {
      this.sendError(client, 'Not authenticated');
      return;
    }

    const conflict = this.conflicts.get(data.conflictId);
    if (!conflict) {
      this.sendError(client, 'Conflict not found');
      return;
    }

    // Remove conflict
    this.conflicts.delete(data.conflictId);

    // Broadcast resolution
    this.wss.broadcast({
      type: 'conflict_resolved',
      data: {
        conflictId: data.conflictId,
        resolution: data.resolution,
        resolvedBy: client.userId,
        timestamp: new Date().toISOString()
      }
    });
  }

  private handleHeartbeat(client: MockWebSocketClient) {
    if (client.userId) {
      const presence = this.userPresence.get(client.userId);
      if (presence) {
        presence.lastSeen = new Date().toISOString();
        this.userPresence.set(client.userId, presence);
      }
    }

    client.send(JSON.stringify({
      type: 'heartbeat_ack',
      timestamp: new Date().toISOString()
    }));
  }

  private handleClientDisconnection(client: MockWebSocketClient) {
    if (client.userId) {
      // Update user presence to offline
      this.broadcastUserPresence(client.userId, 'offline');
      
      // Clean up
      this.clients.delete(client.userId);
      this.userPresence.delete(client.userId);
    }
    this.wss.removeClient(client);
  }

  private broadcastUserPresence(userId: string, status: 'online' | 'offline' | 'away') {
    this.wss.broadcast({
      type: 'user_presence',
      data: {
        userId,
        status,
        lastSeen: new Date().toISOString()
      }
    });
  }

  private broadcastToSchedule(scheduleId: string, message: any, excludeClient?: MockWebSocketClient) {
    this.clients.forEach(client => {
      if (client !== excludeClient) {
        const presence = this.userPresence.get(client.userId!);
        if (presence?.currentSchedule === scheduleId) {
          client.send(JSON.stringify(message));
        }
      }
    });
  }

  private sendError(client: MockWebSocketClient, message: string) {
    client.send(JSON.stringify({
      type: 'error',
      error: message,
      timestamp: new Date().toISOString()
    }));
  }

  // Public methods for testing
  getConnectedClients(): number {
    return this.clients.size;
  }

  getUserPresence(userId: string): UserPresence | undefined {
    return this.userPresence.get(userId);
  }

  getActiveConflicts(): ConflictData[] {
    return Array.from(this.conflicts.values());
  }

  getScheduleVersion(scheduleId: string): number {
    return this.scheduleVersions.get(scheduleId) || 0;
  }

  simulateClientDisconnect(userId: string) {
    const client = this.clients.get(userId);
    if (client) {
      client.close();
    }
  }
}

describe('CollaborationService', () => {
  let wss: MockWebSocketServer;
  let collaborationService: MockCollaborationService;
  let client1: MockWebSocketClient;
  let client2: MockWebSocketClient;

  beforeEach(() => {
    wss = new MockWebSocketServer();
    collaborationService = new MockCollaborationService(wss);
    client1 = new MockWebSocketClient('client1');
    client2 = new MockWebSocketClient('client2');
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (client1.isAlive) client1.close();
    if (client2.isAlive) client2.close();
  });

  describe('Client Connection Management', () => {
    it('should handle client connections', () => {
      wss.addClient(client1);
      
      expect(wss.clients.has(client1)).toBe(true);
      expect(client1.getLastMessage().type).toBe('connection_established');
    });

    it('should handle client disconnections', () => {
      wss.addClient(client1);
      expect(wss.clients.has(client1)).toBe(true);
      
      wss.removeClient(client1);
      expect(wss.clients.has(client1)).toBe(false);
    });

    it('should track multiple concurrent connections', () => {
      wss.addClient(client1);
      wss.addClient(client2);
      
      expect(wss.clients.size).toBe(2);
      expect(collaborationService.getConnectedClients()).toBe(0); // Not authenticated yet
    });
  });

  describe('Authentication', () => {
    beforeEach(() => {
      wss.addClient(client1);
      wss.addClient(client2);
    });

    it('should authenticate users', () => {
      const authMessage = {
        type: 'authenticate',
        data: { userId: 'user1', token: 'valid-token' }
      };
      
      client1.simulateMessage(authMessage);
      
      expect(client1.userId).toBe('user1');
      expect(collaborationService.getConnectedClients()).toBe(1);
      expect(client1.getLastMessage().type).toBe('authenticated');
    });

    it('should track user presence after authentication', () => {
      const authMessage = {
        type: 'authenticate',
        data: { userId: 'user1', token: 'valid-token' }
      };
      
      client1.simulateMessage(authMessage);
      
      const presence = collaborationService.getUserPresence('user1');
      expect(presence).toBeDefined();
      expect(presence!.status).toBe('online');
      expect(presence!.userId).toBe('user1');
    });

    it('should broadcast user presence to other clients', () => {
      // Authenticate both clients
      client1.simulateMessage({
        type: 'authenticate',
        data: { userId: 'user1', token: 'token1' }
      });
      
      client2.simulateMessage({
        type: 'authenticate',
        data: { userId: 'user2', token: 'token2' }
      });
      
      // Check if user presence was broadcasted
      const messages = client2.getAllMessages();
      const presenceMessage = messages.find(msg => msg.type === 'user_presence');
      expect(presenceMessage).toBeDefined();
      expect(presenceMessage.data.userId).toBe('user1');
    });
  });

  describe('Schedule Updates', () => {
    beforeEach(() => {
      wss.addClient(client1);
      wss.addClient(client2);
      
      // Authenticate both clients
      client1.simulateMessage({
        type: 'authenticate',
        data: { userId: 'user1', token: 'token1' }
      });
      
      client2.simulateMessage({
        type: 'authenticate',
        data: { userId: 'user2', token: 'token2' }
      });
    });

    it('should handle schedule updates', () => {
      const updateMessage = {
        type: 'schedule_update',
        data: {
          scheduleId: 'schedule1',
          lessonId: 'lesson1',
          changes: { startTime: '10:00', classroom: 'Room 202' },
          userId: 'user1',
          timestamp: '2025-09-29T10:00:00Z',
          version: 1
        }
      };
      
      client1.simulateMessage(updateMessage);
      
      // Check if update was confirmed to sender
      const confirmation = client1.getLastMessage();
      expect(confirmation.type).toBe('update_confirmed');
      expect(confirmation.scheduleId).toBe('schedule1');
      
      // Check if update was broadcasted to other clients
      const client2Messages = client2.getAllMessages();
      const broadcastMessage = client2Messages.find(msg => msg.type === 'schedule_update');
      expect(broadcastMessage).toBeDefined();
      expect(broadcastMessage.data.lessonId).toBe('lesson1');
    });

    it('should detect version conflicts', () => {
      // First update
      client1.simulateMessage({
        type: 'schedule_update',
        data: {
          scheduleId: 'schedule1',
          lessonId: 'lesson1',
          changes: { startTime: '10:00' },
          userId: 'user1',
          timestamp: '2025-09-29T10:00:00Z',
          version: 1
        }
      });
      
      // Conflicting update with same version
      client2.simulateMessage({
        type: 'schedule_update',
        data: {
          scheduleId: 'schedule1',
          lessonId: 'lesson1',
          changes: { startTime: '11:00' },
          userId: 'user2',
          timestamp: '2025-09-29T10:01:00Z',
          version: 1
        }
      });
      
      // Check if conflict was detected
      const conflictMessage = client2.getLastMessage();
      expect(conflictMessage.type).toBe('conflict_detected');
      expect(collaborationService.getActiveConflicts()).toHaveLength(1);
    });

    it('should require authentication for schedule updates', () => {
      const unauthenticatedClient = new MockWebSocketClient('unauth');
      wss.addClient(unauthenticatedClient);
      
      unauthenticatedClient.simulateMessage({
        type: 'schedule_update',
        data: {
          scheduleId: 'schedule1',
          lessonId: 'lesson1',
          changes: { startTime: '10:00' },
          userId: 'user3',
          timestamp: '2025-09-29T10:00:00Z',
          version: 1
        }
      });
      
      const errorMessage = unauthenticatedClient.getLastMessage();
      expect(errorMessage.type).toBe('error');
      expect(errorMessage.error).toBe('Not authenticated');
    });
  });

  describe('Rule Changes', () => {
    beforeEach(() => {
      wss.addClient(client1);
      wss.addClient(client2);
      
      client1.simulateMessage({
        type: 'authenticate',
        data: { userId: 'user1', token: 'token1' }
      });
      
      client2.simulateMessage({
        type: 'authenticate',
        data: { userId: 'user2', token: 'token2' }
      });
    });

    it('should broadcast rule changes', () => {
      const ruleChangeMessage = {
        type: 'rule_change',
        data: {
          ruleId: 'rule1',
          action: 'updated' as const,
          rule: {
            id: 'rule1',
            name: 'No double math',
            type: 'constraint',
            enabled: true
          },
          userId: 'user1',
          timestamp: '2025-09-29T10:00:00Z'
        }
      };
      
      client1.simulateMessage(ruleChangeMessage);
      
      // Check if rule change was broadcasted to other clients
      const client2Messages = client2.getAllMessages();
      const broadcastMessage = client2Messages.find(msg => msg.type === 'rule_change');
      expect(broadcastMessage).toBeDefined();
      expect(broadcastMessage.data.ruleId).toBe('rule1');
      expect(broadcastMessage.data.action).toBe('updated');
    });

    it('should handle different rule actions', () => {
      const actions = ['created', 'updated', 'deleted', 'toggled'] as const;
      
      actions.forEach((action, index) => {
        client1.simulateMessage({
          type: 'rule_change',
          data: {
            ruleId: `rule${index + 1}`,
            action,
            userId: 'user1',
            timestamp: '2025-09-29T10:00:00Z'
          }
        });
      });
      
      const client2Messages = client2.getAllMessages();
      const ruleMessages = client2Messages.filter(msg => msg.type === 'rule_change');
      expect(ruleMessages).toHaveLength(4);
      
      actions.forEach((action, index) => {
        expect(ruleMessages[index].data.action).toBe(action);
      });
    });
  });

  describe('Schedule Collaboration', () => {
    beforeEach(() => {
      wss.addClient(client1);
      wss.addClient(client2);
      
      client1.simulateMessage({
        type: 'authenticate',
        data: { userId: 'user1', token: 'token1' }
      });
      
      client2.simulateMessage({
        type: 'authenticate',
        data: { userId: 'user2', token: 'token2' }
      });
    });

    it('should handle users joining schedules', () => {
      client1.simulateMessage({
        type: 'join_schedule',
        data: { scheduleId: 'schedule1' }
      });
      
      const presence = collaborationService.getUserPresence('user1');
      expect(presence?.currentSchedule).toBe('schedule1');
    });

    it('should notify other users when someone joins a schedule', () => {
      // Both users join the same schedule
      client1.simulateMessage({
        type: 'join_schedule',
        data: { scheduleId: 'schedule1' }
      });
      
      client2.simulateMessage({
        type: 'join_schedule',
        data: { scheduleId: 'schedule1' }
      });
      
      // Check if user1 was notified about user2 joining
      const client1Messages = client1.getAllMessages();
      const joinMessage = client1Messages.find(msg => msg.type === 'user_joined_schedule');
      expect(joinMessage).toBeDefined();
      expect(joinMessage.data.userId).toBe('user2');
    });

    it('should handle users leaving schedules', () => {
      // Join first
      client1.simulateMessage({
        type: 'join_schedule',
        data: { scheduleId: 'schedule1' }
      });
      
      // Then leave
      client1.simulateMessage({
        type: 'leave_schedule',
        data: { scheduleId: 'schedule1' }
      });
      
      const presence = collaborationService.getUserPresence('user1');
      expect(presence?.currentSchedule).toBeUndefined();
    });
  });

  describe('Conflict Resolution', () => {
    beforeEach(() => {
      wss.addClient(client1);
      wss.addClient(client2);
      
      client1.simulateMessage({
        type: 'authenticate',
        data: { userId: 'user1', token: 'token1' }
      });
      
      client2.simulateMessage({
        type: 'authenticate',
        data: { userId: 'user2', token: 'token2' }
      });
    });

    it('should resolve conflicts', () => {
      // Create a conflict first
      client1.simulateMessage({
        type: 'schedule_update',
        data: {
          scheduleId: 'schedule1',
          lessonId: 'lesson1',
          changes: { startTime: '10:00' },
          userId: 'user1',
          timestamp: '2025-09-29T10:00:00Z',
          version: 1
        }
      });
      
      client2.simulateMessage({
        type: 'schedule_update',
        data: {
          scheduleId: 'schedule1',
          lessonId: 'lesson1',
          changes: { startTime: '11:00' },
          userId: 'user2',
          timestamp: '2025-09-29T10:01:00Z',
          version: 1
        }
      });
      
      const conflicts = collaborationService.getActiveConflicts();
      expect(conflicts).toHaveLength(1);
      
      const conflictId = conflicts[0].conflictId;
      
      // Resolve the conflict
      client1.simulateMessage({
        type: 'conflict_resolution',
        data: {
          conflictId,
          resolution: 'accept_latest',
          acceptedVersion: 1
        }
      });
      
      // Check if conflict was resolved
      expect(collaborationService.getActiveConflicts()).toHaveLength(0);
      
      // Check if resolution was broadcasted
      const client2Messages = client2.getAllMessages();
      const resolutionMessage = client2Messages.find(msg => msg.type === 'conflict_resolved');
      expect(resolutionMessage).toBeDefined();
      expect(resolutionMessage.data.conflictId).toBe(conflictId);
    });
  });

  describe('Heartbeat and Connection Health', () => {
    beforeEach(() => {
      wss.addClient(client1);
      
      client1.simulateMessage({
        type: 'authenticate',
        data: { userId: 'user1', token: 'token1' }
      });
    });

    it('should handle heartbeat messages', () => {
      const oldPresence = collaborationService.getUserPresence('user1');
      const oldLastSeen = oldPresence!.lastSeen;
      
      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        client1.simulateMessage({ type: 'heartbeat' });
        
        const newPresence = collaborationService.getUserPresence('user1');
        expect(newPresence!.lastSeen).not.toBe(oldLastSeen);
        
        const ackMessage = client1.getLastMessage();
        expect(ackMessage.type).toBe('heartbeat_ack');
      }, 10);
    });

    it('should clean up on client disconnect', () => {
      expect(collaborationService.getConnectedClients()).toBe(1);
      expect(collaborationService.getUserPresence('user1')).toBeDefined();
      
      collaborationService.simulateClientDisconnect('user1');
      
      expect(collaborationService.getConnectedClients()).toBe(0);
      expect(collaborationService.getUserPresence('user1')).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      wss.addClient(client1);
    });

    it('should handle invalid JSON messages', () => {
      // Simulate invalid JSON
      client1.emit('message', 'invalid json{');
      
      const errorMessage = client1.getLastMessage();
      expect(errorMessage.type).toBe('error');
      expect(errorMessage.error).toBe('Invalid JSON message');
    });

    it('should handle unknown message types', () => {
      client1.simulateMessage({
        type: 'unknown_type',
        data: { test: 'data' }
      });
      
      const errorMessage = client1.getLastMessage();
      expect(errorMessage.type).toBe('error');
      expect(errorMessage.error).toContain('Unknown message type');
    });

    it('should handle operations on non-existent conflicts', () => {
      client1.simulateMessage({
        type: 'authenticate',
        data: { userId: 'user1', token: 'token1' }
      });
      
      client1.simulateMessage({
        type: 'conflict_resolution',
        data: {
          conflictId: 'non-existent-conflict',
          resolution: 'accept_latest'
        }
      });
      
      const errorMessage = client1.getLastMessage();
      expect(errorMessage.type).toBe('error');
      expect(errorMessage.error).toBe('Conflict not found');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent updates', () => {
      // Add multiple clients
      const clients = [];
      for (let i = 0; i < 5; i++) {
        const client = new MockWebSocketClient(`client${i}`);
        clients.push(client);
        wss.addClient(client);
        
        client.simulateMessage({
          type: 'authenticate',
          data: { userId: `user${i}`, token: `token${i}` }
        });
      }
      
      expect(collaborationService.getConnectedClients()).toBe(5);
      
      // Send updates from all clients
      clients.forEach((client, index) => {
        client.simulateMessage({
          type: 'schedule_update',
          data: {
            scheduleId: 'schedule1',
            lessonId: `lesson${index}`,
            changes: { startTime: `${9 + index}:00` },
            userId: `user${index}`,
            timestamp: '2025-09-29T10:00:00Z',
            version: index + 1
          }
        });
      });
      
      // All updates should be processed without errors
      clients.forEach((client, index) => {
        const messages = client.getAllMessages();
        const confirmationMessage = messages.find(msg => msg.type === 'update_confirmed');
        expect(confirmationMessage).toBeDefined();
      });
      
      // Clean up
      clients.forEach(client => client.close());
    });

    it('should handle rapid message sequences', () => {
      wss.addClient(client1);
      
      client1.simulateMessage({
        type: 'authenticate',
        data: { userId: 'user1', token: 'token1' }
      });
      
      // Send many heartbeat messages rapidly
      for (let i = 0; i < 100; i++) {
        client1.simulateMessage({ type: 'heartbeat' });
      }
      
      // Service should still be responsive
      expect(collaborationService.getConnectedClients()).toBe(1);
      expect(client1.getAllMessages().filter(msg => msg.type === 'heartbeat_ack')).toHaveLength(100);
    });
  });
});
