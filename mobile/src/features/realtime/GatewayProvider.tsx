import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { FriendLocation, Message } from '../../entities/types';
import { useSessionStore } from '../auth/session-store';
import { useNotificationStore } from '../notifications/notification-store';
import { useGatewaySocket } from '../../shared/api/ws';

type Handler = (type: string, payload: Record<string, unknown>) => void;

const GatewayCtx = createContext<{ subscribe: (h: Handler) => () => void }>({
  subscribe: () => () => undefined,
});

export function GatewayProvider({ children }: { children: React.ReactNode }) {
  const token = useSessionStore((s) => s.token);
  const qc = useQueryClient();
  const pushNotif = useNotificationStore((s) => s.push);
  const handlers = useRef(new Set<Handler>());

  const subscribe = useCallback((h: Handler) => {
    handlers.current.add(h);
    return () => {
      handlers.current.delete(h);
    };
  }, []);

  useGatewaySocket(
    useCallback(
      (type, payload) => {
        for (const h of handlers.current) {
          try {
            h(type, payload);
          } catch {
            // ignore
          }
        }

        if (type === 'friend.location') {
          const item = payload as unknown as FriendLocation;
          if (!item?.user_id) return;
          qc.setQueryData<FriendLocation[]>(['map', 'friends'], (old) => {
            if (!old) return old;
            const idx = old.findIndex((f) => f.user_id === item.user_id);
            if (idx === -1) return [...old, item];
            const next = [...old];
            next[idx] = { ...next[idx], ...item };
            return next;
          });
          void qc.invalidateQueries({ queryKey: ['map', 'activity'] });
        }

        if (type === 'message.new') {
          const msg = payload as unknown as Message;
          if (msg?.chat_id) {
          void qc.invalidateQueries({ queryKey: ['chats'] });
          void qc.invalidateQueries({ queryKey: ['chats', msg.chat_id, 'messages'] });
          }
        }

        if (type === 'friend.request') {
          void qc.invalidateQueries({ queryKey: ['friends', 'requests'] });
          void qc.invalidateQueries({ queryKey: ['friends'] });
        }

        if (type === 'notification') {
          pushNotif({
            kind: String(payload.kind ?? 'info'),
            title: String(payload.title ?? 'Mapy'),
            body: String(payload.body ?? ''),
            chat_id: payload.chat_id ? String(payload.chat_id) : undefined,
            request_id: payload.request_id ? String(payload.request_id) : undefined,
            from_user_id: payload.from_user_id ? String(payload.from_user_id) : undefined,
          });
        }
      },
      [pushNotif, qc],
    ),
    !!token,
  );

  const value = useMemo(() => ({ subscribe }), [subscribe]);
  return <GatewayCtx.Provider value={value}>{children}</GatewayCtx.Provider>;
}

export function useGatewaySubscribe(handler: Handler, enabled = true) {
  const { subscribe } = useContext(GatewayCtx);
  const ref = useRef(handler);
  ref.current = handler;
  React.useEffect(() => {
    if (!enabled) return;
    return subscribe((type, payload) => ref.current(type, payload));
  }, [subscribe, enabled]);
}
