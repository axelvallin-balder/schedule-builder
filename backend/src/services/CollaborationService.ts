import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { EventEmitter } from 'events';

// Types for collaboration
export interface ScheduleUpdate {
  scheduleId: string;
  lessonId: string;
  changes: Record<string, any>;
  userId: string;
  timestamp: string;
  version: number;
}

export interface RuleChange {
  ruleId: string;
  action: 'created' | 'updated' | 'deleted' | 'toggled';
  rule?: any;
  userId: string;
  timestamp: string;
}

export interface UserPresence {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: string;
  currentSchedule?: string;
}

export interface ConflictData {
  conflictId: string;
  scheduleId: string;
  lessonId: string;
  conflictingVersions: any[];
  timestamp: string;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
}

export interface AuthenticatedClient extends WebSocket {
  userId?: string;
  isAuthenticated?: boolean;
  lastHeartbeat?: Date;
}

export class CollaborationService extends EventEmitter {
  private wss: WebSocketServer;
  private clients: Map<string, AuthenticatedClient> = new Map();
  private userPresence: Map<string, UserPresence> = new Map();
  private conflicts: Map<string, ConflictData> = new Map();
  private scheduleVersions: Map<string, number> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(port: number = 3001) {
    super();
    this.wss = new WebSocketServer({ port });
    this.setupWebSocketServer();
    this.startHeartbeatCheck();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: AuthenticatedClient, request: IncomingMessage) => {
      this.handleClientConnection(ws, request);
    });

    this.wss.on('error', (error: Error) => {
      console.error('WebSocket server error:', error);
      this.emit('error', error);
    });
  }

  private handleClientConnection(client: AuthenticatedClient, request: IncomingMessage): void {
    console.log('New WebSocket connection established');
    
    client.isAuthenticated = false;
    client.lastHeartbeat = new Date();

    // Set up client event handlers
    client.on('message', (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleMessage(client, message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        this.sendError(client, 'Invalid JSON message');
      }
    });

    client.on('close', (code: number, reason: Buffer) => {
      console.log(`Client disconnected: ${code} ${reason.toString()}`);
      this.handleClientDisconnection(client);
    });

    client.on('error', (error: Error) => {
      console.error('WebSocket client error:', error);
      this.handleClientDisconnection(client);
    });

    client.on('pong', () => {
      client.lastHeartbeat = new Date();
    });

    // Send welcome message
    this.sendMessage(client, {
      type: 'connection_established',
      data: {
        timestamp: new Date().toISOString(),
        serverVersion: '1.0.0'
      }
    });
  }

  private handleMessage(client: AuthenticatedClient, message: WebSocketMessage): void {
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
      case 'get_presence':
        this.handleGetPresence(client, message.data);
        break;
      default:
        this.sendError(client, `Unknown message type: ${message.type}`);
    }
  }

  private async handleAuthentication(client: AuthenticatedClient, data: { userId: string; token: string }): Promise<void> {
    try {
      // In a real implementation, validate the token against your auth service
      const isValidToken = await this.validateAuthToken(data.token, data.userId);
      
      if (!isValidToken) {
        this.sendError(client, 'Invalid authentication token');
        return;
      }

      // Mark client as authenticated
      client.userId = data.userId;
      client.isAuthenticated = true;
      this.clients.set(data.userId, client);
      
      // Update user presence
      const presence: UserPresence = {
        userId: data.userId,
        status: 'online',
        lastSeen: new Date().toISOString()
      };
      this.userPresence.set(data.userId, presence);

      // Broadcast user presence update
      this.broadcastUserPresence(data.userId, 'online');

      // Send authentication success
      this.sendMessage(client, {
        type: 'authenticated',
        data: {
          userId: data.userId,
          timestamp: new Date().toISOString()
        }
      });

      this.emit('user_connected', { userId: data.userId, timestamp: new Date() });
    } catch (error) {
      console.error('Authentication error:', error);
      this.sendError(client, 'Authentication failed');
    }
  }

  private async validateAuthToken(token: string, userId: string): Promise<boolean> {
    // Mock implementation - in real app, verify JWT or session token
    // This could integrate with your existing auth system
    return token.length > 0 && userId.length > 0;
  }

  private handleScheduleUpdate(client: AuthenticatedClient, data: ScheduleUpdate): void {
    if (!this.requireAuthentication(client)) return;

    try {
      // Check for version conflicts
      const currentVersion = this.scheduleVersions.get(data.scheduleId) || 0;
      
      if (data.version <= currentVersion) {
        // Create conflict
        const conflictId = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const conflict: ConflictData = {
          conflictId,
          scheduleId: data.scheduleId,
          lessonId: data.lessonId,
          conflictingVersions: [data],
          timestamp: new Date().toISOString()
        };
        
        this.conflicts.set(conflictId, conflict);
        
        // Notify client of conflict
        this.sendMessage(client, {
          type: 'conflict_detected',
          data: conflict
        });

        this.emit('conflict_detected', conflict);
        return;
      }

      // Update version
      this.scheduleVersions.set(data.scheduleId, data.version);

      // Add timestamp and user info
      const updateData = {
        ...data,
        timestamp: new Date().toISOString(),
        userId: client.userId
      };

      // Broadcast update to all clients except sender
      this.broadcastToSchedule(data.scheduleId, {
        type: 'schedule_update',
        data: updateData
      }, client);

      // Confirm update to sender
      this.sendMessage(client, {
        type: 'update_confirmed',
        data: {
          scheduleId: data.scheduleId,
          lessonId: data.lessonId,
          version: data.version,
          timestamp: updateData.timestamp
        }
      });

      this.emit('schedule_updated', updateData);
    } catch (error) {
      console.error('Schedule update error:', error);
      this.sendError(client, 'Failed to process schedule update');
    }
  }

  private handleRuleChange(client: AuthenticatedClient, data: RuleChange): void {
    if (!this.requireAuthentication(client)) return;

    try {
      const ruleChangeData = {
        ...data,
        timestamp: new Date().toISOString(),
        userId: client.userId
      };

      // Broadcast rule change to all authenticated clients
      this.broadcastToAll({
        type: 'rule_change',
        data: ruleChangeData
      });

      this.emit('rule_changed', ruleChangeData);
    } catch (error) {
      console.error('Rule change error:', error);
      this.sendError(client, 'Failed to process rule change');
    }
  }

  private handleJoinSchedule(client: AuthenticatedClient, data: { scheduleId: string }): void {
    if (!this.requireAuthentication(client)) return;

    try {
      // Update user presence with current schedule
      const presence = this.userPresence.get(client.userId!);
      if (presence) {
        presence.currentSchedule = data.scheduleId;
        presence.lastSeen = new Date().toISOString();
        this.userPresence.set(client.userId!, presence);
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

      // Send current schedule state to the joining user
      const currentVersion = this.scheduleVersions.get(data.scheduleId) || 0;
      this.sendMessage(client, {
        type: 'schedule_state',
        data: {
          scheduleId: data.scheduleId,
          version: currentVersion,
          timestamp: new Date().toISOString()
        }
      });

      this.emit('user_joined_schedule', { userId: client.userId, scheduleId: data.scheduleId });
    } catch (error) {
      console.error('Join schedule error:', error);
      this.sendError(client, 'Failed to join schedule');
    }
  }

  private handleLeaveSchedule(client: AuthenticatedClient, data: { scheduleId: string }): void {
    if (!this.requireAuthentication(client)) return;

    try {
      // Update user presence
      const presence = this.userPresence.get(client.userId!);
      if (presence) {
        delete presence.currentSchedule;
        presence.lastSeen = new Date().toISOString();
        this.userPresence.set(client.userId!, presence);
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

      this.emit('user_left_schedule', { userId: client.userId, scheduleId: data.scheduleId });
    } catch (error) {
      console.error('Leave schedule error:', error);
      this.sendError(client, 'Failed to leave schedule');
    }
  }

  private handleConflictResolution(client: AuthenticatedClient, data: any): void {
    if (!this.requireAuthentication(client)) return;

    try {
      const conflict = this.conflicts.get(data.conflictId);
      if (!conflict) {
        this.sendError(client, 'Conflict not found');
        return;
      }

      // Remove conflict
      this.conflicts.delete(data.conflictId);

      const resolutionData = {
        conflictId: data.conflictId,
        resolution: data.resolution,
        resolvedBy: client.userId,
        timestamp: new Date().toISOString()
      };

      // Broadcast resolution
      this.broadcastToAll({
        type: 'conflict_resolved',
        data: resolutionData
      });

      this.emit('conflict_resolved', resolutionData);
    } catch (error) {
      console.error('Conflict resolution error:', error);
      this.sendError(client, 'Failed to resolve conflict');
    }
  }

  private handleHeartbeat(client: AuthenticatedClient): void {
    if (client.userId) {
      const presence = this.userPresence.get(client.userId);
      if (presence) {
        presence.lastSeen = new Date().toISOString();
        this.userPresence.set(client.userId, presence);
      }
    }

    client.lastHeartbeat = new Date();

    this.sendMessage(client, {
      type: 'heartbeat_ack',
      data: {
        timestamp: new Date().toISOString()
      }
    });
  }

  private handleGetPresence(client: AuthenticatedClient, data: { userIds?: string[] }): void {
    if (!this.requireAuthentication(client)) return;

    try {
      let presenceData: UserPresence[];

      if (data.userIds && data.userIds.length > 0) {
        // Get specific users' presence
        presenceData = data.userIds
          .map(userId => this.userPresence.get(userId))
          .filter(presence => presence !== undefined) as UserPresence[];
      } else {
        // Get all online users' presence
        presenceData = Array.from(this.userPresence.values())
          .filter(presence => presence.status === 'online');
      }

      this.sendMessage(client, {
        type: 'presence_data',
        data: {
          users: presenceData,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Get presence error:', error);
      this.sendError(client, 'Failed to get presence data');
    }
  }

  private handleClientDisconnection(client: AuthenticatedClient): void {
    if (client.userId) {
      // Update user presence to offline
      this.broadcastUserPresence(client.userId, 'offline');
      
      // Clean up
      this.clients.delete(client.userId);
      this.userPresence.delete(client.userId);

      this.emit('user_disconnected', { userId: client.userId, timestamp: new Date() });
    }
  }

  private requireAuthentication(client: AuthenticatedClient): boolean {
    if (!client.isAuthenticated || !client.userId) {
      this.sendError(client, 'Authentication required');
      return false;
    }
    return true;
  }

  private sendMessage(client: AuthenticatedClient, message: WebSocketMessage): void {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send message to client:', error);
      }
    }
  }

  private sendError(client: AuthenticatedClient, message: string): void {
    this.sendMessage(client, {
      type: 'error',
      data: {
        error: message,
        timestamp: new Date().toISOString()
      }
    });
  }

  private broadcastToAll(message: WebSocketMessage, excludeClient?: AuthenticatedClient): void {
    this.clients.forEach(client => {
      if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
        this.sendMessage(client, message);
      }
    });
  }

  private broadcastToSchedule(scheduleId: string, message: WebSocketMessage, excludeClient?: AuthenticatedClient): void {
    this.clients.forEach(client => {
      if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
        const presence = this.userPresence.get(client.userId!);
        if (presence?.currentSchedule === scheduleId) {
          this.sendMessage(client, message);
        }
      }
    });
  }

  private broadcastUserPresence(userId: string, status: 'online' | 'offline' | 'away'): void {
    this.broadcastToAll({
      type: 'user_presence',
      data: {
        userId,
        status,
        lastSeen: new Date().toISOString()
      }
    });
  }

  private startHeartbeatCheck(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = 30000; // 30 seconds

      this.clients.forEach((client, userId) => {
        if (client.lastHeartbeat && (now.getTime() - client.lastHeartbeat.getTime()) > timeout) {
          console.log(`Client ${userId} heartbeat timeout, closing connection`);
          client.terminate();
        } else {
          // Send ping to check connection
          if (client.readyState === WebSocket.OPEN) {
            client.ping();
          }
        }
      });
    }, 15000); // Check every 15 seconds
  }

  // Public methods for external use
  public getConnectedClients(): number {
    return this.clients.size;
  }

  public getUserPresence(userId: string): UserPresence | undefined {
    return this.userPresence.get(userId);
  }

  public getAllUserPresence(): UserPresence[] {
    return Array.from(this.userPresence.values());
  }

  public getActiveConflicts(): ConflictData[] {
    return Array.from(this.conflicts.values());
  }

  public getScheduleVersion(scheduleId: string): number {
    return this.scheduleVersions.get(scheduleId) || 0;
  }

  public getClientsBySchedule(scheduleId: string): string[] {
    const users: string[] = [];
    this.userPresence.forEach((presence, userId) => {
      if (presence.currentSchedule === scheduleId) {
        users.push(userId);
      }
    });
    return users;
  }

  public broadcastSystemMessage(message: string, scheduleId?: string): void {
    const systemMessage = {
      type: 'system_message',
      data: {
        message,
        timestamp: new Date().toISOString()
      }
    };

    if (scheduleId) {
      this.broadcastToSchedule(scheduleId, systemMessage);
    } else {
      this.broadcastToAll(systemMessage);
    }
  }

  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    this.clients.forEach(client => {
      client.close(1000, 'Server shutdown');
    });

    // Close WebSocket server
    this.wss.close(() => {
      console.log('WebSocket server closed');
    });

    this.emit('shutdown');
  }
}

export default CollaborationService;