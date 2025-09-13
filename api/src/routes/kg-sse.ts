import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface SSEClient {
  id: string;
  reply: FastifyReply;
  userId: number;
  filters: {
    ticketId?: number;
    assetId?: number;
    siteId?: number;
  };
}

class KGSSEManager {
  private clients: Map<string, SSEClient> = new Map();

  addClient(id: string, reply: FastifyReply, userId: number) {
    const client: SSEClient = {
      id,
      reply,
      userId,
      filters: {}
    };
    
    this.clients.set(id, client);
    
    // Send initial connection message
    this.sendToClient(client, {
      type: 'connected',
      timestamp: new Date().toISOString()
    });

    console.log(`KG SSE client connected: ${id}`);
  }

  removeClient(id: string) {
    const client = this.clients.get(id);
    if (client) {
      try {
        client.reply.raw.end();
      } catch (err) {
        // Client may already be disconnected
      }
      this.clients.delete(id);
      console.log(`KG SSE client disconnected: ${id}`);
    }
  }

  updateClientFilters(clientId: string, filters: any) {
    const client = this.clients.get(clientId);
    if (client) {
      client.filters = { ...client.filters, ...filters };
      this.sendToClient(client, {
        type: 'filters_updated',
        filters: client.filters
      });
    }
  }

  private sendToClient(client: SSEClient, data: any) {
    try {
      if (!client.reply.raw.destroyed) {
        client.reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      } else {
        this.clients.delete(client.id);
      }
    } catch (err) {
      console.error(`Failed to send SSE message to client ${client.id}:`, err);
      this.clients.delete(client.id);
    }
  }

  broadcast(message: any, targetFilters?: any) {
    const clientsToRemove: string[] = [];
    
    for (const [clientId, client] of this.clients) {
      try {
        // Check if client should receive this message based on filters
        if (targetFilters && !this.matchesFilters(client.filters, targetFilters)) {
          continue;
        }

        this.sendToClient(client, message);
      } catch (err) {
        console.error(`Failed to send message to client ${clientId}:`, err);
        clientsToRemove.push(clientId);
      }
    }

    // Clean up disconnected clients
    clientsToRemove.forEach(clientId => this.clients.delete(clientId));
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

const sseManager = new KGSSEManager();

export async function registerKGSSERoutes(fastify: FastifyInstance) {
  // Server-Sent Events endpoint for real-time KG updates
  fastify.get('/kg/events', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const clientId = `${Date.now()}-${Math.random()}`;
    
    // Set up SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    sseManager.addClient(clientId, reply, userId);

    // Handle client disconnect
    request.raw.on('close', () => {
      sseManager.removeClient(clientId);
    });

    request.raw.on('error', () => {
      sseManager.removeClient(clientId);
    });

    // Parse query parameters for initial filters
    const query = request.query as any;
    if (query.ticketId || query.assetId || query.siteId) {
      sseManager.updateClientFilters(clientId, {
        ticketId: query.ticketId ? parseInt(query.ticketId) : undefined,
        assetId: query.assetId ? parseInt(query.assetId) : undefined,
        siteId: query.siteId ? parseInt(query.siteId) : undefined
      });
    }

    // Keep connection alive with periodic heartbeat
    const heartbeat = setInterval(() => {
      try {
        if (!reply.raw.destroyed) {
          reply.raw.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
        } else {
          clearInterval(heartbeat);
          sseManager.removeClient(clientId);
        }
      } catch (err) {
        clearInterval(heartbeat);
        sseManager.removeClient(clientId);
      }
    }, 30000); // 30 second heartbeat

    // Clean up heartbeat on disconnect
    request.raw.on('close', () => {
      clearInterval(heartbeat);
    });
  });

  // Utility endpoint to trigger KG updates (for testing and integration)
  fastify.post('/kg/notify', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const { type, payload, filters } = body;

    if (!type) {
      return reply.code(400).send({ error: 'Message type is required' });
    }

    sseManager.broadcast({ 
      type, 
      payload, 
      timestamp: new Date().toISOString() 
    }, filters);
    
    reply.send({ 
      success: true, 
      clientCount: sseManager.getClientCount(),
      message: `Broadcasted ${type} to ${sseManager.getClientCount()} clients`
    });
  });

  // Endpoint to update client filters
  fastify.post('/kg/events/filters', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const { clientId, filters } = body;

    if (!clientId) {
      return reply.code(400).send({ error: 'Client ID is required' });
    }

    sseManager.updateClientFilters(clientId, filters);
    reply.send({ success: true });
  });
}

// Export the manager for use in other parts of the application
export { sseManager };

// Helper functions to trigger KG updates from other parts of the system
export const notifyKGUpdate = (type: string, payload?: any, filters?: any) => {
  sseManager.broadcast({ 
    type, 
    payload, 
    timestamp: new Date().toISOString() 
  }, filters);
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

export const notifyAnalyticsUpdate = () => {
  notifyKGUpdate('kg_analytics_updated', {});
};
