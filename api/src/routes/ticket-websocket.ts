import { FastifyInstance, FastifyRequest } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';

interface TicketWebSocketMessage {
  type: 'auth' | 'subscribe' | 'unsubscribe' | 'ticket_update' | 'ticket_comment' | 'ticket_status_change' | 'ticket_assignment' | 'ping' | 'pong';
  ticketId?: number;
  siteId?: number;
  payload?: any;
  timestamp?: string;
}

interface ClientConnection {
  id: string;
  socket: any; // WebSocket connection from Fastify
  userId: number;
  subscriptions: {
    ticketIds: Set<number>;
    siteIds: Set<number>;
    allTickets: boolean;
  };
  lastActivity: Date;
}

class TicketWebSocketManager {
  private clients: Map<string, ClientConnection> = new Map();
  private ticketSubscribers: Map<number, Set<string>> = new Map(); // ticketId -> clientIds
  private siteSubscribers: Map<number, Set<string>> = new Map(); // siteId -> clientIds

  addClient(id: string, socket: any, userId: number) {
    const client: ClientConnection = {
      id,
      socket,
      userId,
      subscriptions: {
        ticketIds: new Set(),
        siteIds: new Set(),
        allTickets: false
      },
      lastActivity: new Date()
    };
    
    this.clients.set(id, client);
    
    socket.on('message', (data: Buffer) => {
      try {
        const message: TicketWebSocketMessage = JSON.parse(data.toString());
        this.handleClientMessage(id, message);
      } catch (err) {
        console.error('Invalid WebSocket message:', err);
      }
    });

    socket.on('close', () => {
      this.removeClient(id);
    });

    socket.on('error', (err: any) => {
      console.error(`WebSocket error for client ${id}:`, err);
      this.removeClient(id);
    });

    // Send welcome message
    this.sendToClient(id, {
      type: 'connected' as any,
      payload: { clientId: id, connectedAt: new Date().toISOString() }
    });

    console.log(`Ticket WebSocket client connected: ${id} (user: ${userId})`);
  }

  removeClient(id: string) {
    const client = this.clients.get(id);
    if (!client) return;

    // Remove from ticket subscriptions
    for (const ticketId of client.subscriptions.ticketIds) {
      const subscribers = this.ticketSubscribers.get(ticketId);
      if (subscribers) {
        subscribers.delete(id);
        if (subscribers.size === 0) {
          this.ticketSubscribers.delete(ticketId);
        }
      }
    }

    // Remove from site subscriptions
    for (const siteId of client.subscriptions.siteIds) {
      const subscribers = this.siteSubscribers.get(siteId);
      if (subscribers) {
        subscribers.delete(id);
        if (subscribers.size === 0) {
          this.siteSubscribers.delete(siteId);
        }
      }
    }

    this.clients.delete(id);
    console.log(`Ticket WebSocket client disconnected: ${id}`);
  }

  private handleClientMessage(clientId: string, message: TicketWebSocketMessage) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    switch (message.type) {
      case 'ping':
        // Respond with pong to keep heartbeat alive
        this.sendToClient(client.id, { type: 'pong' as any, payload: { ts: Date.now() } });
        break;
      case 'auth':
        // payload: { token?: string }
        // No-op here; auth is handled at connection level. Keep for client protocol compatibility.
        this.sendToClient(client.id, { type: 'subscribed' as any, payload: { ...client.subscriptions } });
        break;
      case 'subscribe':
        this.handleSubscription(client, message);
        break;
        
      case 'unsubscribe':
        this.handleUnsubscription(client, message);
        break;
        
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }

  private handleSubscription(client: ClientConnection, message: TicketWebSocketMessage) {
    if (message.ticketId) {
      client.subscriptions.ticketIds.add(message.ticketId);
      
      // Add to ticket subscribers map
      if (!this.ticketSubscribers.has(message.ticketId)) {
        this.ticketSubscribers.set(message.ticketId, new Set());
      }
      this.ticketSubscribers.get(message.ticketId)!.add(client.id);
    }

    if (message.siteId) {
      client.subscriptions.siteIds.add(message.siteId);
      
      // Add to site subscribers map
      if (!this.siteSubscribers.has(message.siteId)) {
        this.siteSubscribers.set(message.siteId, new Set());
      }
      this.siteSubscribers.get(message.siteId)!.add(client.id);
    }

    if (message.payload?.allTickets) {
      client.subscriptions.allTickets = true;
    }

    this.sendToClient(client.id, {
      type: 'subscribed' as any,
      payload: {
        ticketIds: Array.from(client.subscriptions.ticketIds),
        siteIds: Array.from(client.subscriptions.siteIds),
        allTickets: client.subscriptions.allTickets
      }
    });
  }

