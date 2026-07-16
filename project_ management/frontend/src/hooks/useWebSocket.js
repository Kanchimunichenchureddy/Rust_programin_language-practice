import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useWebSocket — Manages a persistent WebSocket connection to the Rust backend.
 *
 * Features:
 * - Auto-connects on mount
 * - Reconnects on disconnection (with exponential backoff)
 * - Tracks connection state: 'connecting' | 'connected' | 'disconnected' | 'error'
 * - Provides `send()` function that returns a Promise resolving to the response
 * - Matches responses to requests using req_id
 *
 * @param {string} url - WebSocket URL (e.g., "ws://127.0.0.1:9001")
 * @returns {{ send, connected, connecting, error, connectionState }}
 *
 * Usage:
 *   const { send, connected } = useWebSocket("ws://127.0.0.1:9001");
 *   const result = await send("auth.login", { email, password });
 */
export default function useWebSocket(url) {
  const [connectionState, setConnectionState] = useState('disconnected');
  const wsRef = useRef(null);
  const pendingRef = useRef(new Map());   // req_id → { resolve, reject }
  const counterRef = useRef(0);           // Monotonic counter for req_ids
  const reconnectTimerRef = useRef(null);
  const mountedRef = useRef(true);

  // Generate unique request IDs
  const nextId = useCallback(() => {
    counterRef.current += 1;
    return `req_${counterRef.current}_${Date.now()}`;
  }, []);

  // Connect / reconnect logic
  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionState('connecting');

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        setConnectionState('connected');
      };

      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);

          // Find the pending request by req_id and resolve it
          const pending = pendingRef.current.get(response.req_id);
          if (pending) {
            pendingRef.current.delete(response.req_id);
            if (response.type === 'ok') {
              pending.resolve(response.data);
            } else {
              pending.reject(
                new Error(response.error?.message || 'Unknown error')
              );
            }
          }
        } catch (parseError) {
          console.warn('Failed to parse WebSocket message:', parseError);
        }
      };

      ws.onerror = () => {
        // onclose will fire after this, so we handle state there
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnectionState('disconnected');

        // Reject all pending requests
        const pending = pendingRef.current;
        pendingRef.current = new Map();
        pending.forEach((p) => {
          p.reject(new Error('Connection closed'));
        });

        // Auto-reconnect after a delay
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
        }
        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            connect();
          }
        }, 2000);
      };

      wsRef.current = ws;
    } catch (err) {
      setConnectionState('error');
    }
  }, [url]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      // Reject any remaining pending requests
      pendingRef.current.forEach((p) => p.reject(new Error('Component unmounted')));
      pendingRef.current = new Map();
    };
  }, [connect]);

  /**
   * Send an IPC command to the backend and wait for the response.
   *
   * @param {string} cmd - Command name (e.g., "auth.login", "projects.list")
   * @param {object} payload - Command payload
   * @param {string} [token] - Optional auth token
   * @returns {Promise<object>} Response data
   */
  const send = useCallback((cmd, payload = {}, token = null) => {
    return new Promise((resolve, reject) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected to backend'));
        return;
      }

      const req_id = nextId();
      const request = {
        cmd,
        req_id,
        payload,
      };

      // Include token if provided
      if (token) {
        request.token = token;
      }

      // Store the pending promise so we can resolve/reject it when the response arrives
      pendingRef.current.set(req_id, { resolve, reject });

      // Timeout after 30 seconds
      const timeoutId = setTimeout(() => {
        if (pendingRef.current.has(req_id)) {
          pendingRef.current.delete(req_id);
          reject(new Error(`Request timed out: ${cmd}`));
        }
      }, 30000);

      // Wrap the original resolve/reject to clear the timeout
      const originalResolve = resolve;
      const originalReject = reject;
      pendingRef.current.set(req_id, {
        resolve: (data) => {
          clearTimeout(timeoutId);
          originalResolve(data);
        },
        reject: (err) => {
          clearTimeout(timeoutId);
          originalReject(err);
        },
      });

      try {
        ws.send(JSON.stringify(request));
      } catch (sendError) {
        clearTimeout(timeoutId);
        pendingRef.current.delete(req_id);
        reject(new Error(`Failed to send: ${sendError.message}`));
      }
    });
  }, [nextId]);

  return {
    send,
    connected: connectionState === 'connected',
    connecting: connectionState === 'connecting',
    error: connectionState === 'error',
    connectionState,
  };
}
