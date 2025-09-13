import { useEffect, useRef, useCallback } from 'react';
import { useKnowledgeGraph } from './useKnowledgeGraph';

interface UseRealTimeKGOptions {
  enabled?: boolean;
  ticketId?: number;
  assetId?: number;
  siteId?: number;
  updateInterval?: number; // ms
}

export const useRealTimeKG = (options: UseRealTimeKGOptions = {}) => {
  const {
    enabled = true,
    ticketId,
    assetId,
    siteId,
    updateInterval = 30000 // 30 seconds default
  } = options;

  const { fetchGraphData, fetchAdvancedAnalytics } = useKnowledgeGraph();
  const eventSourceRef = useRef<EventSource | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  const handleSSEMessage = useCallback((data: any) => {
    const now = Date.now();
    
    // Skip heartbeat messages and throttle updates
    if (data.type === 'heartbeat') return;
    if (now - lastUpdateRef.current < 1000) return;
    
    lastUpdateRef.current = now;

    switch (data.type) {
      case 'connected':
        console.log('KG SSE connected successfully');
        break;
        
      case 'kg_node_updated':
      case 'kg_edge_created':
      case 'kg_edge_deleted':
        // Refresh graph data when nodes/edges change
        fetchGraphData({ ticketId, assetId, siteId });
        break;
        
      case 'kg_analytics_updated':
        // Refresh analytics data
        fetchAdvancedAnalytics();
        break;
        
      case 'asset_failure':
      case 'asset_recovery':
        // Asset state changes may affect blast radius
        if (data.payload?.assetId) {
          fetchGraphData({ ticketId, assetId: data.payload.assetId, siteId });
        }
        break;
        
      case 'ticket_created':
      case 'ticket_updated':
        // Ticket changes may create new KG relationships
        if (data.payload?.ticketId && (!ticketId || data.payload.ticketId === ticketId)) {
          fetchGraphData({ ticketId: data.payload.ticketId, assetId, siteId });
        }
        break;
        
      default:
        console.log('Unhandled KG SSE message:', data.type);
    }
  }, [ticketId, assetId, siteId, fetchGraphData, fetchAdvancedAnalytics]);

  const startPolling = useCallback(() => {
    if (!enabled || intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      
      // Only poll if we haven't received SSE updates recently
      if (now - lastUpdateRef.current > updateInterval) {
        fetchGraphData({ ticketId, assetId, siteId });
        
        // Periodically refresh analytics (less frequently)
        if (now % (updateInterval * 3) === 0) {
          fetchAdvancedAnalytics();
        }
      }
    }, updateInterval);
  }, [enabled, updateInterval, ticketId, assetId, siteId, fetchGraphData, fetchAdvancedAnalytics]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const connectSSE = useCallback(() => {
    if (!enabled) return;

    // Build SSE URL with filters
    const params = new URLSearchParams();
    if (ticketId) params.append('ticketId', ticketId.toString());
    if (assetId) params.append('assetId', assetId.toString());
    if (siteId) params.append('siteId', siteId.toString());

    const sseUrl = `/api/kg/events?${params.toString()}`;

    try {
      eventSourceRef.current = new EventSource(sseUrl);

      eventSourceRef.current.onopen = () => {
        console.log('KG SSE connected');
      };

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleSSEMessage(data);
        } catch (err) {
          console.error('Failed to parse SSE message:', err);
        }
      };

      eventSourceRef.current.onerror = (error) => {
        console.error('KG SSE error:', error);
        
        // Retry connection after 5 seconds
        setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            connectSSE();
          }
        }, 5000);
      };
    } catch (err) {
      console.error('Failed to connect SSE:', err);
      // Fall back to polling
      startPolling();
    }
  }, [enabled, ticketId, assetId, siteId, startPolling, handleSSEMessage]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    stopPolling();
  }, [stopPolling]);

  // Setup and cleanup
  useEffect(() => {
    if (enabled) {
      connectSSE();
      // Start polling as fallback
      setTimeout(startPolling, 2000);
    }

    return () => {
      disconnect();
    };
  }, [enabled, connectSSE, startPolling, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
    disconnect,
    reconnect: connectSSE
  };
};