  private handleUnsubscription(client: ClientConnection, message: TicketWebSocketMessage) {
    if (message.ticketId) {
      client.subscriptions.ticketIds.delete(message.ticketId);
      
      // Remove from ticket subscribers map
      const subscribers = this.ticketSubscribers.get(message.ticketId);
      if (subscribers) {
        subscribers.delete(client.id);
        if (subscribers.size === 0) {
          this.ticketSubscribers.delete(message.ticketId);
        }
      }
    }

    if (message.siteId) {
      client.subscriptions.siteIds.delete(message.siteId);
      
      // Remove from site subscribers map
      const subscribers = this.siteSubscribers.get(message.siteId);
      if (subscribers) {
        subscribers.delete(client.id);
        if (subscribers.size === 0) {
          this.siteSubscribers.delete(message.siteId);
        }
      }
    }

    if (message.payload?.allTickets === false) {
      client.subscriptions.allTickets = false;
    }

    this.sendToClient(client.id, {
      type: 'unsubscribed' as any,
      payload: {
        ticketIds: Array.from(client.subscriptions.ticketIds),
        siteIds: Array.from(client.subscriptions.siteIds),
        allTickets: client.subscriptions.allTickets
      }
    });
  }

  private sendToClient(clientId: string, message: TicketWebSocketMessage) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      if (client.socket.readyState === 1) { // WebSocket.OPEN
        client.socket.send(JSON.stringify({
          ...message,
          timestamp: new Date().toISOString()
        }));
      } else {
        this.removeClient(clientId);
      }
    } catch (err) {
      console.error(`Failed to send message to client ${clientId}:`, err);
      this.removeClient(clientId);
    }
  }

  // Public methods for broadcasting updates
  broadcastTicketUpdate(ticketId: number, payload: any, siteId?: number) {
    const message: TicketWebSocketMessage = {
      type: 'ticket_update',
      ticketId,
      payload,
      timestamp: new Date().toISOString()
    };

    // Send to specific ticket subscribers
    const ticketSubscribers = this.ticketSubscribers.get(ticketId);
    if (ticketSubscribers) {
      for (const clientId of ticketSubscribers) {
        this.sendToClient(clientId, message);
      }
    }

    // Send to site subscribers if siteId provided
    if (siteId) {
      const siteSubscribers = this.siteSubscribers.get(siteId);
      if (siteSubscribers) {
        for (const clientId of siteSubscribers) {
          this.sendToClient(clientId, message);
        }
      }
    }

    // Send to clients subscribed to all tickets
    for (const [clientId, client] of this.clients) {
      if (client.subscriptions.allTickets) {
        this.sendToClient(clientId, message);
      }
    }
  }

  broadcastTicketComment(ticketId: number, comment: any, siteId?: number) {
    const message: TicketWebSocketMessage = {
      type: 'ticket_comment',
      ticketId,
      payload: comment,
      timestamp: new Date().toISOString()
    };

    this.broadcastToTicketSubscribers(ticketId, message, siteId);
  }

  broadcastTicketStatusChange(ticketId: number, statusChange: any, siteId?: number) {
    const message: TicketWebSocketMessage = {
      type: 'ticket_status_change',
      ticketId,
      payload: statusChange,
      timestamp: new Date().toISOString()
    };

    this.broadcastToTicketSubscribers(ticketId, message, siteId);
  }

  broadcastTicketAssignment(ticketId: number, assignment: any, siteId?: number) {
    const message: TicketWebSocketMessage = {
      type: 'ticket_assignment',
      ticketId,
      payload: assignment,
      timestamp: new Date().toISOString()
    };

    this.broadcastToTicketSubscribers(ticketId, message, siteId);
  }

  private broadcastToTicketSubscribers(ticketId: number, message: TicketWebSocketMessage, siteId?: number) {
    // Send to specific ticket subscribers
    const ticketSubscribers = this.ticketSubscribers.get(ticketId);
    if (ticketSubscribers) {
      for (const clientId of ticketSubscribers) {
        this.sendToClient(clientId, message);
      }
    }

    // Send to site subscribers if siteId provided
    if (siteId) {
      const siteSubscribers = this.siteSubscribers.get(siteId);
      if (siteSubscribers) {
        for (const clientId of siteSubscribers) {
          this.sendToClient(clientId, message);
        }
      }
    }

    // Send to clients subscribed to all tickets
    for (const [clientId, client] of this.clients) {
      if (client.subscriptions.allTickets) {
        this.sendToClient(clientId, message);
      }
    }
  }

  // Utility methods
  getClientCount(): number {
    return this.clients.size;
  }

  getSubscriptionStats() {
    return {
      totalClients: this.clients.size,
      ticketSubscriptions: this.ticketSubscribers.size,
      siteSubscriptions: this.siteSubscribers.size,
      allTicketSubscribers: Array.from(this.clients.values()).filter(c => c.subscriptions.allTickets).length
    };
  }

  // Cleanup inactive connections
  cleanupInactiveClients(timeoutMinutes: number = 30) {
    const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    const toRemove: string[] = [];

    for (const [clientId, client] of this.clients) {
      if (client.lastActivity < cutoff) {
        toRemove.push(clientId);
      }
    }

    for (const clientId of toRemove) {
      this.removeClient(clientId);
    }

    return toRemove.length;
  }
}

