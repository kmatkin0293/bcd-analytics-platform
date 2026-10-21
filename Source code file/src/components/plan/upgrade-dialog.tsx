"use client";

import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { ChakraButtonEl, ChakraSvg } from "@/components/chakra-elements";
import { Portal } from "@/components/motion/portal";
import { usePlanStore } from "@/stores/plan";

const MotionBox = motion.create(Box);

type Stage = "pitch" | "processing" | "success";

const FEATURES: { label: string; basic: boolean | string; premium: boolean | string }[] = [
  { label: "All liveboards", basic: true, premium: true },
  { label: "Vera questions", basic: "1 free", premium: "Unlimited" },
  { label: "Risk & compliance map", basic: true, premium: true },
  { label: "Governance & M&A detail", basic: true, premium: true },
  { label: "Advisory, Tax & Audit agents", basic: false, premium: true },
  { label: "Agentic apps on every page", basic: false, premium: true },
  { label: "Priority insight refresh", basic: false, premium: true },
];

function FeatureMark({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return (
      <Text fontFamily="mono" fontSize="12px" fontWeight="600" color="inherit">
        {value}
      </Text>
    );
  }
  if (!value) {
    return (
      <ChakraSvg viewBox="0 0 16 16" w="13px" h="13px" fill="none" opacity={0.4}>
        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </ChakraSvg>
    );
  }
  return (
    <ChakraSvg viewBox="0 0 16 16" w="14px" h="14px" fill="none">
      <path
        d="M3 8.5l3.2 3.2L13 4.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </ChakraSvg>
  );
}

