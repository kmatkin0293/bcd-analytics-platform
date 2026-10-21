import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type { KeyCombo } from "@/lib/hotkey-combo";

export interface SavedHotkey {
  id: string;
  combo: KeyCombo;
  phrase: string;
}

type State = {
  hotkeys: SavedHotkey[];
};

type Actions = {
  addHotkey: (combo: KeyCombo, phrase: string) => void;
  updateHotkey: (id: string, combo: KeyCombo, phrase: string) => void;
  removeHotkey: (id: string) => void;
};

export const useHotkeysStore = create<State & Actions>()(
  persist(
    immer((set) => ({
      hotkeys: [],
      addHotkey: (combo, phrase) =>
        set((state) => {
          state.hotkeys.push({ id: crypto.randomUUID(), combo, phrase });
        }),
      updateHotkey: (id, combo, phrase) =>
        set((state) => {
          const entry = state.hotkeys.find((h) => h.id === id);
          if (entry) {
            entry.combo = combo;
            entry.phrase = phrase;
          }
        }),
      removeHotkey: (id) =>
        set((state) => {
          state.hotkeys = state.hotkeys.filter((h) => h.id !== id);
        }),
    })),
    { name: "cohortline-hotkeys" },
  ),
);
