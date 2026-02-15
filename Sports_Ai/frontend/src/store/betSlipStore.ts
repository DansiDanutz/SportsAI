import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BetSlipSelection {
  id: string;
  eventId: string;
  eventName: string;
  market: string;       // e.g. "Match Winner", "Over/Under 2.5"
  pick: string;         // e.g. "Barcelona", "Over 2.5"
  odds: number;
  bookmaker?: string;
}

type BetMode = 'single' | 'accumulator';

interface BetSlipState {
  selections: BetSlipSelection[];
  mode: BetMode;
  stake: number;
  isOpen: boolean;

  // Actions
  addSelection: (sel: BetSlipSelection) => void;
  removeSelection: (id: string) => void;
  clearAll: () => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setMode: (mode: BetMode) => void;
  setStake: (stake: number) => void;
  hasSelection: (id: string) => boolean;
}

export const useBetSlipStore = create<BetSlipState>()(
  persist(
    (set, get) => ({
      selections: [],
      mode: 'single',
      stake: 10,
      isOpen: false,

      addSelection: (sel) => {
        const existing = get().selections;
        // Don't add duplicates
        if (existing.find(s => s.id === sel.id)) return;
        // Replace same-event same-market selection
        const filtered = existing.filter(
          s => !(s.eventId === sel.eventId && s.market === sel.market)
        );
        set({ selections: [...filtered, sel], isOpen: true });
      },

      removeSelection: (id) => {
        const next = get().selections.filter(s => s.id !== id);
        set({ selections: next, isOpen: next.length > 0 });
      },

      clearAll: () => set({ selections: [], isOpen: false }),

      toggleOpen: () => set({ isOpen: !get().isOpen }),
      setOpen: (open) => set({ isOpen: open }),
      setMode: (mode) => set({ mode }),
      setStake: (stake) => set({ stake: Math.max(0, stake) }),

      hasSelection: (id) => get().selections.some(s => s.id === id),
    }),
    { name: 'betslip-storage', partialize: (s) => ({ selections: s.selections, mode: s.mode, stake: s.stake }) }
  )
);
