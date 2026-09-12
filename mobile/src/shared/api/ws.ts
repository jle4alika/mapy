import { useEffect, useRef } from 'react';

import { wsGatewayUrl } from '../config/env';
import { useSessionStore } from '../../features/auth/session-store';

type Handler = (type: string, payload: Record<string, unknown>) => void;

export function useGatewaySocket(onEvent: Handler, enabled = true) {
  const token = useSessionStore((s) => s.token);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!enabled || !token) return;

    let closed = false;
    let socket: WebSocket | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const connect = () => {
      if (closed) return;
      socket = new WebSocket(wsGatewayUrl(token));

      socket.onopen = () => {
        attempt = 0;
        pingTimer = setInterval(() => {
          socket?.readyState === WebSocket.OPEN &&
            socket.send(JSON.stringify({ type: 'ping', payload: {} }));
        }, 25000);
      };

      socket.onmessage = (ev) => {
        try {
          const frame = JSON.parse(String(ev.data)) as {
            type: string;
            payload?: Record<string, unknown>;
          };
          handlerRef.current(frame.type, frame.payload ?? {});
        } catch {
          // ignore malformed
        }
      };

      socket.onclose = () => {
        if (pingTimer) clearInterval(pingTimer);
        if (closed) return;
        attempt += 1;
        const delay = Math.min(10000, 1000 * 2 ** Math.min(attempt, 4));
        retryTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closed = true;
      if (pingTimer) clearInterval(pingTimer);
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }, [token, enabled]);
}

export function sendSocket(
  socket: WebSocket | null | undefined,
  type: string,
  payload: Record<string, unknown>,
) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify({ type, payload }));
  return true;
}
