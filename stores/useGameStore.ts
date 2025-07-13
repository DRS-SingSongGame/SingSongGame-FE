// stores/useGameStore.ts
import { create } from 'zustand';

interface GameStore {
  selectedKeywords: number[];
  setSelectedKeywords: (keywords: number[]) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  selectedKeywords: [],
  setSelectedKeywords: (keywords) => set({ selectedKeywords: keywords }),
}));
