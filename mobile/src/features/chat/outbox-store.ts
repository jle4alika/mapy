import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { chatsApi } from '../../shared/api/endpoints';

const QUEUE_KEY = 'mapy_outbox_messages';

export type OutboxItem = {
  id: string;
  chatId: string;
  body: string;
  client_message_id: string;
  createdAt: string;
};

type OutboxState = {
  items: OutboxItem[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  enqueue: (item: Omit<OutboxItem, 'createdAt'>) => Promise<void>;
  flush: () => Promise<void>;
};

async function persist(items: OutboxItem[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export const useOutboxStore = create<OutboxState>((set, get) => ({
  items: [],
  hydrated: false,
  async hydrate() {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      set({ items: raw ? (JSON.parse(raw) as OutboxItem[]) : [], hydrated: true });
    } catch {
      set({ items: [], hydrated: true });
    }
  },
  async enqueue(item) {
    const next = [...get().items, { ...item, createdAt: new Date().toISOString() }];
    set({ items: next });
    await persist(next);
  },
  async flush() {
    const pending = [...get().items];
    if (!pending.length) return;
    const remaining: OutboxItem[] = [];
    for (const item of pending) {
      try {
        await chatsApi.send(item.chatId, item.body, item.client_message_id);
      } catch {
        remaining.push(item);
      }
    }
    set({ items: remaining });
    await persist(remaining);
  },
}));