// Global instance
const ticketWsManager = new TicketWebSocketManager();

export async function registerTicketWebSocketRoutes(fastify: FastifyInstance) {
  // Register WebSocket support (idempotent safeguard)
  if (!(fastify as any).websocketServer) {
    await fastify.register(fastifyWebsocket);
    fastify.log.info({ evt: 'ws_plugin_registered' }, 'Fastify websocket plugin registered');
  }

  // (DEV) Temporarily removing per-IP connection limit to prevent 1013 churn during local testing.
  // TODO: Reintroduce smarter resource governance (token bucket per user + idle pruning) before production.
  // const connectionsByIp = new Map<string, number>();
  // const MAX_CONN_PER_IP = Number(process.env.WS_MAX_CONN_PER_IP || 50);

  await fastify.register(async function (fastify) {
    (fastify as any).get('/ws/tickets', { 
      websocket: true,
      config: { rateLimit: false }
    }, (connection: any, req: any) => {
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

      // Extract user from JWT if available
      let userId = 0;
      let authError: any = null;
      try {
        let token: string | undefined;
        const authHeader = req.headers.authorization;
        if (authHeader) {
          token = authHeader.replace('Bearer ', '');
        } else if (req.url.includes('?')) {
          // Parse query string manually (fastify ws upgrade path doesn't add query parsing by default)
            const qsPart = req.url.split('?')[1];
            for (const kv of qsPart.split('&')) {
              const [k, v] = kv.split('=');
              if (k === 'token') token = decodeURIComponent(v || '');
            }
        }
        if (token) {
          const decoded = fastify.jwt.verify(token) as any;
          userId = parseInt(decoded.sub);
        }
      } catch (err) {
        authError = err;
        // Allow anonymous, but record reason for debugging
      }

      const clientId = Math.random().toString(36).substring(2, 15);
      fastify.log.info({ evt: 'ws_handshake', clientId, ip, userId, hasToken: userId !== 0, authError: authError ? (authError as any).message : undefined }, 'Ticket WS handshake');
      ticketWsManager.addClient(clientId, connection.socket, userId);

      connection.socket.on('close', () => {
        // const current = connectionsByIp.get(ip) || 1;
        // connectionsByIp.set(ip, Math.max(0, current - 1));
      });
    });
  });

  // HTTP endpoint to trigger WebSocket notifications (for testing and internal use)
  fastify.post('/ws/tickets/notify', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = request.body as any;
    const { type, ticketId, siteId, payload } = body;

    if (!type || !ticketId) {
      return reply.code(400).send({ error: 'Type and ticketId are required' });
    }

    switch (type) {
      case 'update':
        ticketWsManager.broadcastTicketUpdate(ticketId, payload, siteId);
        break;
      case 'comment':
        ticketWsManager.broadcastTicketComment(ticketId, payload, siteId);
        break;
      case 'status_change':
        ticketWsManager.broadcastTicketStatusChange(ticketId, payload, siteId);
        break;
      case 'assignment':
        ticketWsManager.broadcastTicketAssignment(ticketId, payload, siteId);
        break;
      default:
        return reply.code(400).send({ error: 'Invalid notification type' });
    }

    reply.send({ success: true, stats: ticketWsManager.getSubscriptionStats() });
  });

  // Health endpoint for WebSocket manager
  fastify.get('/ws/tickets/health', async (request, reply) => {
    const stats = ticketWsManager.getSubscriptionStats();
    reply.send({
      status: 'ok',
      websocket: {
        enabled: true,
        ...stats
      }
    });
  });

  // Cleanup endpoint (for maintenance)
  fastify.post('/ws/tickets/cleanup', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const removed = ticketWsManager.cleanupInactiveClients();
    reply.send({ 
      success: true, 
      removedClients: removed,
      stats: ticketWsManager.getSubscriptionStats()
    });
  });

  // Expose the WebSocket manager for use in other parts of the application
  fastify.decorate('ticketWsManager', ticketWsManager);
}

export { ticketWsManager, TicketWebSocketManager };