import { create } from 'zustand';

import { describeError, type FormattedError } from '../../shared/api/errors';

export type ToastKind = 'error' | 'info' | 'success';

export type ToastItem = {
  id: string;
  kind: ToastKind;
  title: string;
  message: string;
  createdAt: number;
};

type ToastState = {
  items: ToastItem[];
  push: (input: { kind?: ToastKind; title: string; message: string }) => void;
  pushError: (error: unknown, fallbackTitle?: string) => void;
  dismiss: (id: string) => void;
  clear: () => void;
};

const DEDUPE_MS = 3500;
let lastKey = '';
let lastAt = 0;

function makeId() {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: ({ kind = 'info', title, message }) => {
    const key = `${kind}:${title}:${message}`;
    const now = Date.now();
    if (key === lastKey && now - lastAt < DEDUPE_MS) return;
    lastKey = key;
    lastAt = now;

    const item: ToastItem = {
      id: makeId(),
      kind,
      title,
      message,
      createdAt: now,
    };
    set({ items: [...get().items.slice(-4), item] });
  },
  pushError: (error, fallbackTitle) => {
    const desc: FormattedError = describeError(error);
    get().push({
      kind: 'error',
      title: fallbackTitle || desc.title,
      message: desc.message,
    });
  },
  dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
  clear: () => set({ items: [] }),
}));

export function showError(error: unknown, title?: string) {
  useToastStore.getState().pushError(error, title);
}

export function showToast(title: string, message: string, kind: ToastKind = 'info') {
  useToastStore.getState().push({ kind, title, message });
}
