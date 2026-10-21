"use client";

import { Box, Flex, Input, Text } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { ChakraButtonEl, ChakraIframe, ChakraSvg } from "@/components/chakra-elements";
import { Portal } from "@/components/motion/portal";
import { VeraMark } from "@/components/vera/vera-mark";
import { VeraMarkdown } from "@/components/vera/vera-markdown";
import { VeraBars } from "@/components/vera-bars";
import type { VeraStreamEvent } from "@/lib/vera-protocol";
import { usePlanStore } from "@/stores/plan";

const MotionBox = motion.create(Box);
const MotionFlex = motion.create(Flex);

type VeraPart =
  | { type: "text"; id: number; text: string }
  | { type: "iframe"; id: number; url: string };
type VeraTurn = { role: "user" | "assistant"; parts: VeraPart[] };

/** Stable per-part React key, assigned once when a part is created (not derived from array position). */
let nextVeraPartId = 0;

function appendTextPart(parts: VeraPart[], text: string): VeraPart[] {
  const last = parts[parts.length - 1];
  if (last?.type === "text") {
    return [
      ...parts.slice(0, -1),
      { type: "text", id: last.id, text: last.text + text },
    ];
  }
  return [...parts, { type: "text", id: nextVeraPartId++, text }];
}

export function VeraChat({
  trigger = "inline",
}: {
  /** "inline" is the /home question box; "button" is a compact opener button. */
  trigger?: "inline" | "button";
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [turns, setTurns] = useState<VeraTurn[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const historyRef = useRef<unknown[]>([]);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const plan = usePlanStore((state) => state.plan);
  const basicQuestionsUsed = usePlanStore((state) => state.basicQuestionsUsed);
  const basicQuestionsLimit = usePlanStore((state) => state.basicQuestionsLimit);
  const consumeBasicQuestion = usePlanStore((state) => state.consumeBasicQuestion);
  const openUpgradeDialog = usePlanStore((state) => state.openUpgradeDialog);
  const limitReached = plan === "basic" && basicQuestionsUsed >= basicQuestionsLimit;

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run on every streamed update, not just values read in the body
  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns, status, error]);

  function updateLastTurn(updater: (turn: VeraTurn) => VeraTurn) {
    setTurns((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      next[next.length - 1] = updater(next[next.length - 1]);
      return next;
    });
  }

  async function ask(question: string, clearInput: () => void) {
    const trimmed = question.trim();
    if (!trimmed || pending) return;

    // Basic plan: block the request entirely once the free question is
    // used — no call to Vera's backend/MCP connection happens past this
    // point, matching "Basic has no Spotter access" once the cap is hit.
    const planState = usePlanStore.getState();
    if (planState.plan === "basic" && planState.basicQuestionsUsed >= planState.basicQuestionsLimit) {
      openUpgradeDialog();
      return;
    }
    if (planState.plan === "basic") {
      consumeBasicQuestion();
    }

    clearInput();
    setOpen(true);
    setError(null);
    setStatus(null);
    setPending(true);
    setTurns((prev) => [
      ...prev,
      {
        role: "user",
        parts: [{ type: "text", id: nextVeraPartId++, text: trimmed }],
      },
      { role: "assistant", parts: [] },
    ]);

    const requestMessages = [
      ...historyRef.current,
      { role: "user", content: trimmed },
    ];

    try {
      const response = await fetch("/api/vera/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: requestMessages }),
      });

      if (!response.ok || !response.body) {
        setError(
          response.status === 401
            ? "Your session has expired. Please sign in again."
            : "Vera couldn't reach the server. Try again.",
        );
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          newlineIndex = buffer.indexOf("\n");
          if (!line) continue;

          const event = JSON.parse(line) as VeraStreamEvent;
          if (event.type === "status") {
            setStatus(event.text);
          } else if (event.type === "thinking") {
            // "step" starts a fresh status line (a new heading from
            // ThoughtSpot); "narration" appends onto whatever's already
            // showing, so a step's narration reads as one growing sentence.
            // Narration fragments carry their own leading "\n\n"/whitespace
            // (meant for multi-paragraph text), which we collapse to a
            // single space since this all renders on one line.
            const text = event.text.replace(/\s+/g, " ");
            setStatus((prev) =>
              event.kind === "step" || !prev ? text.trim() : prev + text,
            );
          } else if (event.type === "text") {
            setStatus(null);
            updateLastTurn((turn) => ({
              ...turn,
              parts: appendTextPart(turn.parts, event.text),
            }));
          } else if (event.type === "iframe") {
            setStatus(null);
            updateLastTurn((turn) => ({
              ...turn,
              parts: [
                ...turn.parts,
                { type: "iframe", id: nextVeraPartId++, url: event.url },
              ],
            }));
          } else if (event.type === "done") {
            historyRef.current = event.messages;
          } else if (event.type === "error") {
            setError(event.message);
          }
        }
      }
    } catch {
      setError("Vera couldn't reach the server. Try again.");
    } finally {
      setPending(false);
      setStatus(null);
    }
  }

  function openChat() {
    if (limitReached) {
      openUpgradeDialog();
      return;
    }
    setOpen(true);
  }

  return (
    <>
      {trigger === "inline" ? (
        <Box
          mt={{ base: "24px", md: "34px" }}
          bg="bg.surface"
          borderWidth="1px"
          borderColor="fg.default"
          borderTopWidth="3px"
          borderTopColor="gt.500"
          borderRadius="12px"
          overflow="hidden"
          transition="box-shadow 0.2s, border-color 0.3s, background-color 0.3s"
          _hover={{ boxShadow: "0 10px 30px -10px rgba(75,40,130,0.25)" }}
          onClick={() => {
            if (limitReached) openUpgradeDialog();
          }}
        >
          <Flex
            align="center"
            gap="10px"
            px="18px"
            py="14px"
            borderBottomWidth="1px"
            borderColor="border.tint"
          >
            <VeraMark size={20} spinning={pending} />
            <Text
              fontFamily="mono"
              fontSize="11.5px"
              letterSpacing="0.14em"
              textTransform="uppercase"
              color="fg.default"
            >
              Ask Vera
            </Text>
          </Flex>

          <Flex
            as="form"
            onSubmit={(event) => {
              event.preventDefault();
              ask(draft, () => setDraft(""));
            }}
            wrap="wrap"
            gap="14px"
            align="center"
            px={{ base: "18px", md: "26px" }}
            pt={{ base: "18px", md: "26px" }}
            pb={{ base: "20px", md: "24px" }}
          >
            <Input
              flex="1 1 260px"
              minW={0}
              variant="flushed"
              placeholder="Which regions have the widest discount deviation this quarter?"
              fontSize={{ base: "18px", md: "24px" }}
              letterSpacing="-0.02em"
              color="fg.default"
              border="none"
              px={0}
              value={draft}
              disabled={limitReached}
              onChange={(event) => setDraft(event.target.value)}
              _focus={{ boxShadow: "none" }}
            />
            <ChakraButtonEl
              type="submit"
              disabled={limitReached}
              flexShrink={0}
              bg="gt.500"
              color="white"
              px="20px"
              py="14px"
              borderRadius="8px"
              fontFamily="mono"
              fontSize="12.5px"
              letterSpacing="0.08em"
              textTransform="uppercase"
              cursor="pointer"
              transition="background-color 0.2s, transform 0.15s, box-shadow 0.2s"
              _hover={{ bg: "gtDark", boxShadow: "0 8px 20px -6px rgba(75,40,130,0.45)" }}
              _active={{ transform: "scale(0.96)" }}
              _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
            >
              Ask Vera →
            </ChakraButtonEl>
          </Flex>
        </Box>
      ) : (
        <ChakraButtonEl
          type="button"
          onClick={openChat}
          display="flex"
          alignItems="center"
          gap="10px"
          marginLeft="auto"
          borderWidth="1px"
          borderColor="fg.default"
          borderRadius="8px"
          bg="gt.500"
          color="white"
          px="16px"
          py="10px"
          fontFamily="mono"
          fontSize="12px"
          letterSpacing="0.06em"
          textTransform="uppercase"
          cursor="pointer"
          transition="background-color 0.2s, transform 0.15s, box-shadow 0.2s"
          _hover={{ bg: "gtDark", boxShadow: "0 8px 20px -6px rgba(75,40,130,0.45)", transform: "translateY(-1px)" }}
          _active={{ transform: "scale(0.96)" }}
        >
          <VeraMark size={16} spinning={false} />
          Ask Vera
        </ChakraButtonEl>
      )}

      <Portal>
      <AnimatePresence>
      {open ? (
        <Box key="vera-overlay" position="fixed" inset={0} zIndex={60}>
          {/* Blur lives on its own non-transformed layer — see the identical
              comment in upgrade-dialog.tsx for why this avoids a Chromium
              compositing bug where a transformed descendant of a
              backdrop-filter element renders see-through. */}
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            position="absolute"
            inset={0}
            bg="rgba(20, 26, 36, 0.58)"
            backdropFilter="blur(3px)"
            onClick={() => setOpen(false)}
          />
          <Flex
            position="absolute"
            inset={0}
            align="center"
            justify="center"
            p={{ base: "14px", md: "48px" }}
            onClick={() => setOpen(false)}
          >
          <MotionFlex
            // See upgrade-dialog.tsx: not animating `opacity` on this card
            // avoids making its own solid background translucent
            // mid-transition, which would let the blurred page bleed
            // through underneath it.
            initial={{ y: 16, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 8, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            direction="column"
            onClick={(event) => event.stopPropagation()}
            w="100%"
            maxW="680px"
            maxH="100%"
            bg="bg.surface"
            borderWidth="1px"
            borderColor="fg.default"
            borderTopWidth="3px"
            borderTopColor="gt.500"
            borderRadius="12px"
            overflow="hidden"
            isolation="isolate"
            boxShadow="0 30px 70px rgba(20, 26, 36, 0.3)"
          >
            <Flex
              align="center"
              justify="space-between"
              gap="14px"
              px="20px"
              py="14px"
              borderBottomWidth="1px"
              borderColor="border.tint"
              flexShrink={0}
            >
              <Flex align="center" gap="10px">
                <VeraMark size={20} spinning={pending} />
                <Text
                  fontFamily="mono"
                  fontSize="11.5px"
                  letterSpacing="0.14em"
                  textTransform="uppercase"
                  color="fg.default"
                >
                  Vera
                </Text>
              </Flex>
              <ChakraButtonEl
                type="button"
                onClick={() => setOpen(false)}
                borderWidth="1px"
                borderColor="border.strong"
                borderRadius="7px"
                color="fg.subtle"
                w="30px"
                h="30px"
                fontSize="15px"
                lineHeight="1"
                cursor="pointer"
                bg="transparent"
                transition="border-color 0.2s, color 0.2s, transform 0.15s"
                _hover={{ borderColor: "fg.default", color: "fg.default", transform: "rotate(90deg)" }}
              >
                ×
              </ChakraButtonEl>
            </Flex>

            <Flex
              ref={transcriptRef}
              direction="column"
              gap="18px"
              p={{ base: "16px", md: "24px" }}
              overflowY="auto"
              flex="1"
            >
              {turns.length === 0 ? (
                <Text fontSize="14px" color="fg.muted">
                  Ask a question about pricing, quotes, margin, or compliance
                  risk across your portfolio.
                </Text>
              ) : null}

              {turns.map((turn, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: turns are append-only for the life of this conversation
                <Box key={index}>
                  {turn.role === "user" ? (
                    <Box>
                      <Text
                        fontFamily="mono"
                        fontSize="11px"
                        letterSpacing="0.1em"
                        textTransform="uppercase"
                        color="fg.muted"
                        mb="4px"
                      >
                        You
                      </Text>
                      <Text
                        fontSize="16px"
                        fontWeight="600"
                        letterSpacing="-0.01em"
                      >
                        {turn.parts
                          .map((part) =>
                            part.type === "text" ? part.text : "",
                          )
                          .join("")}
                      </Text>
                    </Box>
                  ) : (
                    <Box>
                      <Text
                        fontFamily="mono"
                        fontSize="11px"
                        letterSpacing="0.1em"
                        textTransform="uppercase"
                        color="fg.muted"
                        mb="4px"
                      >
                        Vera
                      </Text>
                      {turn.parts.length === 0 &&
                      !(pending && index === turns.length - 1) ? null : (
                        <Flex direction="column" gap="14px">
                          {turn.parts.map((part) => {
                            if (part.type === "text") {
                              return (
                                <VeraMarkdown key={part.id} text={part.text} />
                              );
                            }
                            return (
                              <ChakraIframe
                                key={part.id}
                                src={part.url}
                                title="Vera visualization"
                                w="100%"
                                minH="600px"
                                borderWidth="1px"
                                borderColor="border.default"
                                borderRadius="8px"
                              />
                            );
                          })}
                          {/* Kept visible alongside already-rendered parts, not
                              just before the first one — the answer can still
                              pause mid-stream (more text, or a trailing tool
                              call), and without this a mid-stream pause reads
                              as "done" instead of "still working". */}
                          {pending && index === turns.length - 1 ? (
                            <Flex align="center" gap="10px">
                              <VeraBars
                                barWidth="2px"
                                height="14px"
                                gap="2px"
                              />
                              <VeraMarkdown
                                text={status ?? "Thinking…"}
                                fontFamily="mono"
                                fontSize="12px"
                                lineHeight="1.4"
                                color="fg.muted"
                              />
                            </Flex>
                          ) : null}
                        </Flex>
                      )}
                    </Box>
                  )}
                </Box>
              ))}

              {error ? (
                <Flex
                  align="center"
                  gap="10px"
                  borderWidth="1px"
                  borderColor="gt.500"
                  borderRadius="8px"
                  bg="gt.50"
                  color="gt.700"
                  px="14px"
                  py="12px"
                  fontFamily="mono"
                  fontSize="12px"
                >
                  {error}
                </Flex>
              ) : null}
            </Flex>

            {plan === "basic" ? (
              <Box
                bg="bg.canvas"
                borderTopWidth="1px"
                borderColor="border.tint"
                px={{ base: "16px", md: "20px" }}
                py="14px"
                flexShrink={0}
              >
                <Flex
                  justify="space-between"
                  align="baseline"
                  gap="10px"
                  fontFamily="mono"
                  fontSize="11px"
                  letterSpacing="0.1em"
                  textTransform="uppercase"
                  color="fg.subtle"
                >
                  <Text>Basic plan · free questions</Text>
                  <Text color="fg.default">
                    {basicQuestionsUsed} of {basicQuestionsLimit}
                  </Text>
                </Flex>
                <Box
                  h="9px"
                  bg="border.tint"
                  mt="10px"
                  position="relative"
                  overflow="hidden"
                  borderRadius="full"
                >
                  <Box
                    position="absolute"
                    top={0}
                    bottom={0}
                    left={0}
                    bg="gtDark"
                    borderRadius="full"
                    transition="width 0.4s cubic-bezier(0.16,1,0.3,1)"
                    w={`${basicQuestionsLimit > 0 ? Math.min(100, (basicQuestionsUsed / basicQuestionsLimit) * 100) : 100}%`}
                  />
                </Box>
                <Flex justify="space-between" align="baseline" mt="9px" gap="10px">
                  <Text fontFamily="mono" fontSize="11px" color="fg.muted">
                    {Math.max(0, basicQuestionsLimit - basicQuestionsUsed)} free
                    question{basicQuestionsLimit - basicQuestionsUsed === 1 ? "" : "s"} left
                  </Text>
                  <ChakraButtonEl
                    type="button"
                    onClick={openUpgradeDialog}
                    fontFamily="mono"
                    fontSize="11px"
                    letterSpacing="0.06em"
                    textTransform="uppercase"
                    color="gt.500"
                    bg="transparent"
                    cursor="pointer"
                    borderBottomWidth="1px"
                    borderColor="gt.500"
                    transition="color 0.2s, border-color 0.2s"
                    _hover={{ color: "gtDark", borderColor: "gtDark" }}
                  >
                    Upgrade to Premium
                  </ChakraButtonEl>
                </Flex>
              </Box>
            ) : (
              <Flex
                align="center"
                gap="8px"
                bg="bg.canvas"
                borderTopWidth="1px"
                borderColor="border.tint"
                px={{ base: "16px", md: "20px" }}
                py="10px"
                flexShrink={0}
                fontFamily="mono"
                fontSize="10.5px"
                letterSpacing="0.08em"
                textTransform="uppercase"
                color="gt.500"
              >
                <ChakraSvg viewBox="0 0 20 20" w="11px" h="11px" fill="none">
                  <path
                    d="M3 7l3 2 4-6 4 6 3-2-1.4 8.4a1 1 0 01-1 .83H5.4a1 1 0 01-1-.83L3 7z"
                    fill="currentColor"
                  />
                </ChakraSvg>
                Premium · Unlimited questions
              </Flex>
            )}

            <Flex
              as="form"
              onSubmit={(event) => {
                event.preventDefault();
                ask(followUp, () => setFollowUp(""));
              }}
              gap="10px"
              align="center"
              px={{ base: "16px", md: "20px" }}
              py="14px"
              borderTopWidth="1px"
              borderColor="border.tint"
              flexShrink={0}
            >
              <Input
                flex="1"
                minW={0}
                placeholder="Ask a follow-up…"
                value={followUp}
                disabled={pending || limitReached}
                onChange={(event) => setFollowUp(event.target.value)}
                bg="bg.canvas"
                borderColor="border.strong"
                borderRadius="8px"
                px="12px"
                py="10px"
                h="auto"
                fontSize="14px"
                transition="border-color 0.2s, box-shadow 0.2s"
                _focus={{ borderColor: "gt.500", boxShadow: "0 0 0 3px rgba(75,40,130,0.15)" }}
              />
              <ChakraButtonEl
                type="submit"
                disabled={pending || limitReached}
                flexShrink={0}
                bg="gt.500"
                color="white"
                px="16px"
                py="10px"
                borderRadius="8px"
                fontFamily="mono"
                fontSize="12px"
                letterSpacing="0.06em"
                textTransform="uppercase"
                cursor="pointer"
                transition="background-color 0.2s, transform 0.15s"
                _hover={{ bg: "gtDark" }}
                _active={{ transform: "scale(0.96)" }}
                _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
              >
                Send
              </ChakraButtonEl>
            </Flex>
          </MotionFlex>
          </Flex>
        </Box>
      ) : null}
      </AnimatePresence>
      </Portal>
    </>
  );
}
