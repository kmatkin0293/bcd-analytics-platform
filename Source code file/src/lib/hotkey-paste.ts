function insertIntoFormField(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string,
) {
  const prototype =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const nextValue = el.value.slice(0, start) + text + el.value.slice(end);

  // Use the native setter so React's tracked value actually changes, then
  // dispatch a real "input" event so React-controlled fields notice.
  if (setter) {
    setter.call(el, nextValue);
  } else {
    el.value = nextValue;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));

  const caret = start + text.length;
  requestAnimationFrame(() => {
    el.setSelectionRange(caret, caret);
  });
}

/** Inserts text at the caret of whatever the user currently has focused. */
export function pasteIntoFocusedElement(text: string) {
  const active = document.activeElement;

  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement
  ) {
    if (active.disabled || active.readOnly) return;
    insertIntoFormField(active, text);
    return;
  }

  if (active instanceof HTMLElement && active.isContentEditable) {
    document.execCommand("insertText", false, text);
  }
}
