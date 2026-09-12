import { create } from 'zustand';

export type AppNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  at: number;
  read: boolean;
  chat_id?: string;
  request_id?: string;
  from_user_id?: string;
};

type State = {
  items: AppNotification[];
  unread: number;
  push: (n: Omit<AppNotification, 'id' | 'at' | 'read'> & { id?: string }) => void;
  markAllRead: () => void;
  clear: () => void;
};

export const useNotificationStore = create<State>((set, get) => ({
  items: [],
  unread: 0,
  push(n) {
    const item: AppNotification = {
      id: n.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind: n.kind,
      title: n.title,
      body: n.body,
      at: Date.now(),
      read: false,
      chat_id: n.chat_id,
      request_id: n.request_id,
      from_user_id: n.from_user_id,
    };
    const items = [item, ...get().items].slice(0, 80);
    set({ items, unread: items.filter((x) => !x.read).length });

    // Web Notification API (если разрешено)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(item.title, { body: item.body, tag: item.id });
        } catch {
          // ignore
        }
      } else if (Notification.permission === 'default') {
        void Notification.requestPermission();
      }
    }
  },
  markAllRead() {
    set({
      items: get().items.map((x) => ({ ...x, read: true })),
      unread: 0,
    });
  },
  clear() {
    set({ items: [], unread: 0 });
  },
}));
