"use client";

import { Box, Flex, Text, Textarea } from "@chakra-ui/react";
import { useState } from "react";

import { ChakraButtonEl } from "@/components/chakra-elements";
import { HotkeyRecorderButton } from "@/components/config/hotkey-recorder-button";
import {
  combosEqual,
  formatCombo,
  type KeyCombo,
  reservedWarning,
} from "@/lib/hotkey-combo";
import { type SavedHotkey, useHotkeysStore } from "@/stores/hotkeys";

export function HotkeysConfig() {
  const hotkeys = useHotkeysStore((state) => state.hotkeys);
  const addHotkey = useHotkeysStore((state) => state.addHotkey);
  const updateHotkey = useHotkeysStore((state) => state.updateHotkey);
  const removeHotkey = useHotkeysStore((state) => state.removeHotkey);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draftCombo, setDraftCombo] = useState<KeyCombo | null>(null);
  const [draftPhrase, setDraftPhrase] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = isAdding || editingId !== null;

  function startAdding() {
    setEditingId(null);
    setIsAdding(true);
    setDraftCombo(null);
    setDraftPhrase("");
    setFormError(null);
  }

  function startEditing(hotkey: SavedHotkey) {
    setIsAdding(false);
    setEditingId(hotkey.id);
    setDraftCombo(hotkey.combo);
    setDraftPhrase(hotkey.phrase);
    setFormError(null);
  }

  function cancelForm() {
    setIsAdding(false);
    setEditingId(null);
    setDraftCombo(null);
    setDraftPhrase("");
    setFormError(null);
  }

  function saveForm() {
    if (!draftCombo) {
      setFormError("Record a key combo first.");
      return;
    }
    if (!draftPhrase.trim()) {
      setFormError("Enter the phrase this hotkey should type.");
      return;
    }
    const duplicate = hotkeys.find(
      (h) => h.id !== editingId && combosEqual(h.combo, draftCombo),
    );
    if (duplicate) {
      setFormError(
        `${formatCombo(draftCombo)} is already used by another hotkey.`,
      );
      return;
    }

    if (editingId) {
      updateHotkey(editingId, draftCombo, draftPhrase.trim());
    } else {
      addHotkey(draftCombo, draftPhrase.trim());
    }
    cancelForm();
  }

  return (
    <Box>
      <Flex justify="space-between" align="baseline" gap="12px">
        <Text
          fontFamily="mono"
          fontSize="11px"
          letterSpacing="0.12em"
          textTransform="uppercase"
          color="fg.muted"
        >
          Hotkeys
        </Text>
        {!isEditing ? (
          <ChakraButtonEl
            type="button"
            onClick={startAdding}
            fontFamily="mono"
            fontSize="11px"
            letterSpacing="0.06em"
            textTransform="uppercase"
            color="gt.500"
            cursor="pointer"
            bg="transparent"
            _hover={{ color: "gtDark" }}
          >
            + Add hotkey
          </ChakraButtonEl>
        ) : null}
      </Flex>
      <Text mt="6px" fontSize="13px" color="fg.subtle">
        Press a saved combo anywhere in the app to paste its phrase into
        whatever field is focused.
      </Text>

      <Flex direction="column" gap="1px" bg="border.tint" mt="16px">
        {hotkeys.length === 0 && !isAdding ? (
          <Box bg="bg.surface" px="14px" py="14px">
            <Text fontSize="13px" color="fg.muted">
              No hotkeys yet.
            </Text>
          </Box>
        ) : null}

        {hotkeys.map((hotkey) =>
          editingId === hotkey.id ? (
            <HotkeyForm
              key={hotkey.id}
              combo={draftCombo}
              phrase={draftPhrase}
              error={formError}
              onComboChange={setDraftCombo}
              onPhraseChange={setDraftPhrase}
              onSave={saveForm}
              onCancel={cancelForm}
            />
          ) : (
            <Flex
              key={hotkey.id}
              bg="bg.surface"
              px="14px"
              py="12px"
              align="center"
              gap="14px"
              wrap="wrap"
            >
              <Text
                flexShrink={0}
                fontFamily="mono"
                fontSize="12px"
                borderWidth="1px"
                borderColor="border.strong"
                bg="bg.canvas"
                px="8px"
                py="4px"
              >
                {formatCombo(hotkey.combo)}
              </Text>
              <Text
                flex="1"
                minW="120px"
                fontSize="13px"
                color="fg.default"
                overflow="hidden"
                whiteSpace="nowrap"
                textOverflow="ellipsis"
              >
                {hotkey.phrase}
              </Text>
              <Flex gap="12px" flexShrink={0}>
                <ChakraButtonEl
                  type="button"
                  onClick={() => startEditing(hotkey)}
                  fontFamily="mono"
                  fontSize="11px"
                  letterSpacing="0.06em"
                  textTransform="uppercase"
                  color="fg.subtle"
                  cursor="pointer"
                  bg="transparent"
                  _hover={{ color: "fg.default" }}
                >
                  Edit
                </ChakraButtonEl>
                <ChakraButtonEl
                  type="button"
                  onClick={() => removeHotkey(hotkey.id)}
                  fontFamily="mono"
                  fontSize="11px"
                  letterSpacing="0.06em"
                  textTransform="uppercase"
                  color="gt.500"
                  cursor="pointer"
                  bg="transparent"
                  _hover={{ color: "gtDark" }}
                >
                  Delete
                </ChakraButtonEl>
              </Flex>
            </Flex>
          ),
        )}

        {isAdding ? (
          <HotkeyForm
            combo={draftCombo}
            phrase={draftPhrase}
            error={formError}
            onComboChange={setDraftCombo}
            onPhraseChange={setDraftPhrase}
            onSave={saveForm}
            onCancel={cancelForm}
          />
        ) : null}
      </Flex>
    </Box>
  );
}

