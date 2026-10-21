"use client";

import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef } from "react";

import { ChakraButtonEl, ChakraSvg } from "@/components/chakra-elements";
import { Portal } from "@/components/motion/portal";
import { VeraMark } from "@/components/vera/vera-mark";

const MotionBox = motion.create(Box);

/** Centers a popup window on the current screen, sized to a comfortable agent-console footprint. */
function openCenteredPopup(url: string, title: string, popupRef: { current: Window | null }) {
  const width = 1024;
  const height = 768;
  const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
  const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));
  const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`;

  const popup = window.open(url, title, features);
  if (!popup) {
    // Popup blocked — fall back to a normal new tab so the agent still opens.
    window.open(url, "_blank");
    return;
  }
  popupRef.current = popup;
  popup.focus();
}

/**
 * Launches an external ThoughtSpot agent in its own centered popup window,
 * then leaves this confirmation card behind in the main window so the user
 * can get back to the dashboard or reopen the agent if they closed it.
 */
export function AgentLaunchModal({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const popupRef = useRef<Window | null>(null);

  const launch = useCallback(() => {
    openCenteredPopup(url, title, popupRef);
  }, [url, title]);

  // Launch immediately on mount — the confirmation card is what's left
  // behind here, not a "click to launch" step.
  useEffect(() => {
    launch();
  }, [launch]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <Portal>
        <Box position="fixed" inset={0} zIndex={90}>
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            position="absolute"
            inset={0}
            bg="rgba(20, 26, 36, 0.6)"
            backdropFilter="blur(4px)"
            onClick={onClose}
          />
          <Flex
            position="absolute"
            inset={0}
            align="center"
            justify="center"
            p={{ base: "14px", md: "48px" }}
            onClick={onClose}
          >
            <MotionBox
              // See upgrade-dialog.tsx for why `opacity` isn't animated on
              // this card: it would make the card's own solid background
              // translucent mid-transition, letting the blurred page show
              // through underneath it.
              initial={{ y: 20, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 10, scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(event) => event.stopPropagation()}
              w="100%"
              maxW="420px"
              bg="bg.surface"
              borderWidth="1px"
              borderColor="fg.default"
              borderRadius="16px"
              overflow="hidden"
              position="relative"
              isolation="isolate"
              boxShadow="0 40px 90px rgba(20, 26, 36, 0.35)"
            >
              <Box
                h="4px"
                bgGradient="to-r"
                gradientFrom="gt.300"
                gradientVia="gt.500"
                gradientTo="gt.700"
                backgroundSize="200% 100%"
                animation="shimmer 3s linear infinite"
              />

              <Box p={{ base: "24px", md: "28px" }}>
                <Flex justify="space-between" align="center">
                  <Flex align="center" gap="8px">
                    <Box w="8px" h="8px" borderRadius="full" bg="gt.500" />
                    <Text
                      fontFamily="mono"
                      fontSize="11px"
                      letterSpacing="0.14em"
                      textTransform="uppercase"
                      color="fg.muted"
                    >
                      {title}
                    </Text>
                  </Flex>
                  <ChakraButtonEl
                    type="button"
                    onClick={onClose}
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

                <Flex align="center" gap="8px" mt="18px">
                  <VeraMark size={18} spinning={false} />
                  <Text
                    fontFamily="mono"
                    fontSize="11px"
                    letterSpacing="0.1em"
                    textTransform="uppercase"
                    color="fg.subtle"
                  >
                    Grant Thornton
                  </Text>
                </Flex>

                <Flex
                  align="center"
                  justify="center"
                  w="56px"
                  h="56px"
                  borderRadius="full"
                  bg="gt.50"
                  color="gt.500"
                  mt="22px"
                >
                  <ChakraSvg viewBox="0 0 24 24" w="26px" h="26px" fill="none">
                    <path
                      d="M14 4h6v6M20 4L10 14M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </ChakraSvg>
                </Flex>

                <Heading
                  as="h2"
                  mt="18px"
                  fontSize="22px"
                  letterSpacing="-0.025em"
                  fontWeight="800"
                  color="fg.default"
                >
                  {title} launched
                </Heading>
                <Text mt="8px" fontSize="13.5px" color="fg.body" maxW="36ch">
                  Launched in a separate window so you can keep working here.
                  If it didn't open or you closed it, reopen it below.
                </Text>

                <Flex direction="column" gap="10px" mt="24px">
                  <ChakraButtonEl
                    type="button"
                    onClick={launch}
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
                    Reopen window
                  </ChakraButtonEl>
                  <ChakraButtonEl
                    type="button"
                    onClick={onClose}
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
                    Back to dashboard
                  </ChakraButtonEl>
                </Flex>
              </Box>
            </MotionBox>
          </Flex>
        </Box>
    </Portal>
  );
}
