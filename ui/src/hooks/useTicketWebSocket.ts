import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/router';

interface TicketWebSocketMessage {
  type: 'connected' | 'subscribed' | 'unsubscribed' | 'ticket_update' | 'ticket_comment' | 'ticket_status_change' | 'ticket_assignment';
  ticketId?: number;
  siteId?: number;
  payload?: any;
  timestamp?: string;
}

interface WebSocketSubscription {
  ticketIds?: number[];
  siteIds?: number[];
  allTickets?: boolean;
}

interface UseTicketWebSocketOptions {
  onTicketUpdate?: (ticketId: number, payload: any) => void;
  onTicketComment?: (ticketId: number, comment: any) => void;
  onTicketStatusChange?: (ticketId: number, statusChange: any) => void;
  onTicketAssignment?: (ticketId: number, assignment: any) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useTicketWebSocket(options: UseTicketWebSocketOptions = {}) {
  const {
    onTicketUpdate,
    onTicketComment,
    onTicketStatusChange,
    onTicketAssignment,
    // Re-enable autoReconnect by default now that we guard storms
    autoReconnect = true,
    reconnectInterval = 8000
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<TicketWebSocketMessage | null>(null);
  const [lastCloseCode, setLastCloseCode] = useState<number | null>(null);
  const [lastCloseReason, setLastCloseReason] = useState<string | null>(null);
  const [reconnectDelay, setReconnectDelay] = useState<number>(0);
  const [subscriptions, setSubscriptions] = useState<WebSocketSubscription>({});

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const router = useRouter();

  const getWebSocketUrl = useCallback(() => {
    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    let base = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
    // If base is relative, prepend current origin
    if (base.startsWith('/')) {
      base = `${loc.origin}${base}`;
    }
    // Ensure single /api segment and no trailing slash duplication
    if (!/\/api$/i.test(base)) {
      // if user gave host without /api, append
      base = base.replace(/\/$/, '') + '/api';
    }
    const token = getAuthToken();
    let url = base.replace(/^http/, protocol.startsWith('wss') ? 'https' : 'http') + '/ws/tickets';
    if (token) {
      // append token as query param (avoid adding twice)
      url += (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);
    }
    // Convert http(s) prefix to ws(s)
    return url.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
  }, []);

  const getAuthToken = useCallback(() => {
    return localStorage.getItem('opsgraph_token') || '';
  }, []);

  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPongRef = useRef<number>(Date.now());
  const FORCE_TIMEOUT_MS = 70000; // 70s tolerance

  // Heartbeat interval (ping) - safe to ignore missing deps since refs/constants only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) return;
    heartbeatIntervalRef.current = setInterval(() => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      // If no pong within 30s, force reconnect
      if (Date.now() - lastPongRef.current > FORCE_TIMEOUT_MS) {
        console.warn('Heartbeat timeout, forcing reconnect');
        try { ws.close(4000, 'Heartbeat missed'); } catch {}
        return;
      }
      try { ws.send(JSON.stringify({ type: 'ping', ts: Date.now() })); } catch {}
    }, 10000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Module-level singleton support (attached to window for safety in HMR / multiple hooks)
  const globalKey = '__opsgraph_ticket_ws__';

  const connect = useCallback(() => {
    const existing: any = (typeof window !== 'undefined') ? (window as any)[globalKey] : null;
    if (existing && existing.readyState === WebSocket.OPEN) {
      wsRef.current = existing;
      setIsConnected(true);
      setConnectionState('connected');
      return;
    }
    // Prevent connection storms
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket already open or connecting, skipping new connection');
      return;
    }

    setConnectionState('connecting');
    
    try {
      const wsUrl = getWebSocketUrl();
      const token = getAuthToken();
      
      // Create WebSocket with auth header (note: this may not work in all browsers)
      // Alternative: send token in first message after connection
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
        setLastCloseCode(null);
        setLastCloseReason(null);
        setReconnectDelay(0);
        startHeartbeat();
        
        // Send auth token as first message if needed
        if (token) {
          ws.send(JSON.stringify({
            type: 'auth',
            token: token
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: TicketWebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          if ((message as any).type === 'pong') {
            lastPongRef.current = Date.now();
            return;
          }
          
          // Handle different message types
          switch (message.type) {
            case 'connected':
              console.log('WebSocket connection confirmed:', message.payload);
              break;
              
            case 'subscribed':
              console.log('WebSocket subscription confirmed:', message.payload);
              break;
              
            case 'ticket_update':
              if (message.ticketId && onTicketUpdate) {
                onTicketUpdate(message.ticketId, message.payload);
              }
              break;
              
            case 'ticket_comment':
              if (message.ticketId && onTicketComment) {
                onTicketComment(message.ticketId, message.payload);
              }
              break;
              
            case 'ticket_status_change':
              if (message.ticketId && onTicketStatusChange) {
                onTicketStatusChange(message.ticketId, message.payload);
              }
              break;
              
            case 'ticket_assignment':
              if (message.ticketId && onTicketAssignment) {
                onTicketAssignment(message.ticketId, message.payload);
              }
              break;
              
            default:
              console.log('Unknown WebSocket message type:', message.type);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionState('disconnected');
        setLastCloseCode(event.code);
        setLastCloseReason(event.reason || null);
        wsRef.current = null;
        stopHeartbeat();
        
        // Auto-reconnect if enabled and not a clean close
        if (autoReconnect && event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          // Exponential backoff with cap (1s,2s,4s,... up to 30s) then add jitter ±10%
            const attempt = reconnectAttemptsRef.current;
            const baseDelay = Math.min(30000, 1000 * Math.pow(2, attempt - 1));
            const jitter = baseDelay * (Math.random() * 0.2 - 0.1);
            const delay = Math.round(baseDelay + jitter);
            setReconnectDelay(delay);
            console.log(`Attempting to reconnect (${attempt}/${maxReconnectAttempts}) in ${delay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState('error');
      };
      wsRef.current = ws;
      try { (window as any)[globalKey] = ws; } catch {}
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setConnectionState('error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getWebSocketUrl, getAuthToken, onTicketUpdate, onTicketComment, onTicketStatusChange, onTicketAssignment, autoReconnect, reconnectInterval, startHeartbeat, stopHeartbeat]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    stopHeartbeat();
    
    if (wsRef.current) {
      try { wsRef.current.close(1000, 'Client disconnect'); } catch {}
      try { if ((window as any)[globalKey] === wsRef.current) { delete (window as any)[globalKey]; } } catch {}
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionState('disconnected');
  }, [stopHeartbeat]);

  const subscribe = useCallback((subscription: WebSocketSubscription) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Cannot subscribe: WebSocket not connected');
      return;
    }

    const message = {
      type: 'subscribe',
      ...subscription
    };

    wsRef.current.send(JSON.stringify(message));
    setSubscriptions(prev => ({
      ticketIds: [...(prev.ticketIds || []), ...(subscription.ticketIds || [])],
      siteIds: [...(prev.siteIds || []), ...(subscription.siteIds || [])],
      allTickets: prev.allTickets || subscription.allTickets || false
    }));
  }, []);

  const unsubscribe = useCallback((subscription: WebSocketSubscription) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Cannot unsubscribe: WebSocket not connected');
      return;
    }

    const message = {
      type: 'unsubscribe',
      ...subscription
    };

    wsRef.current.send(JSON.stringify(message));
    
    setSubscriptions(prev => {
      const newSubscriptions = { ...prev };
      
      if (subscription.ticketIds) {
        newSubscriptions.ticketIds = (prev.ticketIds || []).filter(
          id => !subscription.ticketIds!.includes(id)
        );
      }
      
      if (subscription.siteIds) {
        newSubscriptions.siteIds = (prev.siteIds || []).filter(
          id => !subscription.siteIds!.includes(id)
        );
      }
      
      if (subscription.allTickets === false) {
        newSubscriptions.allTickets = false;
      }
      
      return newSubscriptions;
    });
  }, []);

  const subscribeToTicket = useCallback((ticketId: number) => {
    subscribe({ ticketIds: [ticketId] });
  }, [subscribe]);

  const unsubscribeFromTicket = useCallback((ticketId: number) => {
    unsubscribe({ ticketIds: [ticketId] });
  }, [unsubscribe]);

  const subscribeToSite = useCallback((siteId: number) => {
    subscribe({ siteIds: [siteId] });
  }, [subscribe]);

  const unsubscribeFromSite = useCallback((siteId: number) => {
    unsubscribe({ siteIds: [siteId] });
  }, [unsubscribe]);

  const subscribeToAllTickets = useCallback(() => {
    subscribe({ allTickets: true });
  }, [subscribe]);

  const unsubscribeFromAllTickets = useCallback(() => {
    unsubscribe({ allTickets: false });
  }, [unsubscribe]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Auto-reconnect on route changes (if connection was lost)
  useEffect(() => {
    if (!isConnected && autoReconnect) {
      const timer = setTimeout(() => {
        connect();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [router.asPath, isConnected, autoReconnect, connect]);

  return {
    isConnected,
    connectionState,
    lastMessage,
    lastCloseCode,
    lastCloseReason,
    reconnectDelay,
    subscriptions,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    subscribeToTicket,
    unsubscribeFromTicket,
    subscribeToSite,
    unsubscribeFromSite,
    subscribeToAllTickets,
    unsubscribeFromAllTickets
  };
}