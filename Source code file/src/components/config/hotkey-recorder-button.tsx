"use client";

import { Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";

import { ChakraButtonEl } from "@/components/chakra-elements";
import {
  comboFromEvent,
  formatCombo,
  hasModifier,
  isModifierKey,
  type KeyCombo,
} from "@/lib/hotkey-combo";

export function HotkeyRecorderButton({
  value,
  onChange,
}: {
  value: KeyCombo | null;
  onChange: (combo: KeyCombo) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recording) return;

    function onKeyDown(event: KeyboardEvent) {
      event.preventDefault();
      if (isModifierKey(event.code)) return;

      const combo = comboFromEvent(event);
      if (!hasModifier(combo)) {
        setError("Include at least one modifier key (⌘ / Ctrl / Alt).");
        return;
      }

      setError(null);
      setRecording(false);
      onChange(combo);
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [recording, onChange]);

  return (
    <>
      <ChakraButtonEl
        type="button"
        onClick={() => {
          setError(null);
          setRecording(true);
        }}
        borderWidth="1px"
        borderColor={recording ? "gt.500" : "border.strong"}
        bg="bg.canvas"
        color="fg.default"
        px="14px"
        py="10px"
        fontFamily="mono"
        fontSize="12px"
        letterSpacing="0.04em"
        cursor="pointer"
        minW="140px"
        textAlign="center"
        _hover={{ borderColor: "gt.500" }}
      >
        {recording ? "Press keys…" : value ? formatCombo(value) : "Set combo"}
      </ChakraButtonEl>
      {error ? (
        <Text mt="6px" fontSize="11px" fontFamily="mono" color="gt.500">
          {error}
        </Text>
      ) : null}
    </>
  );
}
