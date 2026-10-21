export interface KeyCombo {
  /** KeyboardEvent.code (not .key) — stays stable across layouts, e.g. Option+1 remapping .key to "¡" on macOS. */
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

const MODIFIER_CODES = new Set([
  "ControlLeft",
  "ControlRight",
  "MetaLeft",
  "MetaRight",
  "AltLeft",
  "AltRight",
  "ShiftLeft",
  "ShiftRight",
]);

export function isModifierKey(code: string): boolean {
  return MODIFIER_CODES.has(code);
}

export function comboFromEvent(event: KeyboardEvent): KeyCombo {
  return {
    code: event.code,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
  };
}

/** A hotkey must include at least one real modifier so it never collides with normal typing. */
export function hasModifier(combo: KeyCombo): boolean {
  return combo.ctrlKey || combo.metaKey || combo.altKey;
}

export function combosEqual(a: KeyCombo, b: KeyCombo): boolean {
  return (
    a.code === b.code &&
    a.ctrlKey === b.ctrlKey &&
    a.metaKey === b.metaKey &&
    a.altKey === b.altKey &&
    a.shiftKey === b.shiftKey
  );
}

function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}

const CODE_DISPLAY_OVERRIDES: Record<string, string> = {
  Digit0: "0",
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Digit4: "4",
  Digit5: "5",
  Digit6: "6",
  Digit7: "7",
  Digit8: "8",
  Digit9: "9",
  Space: "Space",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Semicolon: ";",
  Quote: "'",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Minus: "-",
  Equal: "=",
  Backquote: "`",
};

function displayCode(code: string): string {
  if (CODE_DISPLAY_OVERRIDES[code]) return CODE_DISPLAY_OVERRIDES[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}

export function formatCombo(combo: KeyCombo): string {
  const mac = isMac();
  const parts: string[] = [];
  if (combo.ctrlKey) parts.push(mac ? "⌃" : "Ctrl");
  if (combo.altKey) parts.push(mac ? "⌥" : "Alt");
  if (combo.shiftKey) parts.push(mac ? "⇧" : "Shift");
  if (combo.metaKey) parts.push(mac ? "⌘" : "Win");
  parts.push(displayCode(combo.code));
  return parts.join(mac ? "" : "+");
}

/** Combos that commonly collide with browser/OS shortcuts — a heads-up, not a block. */
const RESERVED_CODES = new Set([
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
  "Digit7",
  "Digit8",
  "Digit9",
  "KeyT",
  "KeyW",
  "KeyN",
  "KeyR",
  "KeyL",
]);

export function reservedWarning(combo: KeyCombo): string | null {
  const primaryModifierOnly = (combo.ctrlKey || combo.metaKey) && !combo.altKey;
  if (primaryModifierOnly && RESERVED_CODES.has(combo.code)) {
    return "This combo may collide with a common browser shortcut.";
  }
  return null;
}
