import { io, Socket } from 'socket.io-client';
import { getAuthHeaders } from '../auth/auth.store';

export interface RealtimeEvent {
  type: 'alert' | 'ticket' | 'maintenance' | 'system' | 'user';
  action: 'created' | 'updated' | 'deleted' | 'status_changed';
  data: any;
  timestamp: string;
  site_id?: number;
  user_id?: number;
}

export interface RealtimeSubscription {
  eventType: string;
  siteId?: number;
  callback: (event: RealtimeEvent) => void;
}

class RealtimeService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private subscriptions: Map<string, RealtimeSubscription[]> = new Map();
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    this.setupConnectionListeners();
  }

  private setupConnectionListeners(): void {
    // This will be called when socket is created
  }

  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.performConnection();
    return this.connectionPromise;
  }

  private async performConnection(): Promise<void> {
    try {
      const authHeaders = await getAuthHeaders();

      this.socket = io(process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3001', {
        transports: ['websocket', 'polling'],
        auth: {
          token: authHeaders.Authorization?.replace('Bearer ', ''),
        },
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
      });

      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket not initialized'));
          return;
        }

        this.socket.on('connect', () => {
          console.log('Connected to realtime service');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Disconnected from realtime service:', reason);
          this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          this.reconnectAttempts++;
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(error);
          }
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log('Reconnected to realtime service after', attemptNumber, 'attempts');
          this.isConnected = true;
          this.reconnectAttempts = 0;
        });

        // Listen for realtime events
        this.socket.on('alert', (event: RealtimeEvent) => {
          this.handleEvent('alert', event);
        });

        this.socket.on('ticket', (event: RealtimeEvent) => {
          this.handleEvent('ticket', event);
        });

        this.socket.on('maintenance', (event: RealtimeEvent) => {
          this.handleEvent('maintenance', event);
        });

        this.socket.on('system', (event: RealtimeEvent) => {
          this.handleEvent('system', event);
        });

        this.socket.on('user', (event: RealtimeEvent) => {
          this.handleEvent('user', event);
        });
      });
    } catch (error) {
      console.error('Failed to connect to realtime service:', error);
      throw error;
    }
  }

  private handleEvent(eventType: string, event: RealtimeEvent): void {
    const key = event.site_id ? `${eventType}_${event.site_id}` : eventType;
    const subs = this.subscriptions.get(key) || [];

    subs.forEach(sub => {
      try {
        sub.callback(event);
      } catch (error) {
        console.error('Error in realtime event callback:', error);
      }
    });
  }

  subscribe(subscription: RealtimeSubscription): () => void {
    if (!this.socket || !this.isConnected) {
      console.warn('Socket not connected, subscription will be queued');
    }

    const key = subscription.siteId
      ? `${subscription.eventType}_${subscription.siteId}`
      : subscription.eventType;

    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, []);
    }

    this.subscriptions.get(key)!.push(subscription);

    // Join room for site-specific events
    if (subscription.siteId && this.socket) {
      this.socket.emit('join_site', { site_id: subscription.siteId });
    }

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(key) || [];
      const index = subs.indexOf(subscription);
      if (index > -1) {
        subs.splice(index, 1);
      }

      // Leave room if no more subscriptions for this site
      if (subscription.siteId && subs.length === 0 && this.socket) {
        this.socket.emit('leave_site', { site_id: subscription.siteId });
      }
    };
  }

  // Convenience methods for common subscriptions
  subscribeToAlerts(siteId: number, callback: (event: RealtimeEvent) => void): () => void {
    return this.subscribe({
      eventType: 'alert',
      siteId,
      callback,
    });
  }

  subscribeToTickets(siteId: number, callback: (event: RealtimeEvent) => void): () => void {
    return this.subscribe({
      eventType: 'ticket',
      siteId,
      callback,
    });
  }

  subscribeToMaintenance(siteId: number, callback: (event: RealtimeEvent) => void): () => void {
    return this.subscribe({
      eventType: 'maintenance',
      siteId,
      callback,
    });
  }

  subscribeToSystemEvents(callback: (event: RealtimeEvent) => void): () => void {
    return this.subscribe({
      eventType: 'system',
      callback,
    });
  }

  subscribeToUserEvents(userId: number, callback: (event: RealtimeEvent) => void): () => void {
    return this.subscribe({
      eventType: 'user',
      callback: (event) => {
        if (event.user_id === userId) {
          callback(event);
        }
      },
    });
  }

  // Send events to server
  async emit(eventType: string, data: any): Promise<void> {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      this.socket!.emit(eventType, data, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  // Update user presence
  async updatePresence(status: 'online' | 'away' | 'busy'): Promise<void> {
    await this.emit('presence', { status });
  }

  // Send typing indicators
  async sendTyping(conversationId: string, isTyping: boolean): Promise<void> {
    await this.emit('typing', { conversation_id: conversationId, is_typing: isTyping });
  }

  // Join/leave conversations
  async joinConversation(conversationId: string): Promise<void> {
    await this.emit('join_conversation', { conversation_id: conversationId });
  }

  async leaveConversation(conversationId: string): Promise<void> {
    await this.emit('leave_conversation', { conversation_id: conversationId });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.subscriptions.clear();
      this.connectionPromise = null;
    }
  }

  isConnectedToRealtime(): boolean {
    return this.isConnected;
  }

  getConnectionState(): 'disconnected' | 'connected' {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    return 'disconnected';
  }
}

// Singleton instance
export const realtimeService = new RealtimeService();

// React hook for using realtime service
export function useRealtime() {
  return realtimeService;
}

// types are already exported above
