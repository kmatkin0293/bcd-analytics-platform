"use client";

import { useEffect } from "react";

import { comboFromEvent, combosEqual, isModifierKey } from "@/lib/hotkey-combo";
import { pasteIntoFocusedElement } from "@/lib/hotkey-paste";
import { useHotkeysStore } from "@/stores/hotkeys";

/**
 * Renders nothing. Watches every keydown (capture phase, so it wins over a
 * focused field's own handling) and, on a match against a saved hotkey,
 * pastes that hotkey's phrase into whatever is currently focused. Configured
 * on the unlinked /config page.
 */
export function HotkeyListener() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isModifierKey(event.code)) return;

      const combo = comboFromEvent(event);
      const match = useHotkeysStore
        .getState()
        .hotkeys.find((hotkey) => combosEqual(hotkey.combo, combo));
      if (!match) return;

      event.preventDefault();
      navigator.clipboard?.writeText(match.phrase).catch(() => {});
      pasteIntoFocusedElement(match.phrase);
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return null;
}
