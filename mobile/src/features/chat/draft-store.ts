import { create } from 'zustand';

type DraftState = {
  drafts: Record<string, string>;
  setDraft: (chatId: string, text: string) => void;
  clearDraft: (chatId: string) => void;
};

export const useDraftStore = create<DraftState>((set) => ({
  drafts: {},
  setDraft: (chatId, text) =>
    set((s) => ({ drafts: { ...s.drafts, [chatId]: text } })),
  clearDraft: (chatId) =>
    set((s) => {
      const next = { ...s.drafts };
      delete next[chatId];
      return { drafts: next };
    }),
}));
