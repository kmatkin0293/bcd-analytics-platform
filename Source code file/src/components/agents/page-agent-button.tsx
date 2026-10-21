"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { useState } from "react";

import { LockIcon, ZapIcon } from "@/components/agents/agent-icons";
import { AgentLaunchModal } from "@/components/agents/agent-launch-modal";
import { ChakraButtonEl } from "@/components/chakra-elements";
import { usePlanStore } from "@/stores/plan";

/**
 * Page-header "Go Agentic" button — Premium opens the page's Agentspot app
 * in the same popup-window + confirmation-card flow as the sidebar agents;
 * Basic shows it locked (lock badge + hover tooltip) and opens the Upgrade
 * dialog instead, matching the sidebar's locked-agent behavior exactly.
 */
export function PageAgentButton({ url, title }: { url: string; title: string }) {
  const plan = usePlanStore((state) => state.plan);
  const openUpgradeDialog = usePlanStore((state) => state.openUpgradeDialog);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isPremium = plan === "premium";

  return (
    <Box position="relative" flexShrink={0}>
      <ChakraButtonEl
        type="button"
        onClick={() => (isPremium ? setLaunchOpen(true) : openUpgradeDialog())}
        onMouseEnter={() => !isPremium && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        display="flex"
        alignItems="center"
        gap="9px"
        px="18px"
        py="12px"
        borderRadius="8px"
        borderWidth="1px"
        borderColor={isPremium ? "transparent" : "border.strong"}
        bg={isPremium ? "gt.500" : "bg.surface"}
        color={isPremium ? "white" : "fg.subtle"}
        fontFamily="mono"
        fontSize="12px"
        fontWeight="700"
        letterSpacing="0.06em"
        textTransform="uppercase"
        cursor="pointer"
        whiteSpace="nowrap"
        transition="background-color 0.2s, color 0.2s, border-color 0.2s, transform 0.15s, box-shadow 0.2s"
        _hover={
          isPremium
            ? { bg: "gt.600", boxShadow: "0 10px 28px -8px rgba(75,40,130,0.5)" }
            : { borderColor: "gt.400", color: "gt.600" }
        }
        _active={{ transform: "scale(0.97)" }}
      >
        <ZapIcon />
        + Go Agentic
        {!isPremium ? (
          <Flex
            align="center"
            justify="center"
            w="18px"
            h="18px"
            borderRadius="full"
            bg="bg.canvas"
            color="fg.subtle"
            flexShrink={0}
          >
            <LockIcon />
          </Flex>
        ) : null}
      </ChakraButtonEl>

      {hovered && !isPremium ? (
        <Box
          position="absolute"
          top="100%"
          right="0"
          mt="8px"
          px="10px"
          py="6px"
          borderRadius="6px"
          bg="sidebarSurface"
          borderWidth="1px"
          borderColor="sidebarBorder"
          whiteSpace="nowrap"
          fontFamily="mono"
          fontSize="10.5px"
          letterSpacing="0.04em"
          color="gt.300"
          zIndex={10}
          pointerEvents="none"
          boxShadow="0 8px 20px rgba(0,0,0,0.35)"
        >
          <Text as="span">Premium only — click to upgrade</Text>
        </Box>
      ) : null}

      {launchOpen ? (
        <AgentLaunchModal url={url} title={title} onClose={() => setLaunchOpen(false)} />
      ) : null}
    </Box>
  );
}