export function UpgradeDialog() {
  const open = usePlanStore((state) => state.upgradeDialogOpen);
  const plan = usePlanStore((state) => state.plan);
  const close = usePlanStore((state) => state.closeUpgradeDialog);
  const upgradeToPremium = usePlanStore((state) => state.upgradeToPremium);
  const [stage, setStage] = useState<Stage>("pitch");

  // Reset to the pitch view each time the dialog is freshly opened.
  useEffect(() => {
    if (open) setStage("pitch");
  }, [open]);

  function handleUpgrade() {
    setStage("processing");
    window.setTimeout(() => {
      setStage("success");
      upgradeToPremium();
      window.setTimeout(() => close(), 1500);
    }, 1200);
  }

  if (plan === "premium") return null;

  return (
    <Portal>
    <AnimatePresence>
      {open ? (
        <Box
          key="upgrade-overlay"
          position="fixed"
          inset={0}
          zIndex={80}
        >
          {/* Backdrop blur/dim lives on its own non-transformed layer — a
              transformed descendant (the animated card below) directly
              under an element with backdrop-filter is a known Chromium
              compositing bug where the card renders see-through to
              whatever's behind the overlay. Keeping blur and transform on
              separate siblings avoids it entirely. */}
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            position="absolute"
            inset={0}
            bg="rgba(20, 26, 36, 0.6)"
            backdropFilter="blur(4px)"
            onClick={() => {
              if (stage !== "processing") close();
            }}
          />
          <Flex
            position="absolute"
            inset={0}
            align="center"
            justify="center"
            p={{ base: "14px", md: "48px" }}
            onClick={() => {
              if (stage !== "processing") close();
            }}
          >
          <MotionBox
            // Deliberately not animating `opacity` here: opacity applies to
            // the whole element's paint, including its own solid
            // background-color — animating it from 0 made this card
            // genuinely translucent for the ~300ms of the transition,
            // letting the blurred page behind it show straight through.
            // Scale + translate alone still reads as a confident "pop in"
            // without ever making the card's background anything less
            // than fully opaque.
            initial={{ y: 20, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 10, scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(event) => event.stopPropagation()}
            w="100%"
            maxW="460px"
            bg="bg.surface"
            borderWidth="1px"
            borderColor="fg.default"
            borderRadius="16px"
            overflow="hidden"
            position="relative"
            isolation="isolate"
            boxShadow="0 40px 90px rgba(20, 26, 36, 0.35)"
          >
            {/* Animated gradient crown of the card */}
            <Box
              h="4px"
              bgGradient="to-r"
              gradientFrom="gt.300"
              gradientVia="gt.500"
              gradientTo="gt.700"
              backgroundSize="200% 100%"
              animation="shimmer 3s linear infinite"
            />

            <AnimatePresence mode="wait">
              {stage === "pitch" ? (
                <motion.div
                  key="pitch"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Box p={{ base: "24px", md: "28px" }}>
                    <Flex justify="space-between" align="flex-start">
                      <Box>
                        <Flex align="center" gap="8px">
                          <ChakraSvg viewBox="0 0 20 20" w="16px" h="16px" fill="none">
                            <path
                              d="M3 7l3 2 4-6 4 6 3-2-1.4 8.4a1 1 0 01-1 .83H5.4a1 1 0 01-1-.83L3 7z"
                              fill="currentColor"
                            />
                          </ChakraSvg>
                          <Text
                            fontFamily="mono"
                            fontSize="11px"
                            letterSpacing="0.14em"
                            textTransform="uppercase"
                            color="gt.500"
                          >
                            Upgrade
                          </Text>
                        </Flex>
                        <Heading
                          as="h2"
                          mt="8px"
                          fontSize="24px"
                          letterSpacing="-0.025em"
                          fontWeight="800"
                          color="fg.default"
                        >
                          Go Premium with Vera
                        </Heading>
                        <Text mt="8px" fontSize="13.5px" color="fg.body" maxW="34ch">
                          Unlock unlimited Vera questions, the Advisory, Tax
                          &amp; Audit agents, and agentic apps on every page —
                          instantly.
                        </Text>
                      </Box>
                      <ChakraButtonEl
                        type="button"
                        onClick={close}
                        flexShrink={0}
                        borderWidth="1px"
                        borderColor="border.strong"
                        borderRadius="7px"
                        color="fg.subtle"
                        w="28px"
                        h="28px"
                        fontSize="14px"
                        lineHeight="1"
                        cursor="pointer"
                        bg="transparent"
                        transition="border-color 0.2s, color 0.2s, transform 0.15s"
                        _hover={{ borderColor: "fg.default", color: "fg.default", transform: "rotate(90deg)" }}
                      >
                        ×
                      </ChakraButtonEl>
                    </Flex>

                    <Box
                      mt="22px"
                      borderWidth="1px"
                      borderColor="border.default"
                      borderRadius="10px"
                      overflow="hidden"
                    >
                      <Flex
                        bg="bg.canvas"
                        fontFamily="mono"
                        fontSize="10.5px"
                        letterSpacing="0.08em"
                        textTransform="uppercase"
                        color="fg.muted"
                        borderBottomWidth="1px"
                        borderColor="border.default"
                      >
                        <Box flex="1.3" px="12px" py="9px" />
                        <Box flex="1" px="10px" py="9px" textAlign="center">
                          Basic
                        </Box>
                        <Box
                          flex="1"
                          px="10px"
                          py="9px"
                          textAlign="center"
                          bg="gt.50"
                          color="gt.700"
                          fontWeight="700"
                        >
                          Premium
                        </Box>
                      </Flex>
                      {FEATURES.map((feature, i) => (
                        <Flex
                          key={feature.label}
                          borderTopWidth={i === 0 ? 0 : "1px"}
                          borderColor="border.tint"
                          fontSize="12.5px"
                          align="center"
                        >
                          <Text flex="1.3" px="12px" py="9px" color="fg.default">
                            {feature.label}
                          </Text>
                          <Flex flex="1" px="10px" py="9px" justify="center" color="fg.muted">
                            <FeatureMark value={feature.basic} />
                          </Flex>
                          <Flex
                            flex="1"
                            px="10px"
                            py="9px"
                            justify="center"
                            bg="gt.50"
                            color="gt.700"
                          >
                            <FeatureMark value={feature.premium} />
                          </Flex>
                        </Flex>
                      ))}
                    </Box>

                    <Flex direction="column" gap="10px" mt="22px">
                      <ChakraButtonEl
                        type="button"
                        onClick={handleUpgrade}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        gap="8px"
                        bg="gt.500"
                        color="white"
                        px="18px"
                        py="13px"
                        borderRadius="9px"
                        fontFamily="mono"
                        fontSize="12.5px"
                        fontWeight="700"
                        letterSpacing="0.06em"
                        textTransform="uppercase"
                        cursor="pointer"
                        transition="background-color 0.2s, transform 0.15s, box-shadow 0.2s"
                        _hover={{ bg: "gtDark", boxShadow: "0 10px 28px -8px rgba(75,40,130,0.5)" }}
                        _active={{ transform: "scale(0.97)" }}
                      >
                        Upgrade to Premium — instant
                      </ChakraButtonEl>
                      <ChakraButtonEl
                        type="button"
                        onClick={close}
                        bg="transparent"
                        color="fg.subtle"
                        px="18px"
                        py="10px"
                        fontFamily="mono"
                        fontSize="11.5px"
                        letterSpacing="0.06em"
                        textTransform="uppercase"
                        cursor="pointer"
                        transition="color 0.2s"
                        _hover={{ color: "fg.default" }}
                      >
                        Maybe later
                      </ChakraButtonEl>
                    </Flex>
                  </Box>
                </motion.div>
              ) : stage === "processing" ? (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    gap="18px"
                    py="64px"
                    px="28px"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        border: "3px solid rgba(75,40,130,0.15)",
                        borderTopColor: "#4B2882",
                      }}
                    />
                    <Text
                      fontFamily="mono"
                      fontSize="12px"
                      letterSpacing="0.1em"
                      textTransform="uppercase"
                      color="fg.muted"
                    >
                      Processing your upgrade…
                    </Text>
                  </Flex>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    gap="14px"
                    py="56px"
                    px="28px"
                  >
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 16 }}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        background: "#4B2882",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ChakraSvg viewBox="0 0 24 24" w="24px" h="24px" fill="none">
                        <path
                          d="M5 12.5l4.5 4.5L19 7"
                          stroke="white"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </ChakraSvg>
                    </motion.div>
                    <Heading as="h3" fontSize="20px" fontWeight="800" color="fg.default">
                      You're on Premium
                    </Heading>
                    <Text fontSize="13px" color="fg.muted" textAlign="center" maxW="30ch">
                      Unlimited Vera questions, every agent, and agentic apps
                      — all unlocked instantly.
                    </Text>
                  </Flex>
                </motion.div>
              )}
            </AnimatePresence>
          </MotionBox>
          </Flex>
        </Box>
      ) : null}
    </AnimatePresence>
    </Portal>
  );
}
