import { FastifyInstance, FastifyRequest } from 'fastify';

interface WebSocketMessage {
  type: string;
  payload?: any;
  filters?: {
    ticketId?: number;
    assetId?: number;
    siteId?: number;
  };
}

interface ClientConnection {
  id: string;
  socket: any; // WebSocket
  userId: number;
  filters: {
    ticketId?: number;
    assetId?: number;
    siteId?: number;
  };
}

class KGWebSocketManager {
  private clients: Map<string, ClientConnection> = new Map();

  addClient(id: string, socket: any, userId: number) {
    const client: ClientConnection = {
      id,
      socket,
      userId,
      filters: {}
    };
    
    this.clients.set(id, client);
    
    socket.on('message', (data: string) => {
      try {
        const message: WebSocketMessage = JSON.parse(data);
        this.handleClientMessage(id, message);
      } catch (err) {
        console.error('Invalid WebSocket message:', err);
      }
    });

    socket.on('close', () => {
      this.clients.delete(id);
    });

    console.log(`KG WebSocket client connected: ${id}`);
  }

  removeClient(id: string) {
    this.clients.delete(id);
    console.log(`KG WebSocket client disconnected: ${id}`);
  }

  private handleClientMessage(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        if (message.filters) {
          client.filters = { ...client.filters, ...message.filters };
        }
        client.socket.send(JSON.stringify({
          type: 'subscribed',
          filters: client.filters
        }));
        break;
        
      case 'unsubscribe':
        client.filters = {};
        client.socket.send(JSON.stringify({
          type: 'unsubscribed'
        }));
        break;
        
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }

  broadcast(message: WebSocketMessage, targetFilters?: any) {
    for (const [clientId, client] of this.clients) {
      try {
        // Check if client should receive this message based on filters
        if (targetFilters && !this.matchesFilters(client.filters, targetFilters)) {
          continue;
        }

        if (client.socket.readyState === 1) { // WebSocket.OPEN
          client.socket.send(JSON.stringify(message));
        } else {
          // Remove disconnected clients
          this.clients.delete(clientId);
        }
      } catch (err) {
        console.error(`Failed to send message to client ${clientId}:`, err);
        this.clients.delete(clientId);
      }
    }
  }

  private matchesFilters(clientFilters: any, targetFilters: any): boolean {
    // If client has no filters, receive all messages
    if (!clientFilters || Object.keys(clientFilters).length === 0) {
      return true;
    }

    // Check if any filter matches
    for (const [key, value] of Object.entries(clientFilters)) {
      if (value && targetFilters[key] === value) {
        return true;
      }
    }

    return false;
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

const wsManager = new KGWebSocketManager();

export async function registerKGWebSocketRoutes(fastify: FastifyInstance) {
  // Drop WebSocket route for now; rely on SSE in routes/sse.ts for simplicity and stability.

  // Safe auth wrapper: use authenticate if present, otherwise no-op
  const authOrNothing = (req: any, reply: any, done: any) => {
    const hasAuth = typeof (fastify as any).authenticate === 'function';
    if (!hasAuth) return done();
    return (fastify as any).authenticate(req, reply);
  };

  // Utility endpoint to trigger KG updates (for testing)
  fastify.post('/kg/notify', { preHandler: [authOrNothing] }, async (request: FastifyRequest, reply) => {
    const body = request.body as any;
    const { type, payload, filters } = body;

    if (!type) {
      return reply.code(400).send({ error: 'Message type is required' });
    }

    wsManager.broadcast({ type, payload }, filters);
    
    reply.send({ 
      success: true, 
      clientCount: wsManager.getClientCount(),
      message: `Broadcasted ${type} to ${wsManager.getClientCount()} clients`
    });
  });
}

// Export the manager for use in other parts of the application
export { wsManager };

// Helper functions to trigger KG updates from other parts of the system
export const notifyKGUpdate = (type: string, payload?: any, filters?: any) => {
  wsManager.broadcast({ type, payload }, filters);
};

export const notifyNodeUpdate = (nodeId: string, nodeType: string, data: any) => {
  notifyKGUpdate('kg_node_updated', { nodeId, nodeType, data });
};

export const notifyEdgeUpdate = (edgeId: string, sourceId: string, targetId: string, edgeType: string) => {
  notifyKGUpdate('kg_edge_updated', { edgeId, sourceId, targetId, edgeType });
};

export const notifyAssetFailure = (assetId: number, siteId: number) => {
  notifyKGUpdate('asset_failure', { assetId, siteId }, { assetId, siteId });
};

export const notifyAssetRecovery = (assetId: number, siteId: number) => {
  notifyKGUpdate('asset_recovery', { assetId, siteId }, { assetId, siteId });
};

export const notifyTicketUpdate = (ticketId: number, siteId: number) => {
  notifyKGUpdate('ticket_updated', { ticketId, siteId }, { ticketId, siteId });
};