function HotkeyForm({
  combo,
  phrase,
  error,
  onComboChange,
  onPhraseChange,
  onSave,
  onCancel,
}: {
  combo: KeyCombo | null;
  phrase: string;
  error: string | null;
  onComboChange: (combo: KeyCombo) => void;
  onPhraseChange: (phrase: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const warning = combo ? reservedWarning(combo) : null;

  return (
    <Box bg="bg.surface" px="14px" py="14px">
      <Flex gap="12px" align="start" wrap="wrap">
        <HotkeyRecorderButton value={combo} onChange={onComboChange} />
        <Textarea
          flex="1"
          minW="200px"
          placeholder="Phrase to type when this combo is pressed…"
          value={phrase}
          onChange={(event) => onPhraseChange(event.target.value)}
          bg="bg.canvas"
          borderColor="border.strong"
          borderRadius={0}
          fontSize="13px"
          rows={2}
        />
      </Flex>
      {warning ? (
        <Text mt="8px" fontSize="11px" fontFamily="mono" color="fg.muted">
          {warning}
        </Text>
      ) : null}
      {error ? (
        <Text mt="8px" fontSize="12px" color="gt.500">
          {error}
        </Text>
      ) : null}
      <Flex gap="10px" mt="12px">
        <ChakraButtonEl
          type="button"
          onClick={onSave}
          bg="gt.500"
          color="white"
          px="14px"
          py="8px"
          fontFamily="mono"
          fontSize="11.5px"
          letterSpacing="0.06em"
          textTransform="uppercase"
          cursor="pointer"
          _hover={{ bg: "gtDark" }}
        >
          Save
        </ChakraButtonEl>
        <ChakraButtonEl
          type="button"
          onClick={onCancel}
          borderWidth="1px"
          borderColor="border.strong"
          color="fg.subtle"
          px="14px"
          py="8px"
          fontFamily="mono"
          fontSize="11.5px"
          letterSpacing="0.06em"
          textTransform="uppercase"
          cursor="pointer"
          bg="transparent"
          _hover={{ borderColor: "fg.default", color: "fg.default" }}
        >
          Cancel
        </ChakraButtonEl>
      </Flex>
    </Box>
  );
}
